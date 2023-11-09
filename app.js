import express from "express";
import bodyParser from "body-parser";
import {apiRouter} from "./src/api/index.js";

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    );

    // Request headers you wish to allow
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With,content-type'
    );

    // Pass to next layer of middleware
    next();
});

app.use('/api', apiRouter);

export default app;
