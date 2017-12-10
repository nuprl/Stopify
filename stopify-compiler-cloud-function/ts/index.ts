import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as request from 'request-promise-native';
import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpDir } from './misc';
import * as storage from '@google-cloud/storage';
import { resolve } from 'path';
import * as crypto from 'crypto';
import * as stopifyCompiler from 'stopify';

const sto = storage();
const bucket = sto.bucket('stopify-compiler-output');

export const stopify = express();
export const stopifyTesting = stopify;

stopify.use(cors());

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

function runStopify(response: express.Response, jsCode: string, filename: string, opts: stopifyCompiler.CompilerOpts) {
  return tmpDir().then(dir => {
    const jsPath = `${dir}/original.js`;
    return fs.writeFile(jsPath, jsCode)
      .then(_ => stopifyCompiler.stopify(jsPath, opts))
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

// stopify.post('/js', bodyParser.text({ type: '*/*' }), (req, resp) =>
//   checkCache('js', req.body)
//   .then(({ filename,  exists }) => {
//     if (exists) {
//       resp.set('Access-Control-Allow-Origin', '*');
//       resp.set('Access-Control-Allow-Methods', 'POST');
//       return resp.send(filename);
//     }
//     else {
//       console.info(`Compiling js program (${req.body.length} bytes)`);
//       return runStopify(resp, req.body, filename, ['--debug', '--js-args=faithful', '--es=es5']);
//     }
//   })
//   .catch(reject(resp)));

function genericCompiler(lang: string, url: string, opts: stopifyCompiler.CompilerOpts) {
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
          .then(stopifiedJsCode => runStopify(resp, stopifiedJsCode, filename, opts))
          .catch(err => {
            if (err.name === 'StatusCodeError') {
              throw err.response.body;
            }
            else {
              throw err;
            }
          });
      }
    })
    .catch(reject(resp)));
}

genericCompiler('pyjs', 'http://35.184.26.215:8080/pyjs', { jsArgs: 'faithful' });
genericCompiler('emscripten',  'http://35.184.26.215:8080/emscripten', { debug: true });
genericCompiler('bucklescript',  'http://35.184.26.215:8080/bucklescript', {});
genericCompiler('scalajs', 'https://us-central1-arjun-umass.cloudfunctions.net/stopifyCompileScalaJS', { debug: true });
genericCompiler('clojurescript',  'http://35.184.26.215:8080/clojurescript', { debug: true });
genericCompiler('dart2js', 'https://us-central1-arjun-umass.cloudfunctions.net/stopifyCompileDart2JS', { debug: true });
