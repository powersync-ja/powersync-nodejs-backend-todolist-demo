import express from 'express';
import * as mongo from 'mongodb';
import config from '../../config.js';

const client = new mongo.MongoClient(config.database.uri);
const db = client.db();
await client.connect();

const router = express.Router();

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
    await updateBatch([{ op: 'PUT', type: req.body.table, data: req.body.data }]);

    res.status(200).send({
      message: `PUT completed for ${req.body.table} ${req.body.data.id}`
    });
  } catch (e) {
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
    await updateBatch([{ op: 'PATCH', type: req.body.table, data: req.body.data }]);

    res.status(200).send({
      message: `PATCH completed for ${req.body.table}`
    });
  } catch (e) {
    res.status(400).send({
      message: `Request failed: ${e.message}`
    });
  }
});

/**
 * Handle all DELETE events sent to the server by the client PowerSunc application
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

  await updateBatch([{ op: 'DELETE', type: table, data: data }]);

  res.status(200).send({
    message: `DELETE completed for ${table} ${data.id}`
  });
});

/**
 * Apply a batch of PUT, PATCH and/or DELETE updates.
 *
 * This does not access checks - any table can be modified.
 *
 * @typedef {Object} DeleteOp
 * @prop {"DELETE"} op - op type
 * @prop {string} table - table name
 * @prop {string=} id - record id
 * @prop {Object=} data - record data, including id (alternative to direct id)
 *
 * @typedef {Object} PutOp
 * @prop {"PUT"} op - op type
 * @prop {string} table - table name
 * @prop {string=} id - record id
 * @prop {Object} data - record data
 *
 * @typedef {Object} PatchOp
 * @prop {"PATCH"} op - op type
 * @prop {string} table - table name
 * @prop {string=} id - record id
 * @prop {Object} data - record data
 *
 * @param {(DeleteOp | PutOp | PatchOp)[]} batch
 */
const updateBatch = async (batch) => {
  // TODO: Use batches & transactions.
  // TODO: Do type conversion. This currently persists data from the client as is,
  // only using strings or numbers for all data.
  for (let op of batch) {
    const collection = db.collection(op.table);
    if (op.op == 'PUT') {
      const data = op.data;
      const id = op.id ?? data.id;
      const doc = { _id: id, ...data };
      delete doc.id;

      await collection.insertOne(doc);
    } else if (op.op == 'PATCH') {
      const data = op.data;
      const id = op.id ?? data.id;
      const doc = { ...data };
      delete doc.id;

      await collection.updateOne({ _id: id }, { $set: doc });
    } else if (op.op == 'DELETE') {
      const id = op.id ?? op.data?.id;
      if (id != null) {
        await collection.deleteOne({ _id: id });
      }
    }
  }
};

export { router as dataRouter };
