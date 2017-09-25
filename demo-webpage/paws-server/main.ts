const express = require('express');
const bodyParser = require('body-parser');
const tmp = require('tmp');

import { BuckleScript } from '../compilers/bucklescript';
import { Cljs } from '../compilers/clojurescript';
import { ScalaJS } from '../compilers/scalajs';
import { JavaScript } from '../compilers/javascript'
import { CompilerSupport } from '../compilers/compiler';
import * as path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '../../../dist')));

function compileAndSend(compiler: CompilerSupport, url: string): void {
  tmp.dir((_: any, tmpDir: string) => {
    app.post(url, bodyParser.text(), (req: any, res: any) => {
      compiler.compile(tmpDir, req.body, js => {
        app.use(express.static(js));
        res.send(js);
      });
    });
  });
}

compileAndSend(BuckleScript, '/compile/ocaml')
compileAndSend(Cljs, '/compile/cljs')
compileAndSend(ScalaJS, '/compile/scala')
compileAndSend(JavaScript, '/compile/js')

console.log("Listening on port 8080");
app.listen(8080);
