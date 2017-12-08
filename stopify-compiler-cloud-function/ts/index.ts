import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as request from 'request-promise-native';
import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpDir, exec } from './misc';
import * as storage from '@google-cloud/storage';
import { resolve } from 'path';
import * as crypto from 'crypto';

const sto = storage();

const bucket = sto.bucket('stopify-compiler-output');

export const stopify = express();

stopify.use(cors());

const stopifyCompiler = '/nodejs/bin/node ./node_modules/stopify/built/src/compile.js';

const headers = { 'Content-Type': 'text/plain' };

type CacheResult = { filename: string, exists: boolean };

/**
 * Check if a compiled object is already in the cache
 * @param lang the source language
 * @param input the source program
 */
function checkCache(lang: string, input: string): Promise<CacheResult> {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  const filename = `${lang}-${hash}.js`;
  return bucket.file(filename).exists()
    .then(exists => ({ filename, exists: exists[0] }));
}

function runStopify(response: express.Response, jsCode: string, filename: string, flags: string[]) {
  return tmpDir().then(dir => {
    const jsPath = `${dir}/original.js`;
    const stopifiedJsPath = `${dir}/output.js`
    return fs.writeFile(jsPath, jsCode)
      .then(_ => exec(`${stopifyCompiler} ${flags.join(" ")} --debug -t lazy ${jsPath} ${stopifiedJsPath}`))
      .then(_ => fs.readFile(stopifiedJsPath))
  })
  .then(stopifiedJsCode => bucket.file(filename).save(stopifiedJsCode))
  .then(_ => response.send(filename));
};

function reject(response: express.Response) {
  return (reason: string) => {
    response.statusCode = 503;
    console.error(`Error: ${reason}`);
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST');
    response.send(reason.toString());
  };
}

stopify.post('/js', bodyParser.text({ type: '*/*' }), (req, resp) =>
  checkCache('js', req.body)
  .then(({ filename,  exists }) => {
    if (exists) {
      resp.set('Access-Control-Allow-Origin', '*');
      resp.set('Access-Control-Allow-Methods', 'POST');
      return resp.send(filename);
    }
    else {
      console.info(`Compiling js program (${req.body.length} bytes)`);
      return runStopify(resp, req.body, filename, ['--js-args=faithful', '--es=es5']);
    }
  })
  .catch(reject(resp)));

function genericCompiler(lang: string, url: string, flags: string[]) {
  stopify.post(`/${lang}`, bodyParser.text({ type: '*/*' }), (req, resp) =>
    checkCache(lang, req.body)
    .then(({ filename,  exists }) => {
      if (exists) {
        resp.set('Access-Control-Allow-Origin', '*');
        resp.set('Access-Control-Allow-Methods', 'POST');
        return resp.send(filename);
      }
      else {
        console.info(`Compiling ${lang} program (${req.body.length} bytes)`);
        return request.post(url,
                            { headers, body: req.body })
          .then(stopifiedJsCode => runStopify(resp, stopifiedJsCode, filename, flags));
      }
    })
    .catch(reject(resp)));
}

genericCompiler('pyjs', 'http://35.184.26.215:8080/pyjs', ['--js-args=faithful']);
genericCompiler('emscripten',  'http://35.184.26.215:8080/emscripten', []);
genericCompiler('bucklescript',  'http://35.184.26.215:8080/bucklescript', []);
genericCompiler('scalajs', 'https://us-central1-arjun-umass.cloudfunctions.net/stopifyCompileScalaJS', []);
genericCompiler('clojurescript',  'http://35.184.26.215:8080/clojurescript',[]);
