import express from "express";
import {authRouter} from "./auth.js";
import {dataRouter} from "./data.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/data", dataRouter);

export { router as apiRouter };


