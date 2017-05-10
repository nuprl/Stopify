import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as BuckleScript from '../compilers/bucklescript';
import * as Cljs from '../compilers/clojurescript';
import * as tmp from 'tmp';
import * as path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '../html')));

tmp.dir((_, ocamlTmp) => {
  app.post('/compile/ocaml', bodyParser.text(), (req, res) => {
    BuckleScript.compile(ocamlTmp, req.body, jsCode => {
      res.send(jsCode);
    });
  });
});

tmp.dir((_, cljsTmp) => {
  app.post('/compile/cljs', bodyParser.text(), (req, res) => {
    Cljs.compile(cljsTmp, req.body, jsCode => {
      res.send(jsCode);
    });
  });
});

console.log("Listening on port 8080");
app.listen(8080);
