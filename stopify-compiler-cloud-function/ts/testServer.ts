import * as express from 'express';
import * as index from './index';

const app = express();
app.use(index.stopifyTesting);
app.listen(8080, '0.0.0.0');

