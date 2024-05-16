import express from 'express';
import bodyParser from 'body-parser';
import { apiRouter } from './src/api/index.js';
import logRequest from './src/middleware/logger.js';
import config from './config.js';

const app = express();

app.use(bodyParser.json());
app.use(logRequest);

app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Pass to next layer of middleware
  next();
});
try {
  app.get('/', (req, res) => {
    res.status(200).send({
      message: 'powersync-nodejs-backend-todolist-demo'
    });
  });
  app.use('/api', apiRouter);
} catch (err) {
  console.log('Unexpected error', err);
}

export default app;
