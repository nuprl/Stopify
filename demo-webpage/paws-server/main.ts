import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as BuckleScript from '../compilers/bucklescript';
import * as Cljs from '../compilers/clojurescript';
import * as tmp from 'tmp';
import * as path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '../html')));

app.post('/compile/ocaml', bodyParser.text(), (req, res) => {
  BuckleScript.compile(req.body, jsCode => {
    res.send(jsCode);
  });
});

app.post('/compile/cljs', bodyParser.text(), (req, res) => {
  Cljs.compile(req.body, jsCode => {
    res.send(jsCode);
  });
});

console.log("Listening on port 8080");
app.listen(8080);
