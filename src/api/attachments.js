import express from 'express';
import { mkdirSync, createReadStream } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import config from '../../config.js';

const router = express.Router();

/**
 * Directory where uploaded attachments are stored, from config.attachments.dir
 * (ATTACHMENTS_DIR env var, defaulting to ./attachments).
 */
const ATTACHMENTS_DIR = path.resolve(config.attachments.dir);

/**
 * Create the attachments directory if it doesn't exist. Call this from
 * application startup; throws (failing startup) if the directory can't be created.
 */
export function ensureAttachmentsDir() {
  mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

/**
 * Resolve the on-disk path for an attachment id.
 * path.basename strips any directory components ("../", leading slashes), so a
 * fixed directory + basename keeps every read/write contained to ATTACHMENTS_DIR.
 */
const filePathFor = (id) => path.join(ATTACHMENTS_DIR, path.basename(id));

/**
 * Upload an attachment. The raw request body is written to disk as-is.
 * The client's remoteStorage adapter sends the file bytes in the body.
 */
router.put('/:id', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  if (!req.body || req.body.length === 0) {
    res.status(400).send({
      message: 'Invalid body provided, expected file contents'
    });
    return;
  }

  try {
    await writeFile(filePathFor(req.params.id), req.body);

    res.status(201).send({
      message: `Upload completed for ${req.params.id}`
    });
  } catch (e) {
    console.error(e.stack ?? e.message);
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  }
});

/**
 * Download an attachment.
 */
router.get('/:id', (req, res) => {
  const stream = createReadStream(filePathFor(req.params.id));

  stream.on('open', () => {
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  });

  stream.on('error', (e) => {
    if (e.code === 'ENOENT') {
      res.status(404).send({
        message: `Attachment not found: ${req.params.id}`
      });
      return;
    }
    console.error(e.stack ?? e.message);
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  });
});

/**
 * Delete an attachment. Deleting a nonexistant file is treated as success.
 */
router.delete('/:id', async (req, res) => {
  try {
    await unlink(filePathFor(req.params.id));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error(e.stack ?? e.message);
      res.status(400).send({
        message: `Request failed: ${e.message}`
      });
      return;
    }
  }

  res.status(200).send({
    message: `Delete completed for ${req.params.id}`
  });
});

export { router as attachmentsRouter };
