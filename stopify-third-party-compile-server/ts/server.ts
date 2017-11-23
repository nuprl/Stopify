import * as express from 'express';
import * as morgan from 'morgan'; // Necessary to produce logs for Express.
import * as bodyParser from 'body-parser';
import * as pyjs from './pyjs';
import * as emscripten from './emscripten';
import * as bucklescript from './bucklescript';
import * as scalajs from './scalajs';

export const app = express();
app.use(morgan('short'));

function rejection(response: express.Response) {
  return (reason: string) => {
    response.statusCode = 503;
    response.send(reason.toString());
  }
}

function compiler(url: string, compile: (src: string) => Promise<string>) {
  app.post(url, bodyParser.text({ type: '*/*' }), (req, res) =>
    compile(req.body)
    .then(jsCode => res.send(jsCode))
    .catch(rejection(res)));
}

compiler('/pyjs', pyjs.compile);
compiler('/emscripten', emscripten.compile);
compiler('/bucklescript', bucklescript.compile);
compiler('/scalajs', scalajs.compile);
