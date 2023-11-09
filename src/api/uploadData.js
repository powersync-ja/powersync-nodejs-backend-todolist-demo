import express from "express";

const router = express.Router();

/**
 * Handle all PUT events sent to the server by PowerSync
 */
router.put("/", (req, res) => {

});

/**
 * Handle all PATCH events sent to the server by PowerSync
 */
router.patch("/", (req, res) => {

});

/**
 * Handle all DELETE events sent to the server by PowerSync
 */
router.delete("/", (req, res) => {

});

export { router as uploadDataRouter }
