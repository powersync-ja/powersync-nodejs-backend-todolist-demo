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

const types = {
  date: (v) => new Date(v),
  boolean: (v) => !!v,
  string: (v) => String(v),
  number: (v) => number(v)
};

const schema = {
  lists: {
    _id: types.string,
    created_at: types.date,
    name: types.string,
    owner_id: types.string
  },
  todos: {
    _id: types.string,
    completed: types.boolean,
    created_at: types.date,
    created_by: types.string,
    description: types.string,
    list_id: types.string,
    completed_at: types.date,
    completed_by: types.string
  }
};

/**
 * A basic function to convert data according to a schema specified above.
 *
 * A production application should probably use a purpose-built library for this,
 * and use MongoDB Schema Validation to enforce the types in the database.
 */
function applySchema(tableSchema, data) {
  const converted = Object.entries(tableSchema)
    .map(([key, converter]) => {
      const rawValue = data[key];
      if (typeof rawValue == 'undefined') {
        return null;
      } else if (rawValue == null) {
        return [key, null];
      } else {
        return [key, converter(rawValue)];
      }
    })
    .filter((v) => v != null);
  return Object.fromEntries(converted);
}

/**
 * Apply a batch of PUT, PATCH and/or DELETE updates.
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
    const tableSchema = schema[op.table];
    if (tableSchema == null) {
      console.warn(`Ignoring update to unknown table ${op.table}`);
      continue;
    }
    const collection = db.collection(op.table);
    if (op.op == 'PUT') {
      const data = op.data;
      const id = op.id ?? data.id;
      const doc = { _id: id, ...data };
      delete doc.id;

      const converted = applySchema(tableSchema, doc);
      await collection.insertOne(converted);
    } else if (op.op == 'PATCH') {
      const data = op.data;
      const id = op.id ?? data.id;
      const doc = { ...data };
      delete doc.id;

      const converted = applySchema(tableSchema, doc);
      await collection.updateOne({ _id: id }, { $set: converted });
    } else if (op.op == 'DELETE') {
      const id = op.id ?? op.data?.id;
      if (id != null) {
        await collection.deleteOne({ _id: id });
      }
    }
  }
};

export { router as dataRouter };
