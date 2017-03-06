import express from 'express';
import bodyParser from 'body-parser';
import * as BuckleScript from './bucklescript.js';
import { spawn } from 'child_process';
import * as tmp from 'tmp';

const app = express();

function viaFission(jsCode, callback) {
  const dir = tmp.dirSync().name;  
  const appJs = dir + '/app.js';
  const clientJs = dir + '/app-client.js';
  fs.writeFileSync(appJs, jsCode);
  spawn('npm', ['link', 'fission'], { cwd: dir }).on('exit', runFission);

  function runFission() {
    console.log("Runnign Fission");
    console.log(dir);
    spawn('fission', ['app.js'], { cwd: dir }).on('exit', readStoppableJs);
  }

  function readStoppableJs() {
    callback(fs.readFileSync(__dirname + '/stop_event_receiver.js', 'utf8') + "\n" +
             fs.readFileSync(clientJs, 'utf8'));
  }
}

app.use(express.static(__dirname + '/..'));
app.post('/compile/ocaml', bodyParser.text(), (req, res) => {
  BuckleScript.compile(req.body, jsCode => {
    viaFission(jsCode, stoppableJsCode => {
      console.log("Sending ...");
      res.send(stoppableJsCode);
    });
  });
});

export function main() {
  app.listen(8080);  
}
