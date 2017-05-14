const express = require('express');
const bodyParser = require('body-parser');
import * as BuckleScript from '../compilers/bucklescript';
import * as Cljs from '../compilers/clojurescript';
const tmp = require('tmp');
import * as path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '../html')));

tmp.dir((_: any, ocamlTmp: string) => {
  app.post('/compile/ocaml', bodyParser.text(), (req: any, res: any) => {
    BuckleScript.compile(ocamlTmp, req.body, jsCode => {
      res.send(jsCode);
    });
  });
});

tmp.dir((_: any, cljsTmp: string) => {
  app.post('/compile/cljs', bodyParser.text(), (req: any, res: any) => {
    Cljs.compile(cljsTmp, req.body, jsCode => {
      res.send(jsCode);
    });
  });
});

console.log("Listening on port 8080");
app.listen(8080);
