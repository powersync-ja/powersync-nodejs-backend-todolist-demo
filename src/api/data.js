import express from 'express';
import pg from 'pg';
import config from '../../config.js';

const { Pool } = pg;

const router = express.Router();

const pool = new Pool({
  host: config.database.host,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  port: config.database.port
});

pool.on('error', (err, client) => {
  console.error('Pool connection failure to postgres:', err, client);
});

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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let op of batch) {
      const table = escapeIdentifier(op.table);
      if (op.op == 'PUT') {
        const data = op.data;
        const with_id = { ...data, id: op.id ?? op.data.id };

        const columnsEscaped = Object.keys(with_id).map(escapeIdentifier);
        const columnsJoined = columnsEscaped.join(', ');

        let updateClauses = [];

        for (let key of Object.keys(data)) {
          if (key == 'id') {
            continue;
          }
          updateClauses.push(`${escapeIdentifier(key)} = EXCLUDED.${escapeIdentifier(key)}`);
        }

        const updateClause = updateClauses.length > 0 ? `DO UPDATE SET ${updateClauses.join(', ')}` : `DO NOTHING`;

        const statement = `
      WITH data_row AS (
          SELECT (json_populate_record(null::${table}, $1::json)).*
      )
      INSERT INTO ${table} (${columnsJoined})
      SELECT ${columnsJoined} FROM data_row
      ON CONFLICT(id) ${updateClause}`;

        await client.query(statement, [JSON.stringify(with_id)]);
      } else if (op.op == 'PATCH') {
        const data = op.data;
        const with_id = { ...data, id: op.id ?? data.id };

        let updateClauses = [];

        for (let key of Object.keys(data)) {
          if (key == 'id') {
            continue;
          }
          updateClauses.push(`${escapeIdentifier(key)} = data_row.${escapeIdentifier(key)}`);
        }

        const statement = `
      WITH data_row AS (
          SELECT (json_populate_record(null::${table}, $1::json)).*
      )
      UPDATE ${table}
      SET ${updateClauses.join(', ')}
      FROM data_row
      WHERE ${table}.id = data_row.id`;
        await client.query(statement, [JSON.stringify(with_id)]);
      } else if (op.op == 'DELETE') {
        const id = op.id ?? op.data?.id;
        const statement = `
      WITH data_row AS (
        SELECT (json_populate_record(null::${table}, $1::json)).*
      )
      DELETE FROM ${table}
      USING data_row
      WHERE ${table}.id = data_row.id`;
        await client.query(statement, [JSON.stringify({ id: id })]);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

function escapeIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""').replace(/\./g, '"."')}"`;
}

export { router as dataRouter };
