import * as mongo from 'mongodb';
import { applySchema, schema } from './mongo-schema.js';

/**
 * Creates a MongoDB batch persister. This is used by the
 * `data` api routes.
 * @param {string} uri MongoDB connection URI
 */
export const createMongoPersister = async (uri) => {
  console.debug('Using MongoDB Persister');

  const client = new mongo.MongoClient(uri);
  const db = client.db();
  await client.connect();

  /**
   * @type {import('../persister-factories.js').Persister}
   */
  const persister = {
    createCheckpoint: async (user_id, client_id) => {
      const doc = await db.collection('checkpoints').findOneAndUpdate(
        {
          user_id,
          client_id
        },
        {
          $inc: {
            checkpoint: 1n
          },
          $unset: {
            checkpoint_requested_at: ''
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
      return doc.checkpoint;
    },
    createCheckpointRequest: async (user_id, client_id, checkpoint_request_id, checkpoint_requested_at) => {
      const doc = await db.collection('checkpoints').findOneAndUpdate(
        {
          user_id,
          client_id
        },
        [
          {
            $set: {
              checkpoint: {
                $cond: [
                  { $gt: [checkpoint_request_id, { $ifNull: ['$checkpoint', 0n] }] },
                  checkpoint_request_id,
                  '$checkpoint'
                ]
              },
              checkpoint_requested_at: {
                $cond: [
                  { $gte: [checkpoint_request_id, { $ifNull: ['$checkpoint', 0n] }] },
                  checkpoint_requested_at,
                  '$checkpoint_requested_at'
                ]
              },
              user_id,
              client_id
            }
          }
        ],
        {
          upsert: true,
          returnDocument: 'after'
        }
      );
      return BigInt(doc.checkpoint.toString());
    },
    updateBatch: async (batch) => {
      // TODO: Use batches & transactions.
      // TODO: Do type conversion. This currently persists data from the client as is,
      // only using strings or numbers for all data.
      for (const op of batch) {
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
    }
  };

  return persister;
};
