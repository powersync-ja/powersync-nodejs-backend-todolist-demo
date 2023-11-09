import express from "express";
import {authRouter} from "./auth.js";
import {uploadDataRouter} from "./uploadData.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/upload_data", uploadDataRouter);

export { router as apiRouter }


