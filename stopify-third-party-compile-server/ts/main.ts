import * as pyjs from './pyjs';
import { app } from './server';

const port = Number(process.argv[2]);
console.log(`Listening on port ${port}`);

pyjs.init()
  .then(() => app.listen(port))
  .catch(reason => console.error(reason));