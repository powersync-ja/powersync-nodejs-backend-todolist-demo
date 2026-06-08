import express from 'express';
import { authRouter } from './auth.js';
import { dataRouter } from './data.js';
import { attachmentsRouter } from './attachments.js';

const router = express.Router();

router.use('/auth', express.json(), authRouter);
router.use('/data', express.json(), dataRouter);
router.use('/attachments', attachmentsRouter);

export { router as apiRouter };
