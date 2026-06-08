import express from 'express';
import { authRouter } from './auth.js';
import { dataRouter } from './data.js';
import { attachmentsRouter } from './attachments.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/data', dataRouter);
router.use('/attachments', attachmentsRouter);

export { router as apiRouter };
