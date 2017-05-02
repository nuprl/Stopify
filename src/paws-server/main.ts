import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as BuckleScript from '../compilers/bucklescript';
import { spawn } from 'child_process';
import * as tmp from 'tmp';

const app = express();

console.log(__dirname);
app.use(express.static(__dirname + '/../../../html'));
app.post('/compile/ocaml', bodyParser.text(), (req, res) => {
  BuckleScript.compile(req.body, jsCode => {
    res.send(jsCode);
  });
});

console.log("Listening");
app.listen(8080);


