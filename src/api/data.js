import express from "express";
import {Client} from "pg";
import config from "../../config.js";

const router = express.Router();

const client = new Client({
    host: config.database.host,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    port: config.database.port,
});

/**
 * Handle all PUT events sent to the server by the client PowerSunc application
 */
router.put("/", async (req, res) => {
    await client.connect();

    await client.end();
});

/**
 * Handle all PATCH events sent to the server by the client PowerSunc application
 */
router.patch("/", async (req, res) => {
    await client.connect();

    await client.end();
});

/**
 * Handle all DELETE events sent to the server by the client PowerSunc application
 */
router.delete("/", async (req, res) => {
    await client.connect();

    await client.end();
});

export { router as dataRouter };
