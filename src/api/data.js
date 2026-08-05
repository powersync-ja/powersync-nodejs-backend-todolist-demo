import express from 'express';
import config from '../../config.js';
import { factories } from '../persistance/persister-factories.js';

const router = express.Router();

const persistenceFactory = factories[config.database.type];

const { updateBatch, createCheckpoint, createCheckpointRequest } = await persistenceFactory(config.database.uri);

// Maximum signed 64-bit integer (2^63 - 1), matching database BIGINT columns.
const CHECKPOINT_REQUEST_ID_MAX = 9_223_372_036_854_775_807n;

function parseCheckpointRequestId(value) {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    throw new Error('checkpoint_request_id must be a base-10 integer string');
  }
  return BigInt(value);
}

function validateCheckpointRequestId(value) {
  const parsed = parseCheckpointRequestId(value);
  if (parsed <= 0n || parsed > CHECKPOINT_REQUEST_ID_MAX) {
    throw new Error(`checkpoint_request_id must be between 1 and ${CHECKPOINT_REQUEST_ID_MAX}`);
  }
  return parsed;
}

function validateString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

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
 * Handle custom write checkpoint requests created by newer SDKs.
 */
router.post('/checkpoint-request', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  let user_id;
  let client_id;
  let checkpoint_request_id;

  try {
    user_id = validateString(req.body.user_id, 'user_id');
    client_id = validateString(req.body.client_id, 'client_id');
    checkpoint_request_id = validateCheckpointRequestId(req.body.checkpoint_request_id);
  } catch (e) {
    res.status(400).send({
      message: e.message
    });
    return;
  }

  try {
    const acceptedCheckpointRequestId = await createCheckpointRequest(
      user_id,
      client_id,
      checkpoint_request_id,
      new Date()
    );

    res.status(200).send({
      checkpoint_request_id: String(acceptedCheckpointRequestId)
    });
  } catch (e) {
    console.error(e.stack ?? e.message);
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  }
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
