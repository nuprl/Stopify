import * as express from 'express';
import * as morgan from 'morgan'; // logging. good name?
import * as fs from 'fs-extra';
import { BuckleScript } from '../compilers/bucklescript';
import { Emcc } from '../compilers/emscripten';
import { Cljs } from '../compilers/clojurescript';
import { ScalaJS } from '../compilers/scalajs';
import { JavaScript } from '../compilers/javascript'
import { CompilerSupport } from '../compilers/compiler';
import { runStopify, tmpDir } from '../compilers/utils';
import * as path from 'path';
import * as bodyParser from 'body-parser';
const app = express();

app.use(morgan('short'));
app.use(express.static(path.join(__dirname, '../../www')));
app.use(express.static(path.join(__dirname, '..')));
let nextId = 0;

const files  = new Map<string, { jsPath: string, tmpPath: string }>();

app.get('/compiled/:key', (req, res) => {
  const value = files.get(req.params.key);
  if (value) {
    res.sendFile(value.jsPath, (err: Error) => {
      if (err) {
        res.sendStatus(503);
      }
      fs.remove(value.tmpPath).catch(reason => {
        console.error(`Error removing ${value.tmpPath}: ${reason}`);
      });
    });
    files.delete(req.params.key);
  }
  else {
    res.sendStatus(404);
  }
});

function singleUseUrl(tmpPath: string, jsPath: string): string {
  const x = `${nextId++}.js`;
  const url = `/compiled/${x}`;
  files.set(x, { tmpPath, jsPath });
  return url;
}

function compileAndSend(compiler: CompilerSupport, url: string): void {
  app.post(url, bodyParser.json(), (req, res) => {
    const { code } = req.body;
    tmpDir()
      .then(tmpDir =>
        compiler.compile(tmpDir, code)
          .then(jsPath => runStopify(jsPath, req.body))
          .then(stopifiedJsPath => {
             res.send(singleUseUrl(tmpDir, stopifiedJsPath));
          })
        .catch(reason => {
          console.error(`In ${tmpDir}:\n${reason}`);
          res.statusCode = 503;
          res.send(reason.toString());
        }))
      .catch(reason => {
        res.statusCode = 503;
        res.send(reason.toString());
      })
  });
}

compileAndSend(BuckleScript, '/compile/ocaml')
compileAndSend(Emcc, '/compile/emcc')
compileAndSend(Cljs, '/compile/cljs')
compileAndSend(ScalaJS, '/compile/scala')
compileAndSend(JavaScript, '/compile/js')

const port = Number(process.argv[2]);
console.log(`Listening on port ${port}`);
app.listen(port);
