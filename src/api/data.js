import express from 'express';
import config from '../../config.js';
import { factories } from '../persistance/persister-factories.js';

const router = express.Router();

const persistenceFactory = factories[config.database.type];

const { updateBatch, createCheckpoint } = await persistenceFactory(config.database.uri);

/**
 * Handle a batch of events.
 */
router.post('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  try {
    await updateBatch(req.body.batch);

    res.status(200).send({
      message: `Batch completed`
    });
  } catch (e) {
    console.error('Request failed', e.stack);
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  }
});

/**
 * Handle all PUT events sent to the server by the client PowerSync application
 */
router.put('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  try {
    await updateBatch([{ op: 'PUT', table: req.body.table, data: req.body.data }]);

    res.status(200).send({
      message: `PUT completed for ${req.body.table} ${req.body.data.id}`
    });
  } catch (e) {
    console.error(e.stack ?? e.message);
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  }
});

router.put('/checkpoint', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }
  const { user_id = 'UserID', client_id = '1' } = req.body;

  const checkpoint = await createCheckpoint(user_id, client_id);

  res.status(200).send({
    checkpoint
  });
});

/**
 * Handle all PATCH events sent to the server by the client PowerSync application
 */
router.patch('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  try {
    await updateBatch([{ op: 'PATCH', table: req.body.table, data: req.body.data }]);

    res.status(200).send({
      message: `PATCH completed for ${req.body.table}`
    });
  } catch (e) {
    console.error(e.stack ?? e.message);
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  }
});

/**
 * Handle all DELETE events sent to the server by the client PowerSync application
 */
router.delete('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  const table = req.body.table;
  const data = req.body.data;

  if (!table || !data?.id) {
    res.status(400).send({
      message: 'Invalid body provided, expected table and data'
    });
    return;
  }

  await updateBatch([{ op: 'DELETE', table: table, data: data }]);

  res.status(200).send({
    message: `DELETE completed for ${table} ${data.id}`
  });
});

export { router as dataRouter };
