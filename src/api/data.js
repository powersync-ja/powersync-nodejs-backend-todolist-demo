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
 * Handle all PUT events sent to the server by the client PowerSunc application
 */
router.put('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  await upsert(req.body, res);
});

/**
 * Handle all PATCH events sent to the server by the client PowerSunc application
 */
router.patch('/', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  await upsert(req.body, res);
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

  let text = null;
  const values = [data.id];

  switch (table) {
    case 'lists':
      text = 'DELETE FROM lists WHERE id = $1';
      break;
    case 'todos':
      text = 'DELETE FROM todos WHERE id = $1';
      break;
    default:
      break;
  }

  const client = await pool.connect();
  await client.query(text, values);
  await client.release();
  res.status(200).send({
    message: `PUT completed for ${table} ${data.id}`
  });
});

const upsert = async (body, res) => {
  const table = body.table;
  const data = body.data;

  let text = null;
  let values = [];

  switch (table) {
    case 'lists':
      text =
        'INSERT INTO lists(id, created_at, name, owner_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, name = EXCLUDED.name, owner_id = EXCLUDED.owner_id';
      values = [data.id, data.created_at, data.name, data.owner_id];
      break;
    case 'todos':
      text =
        'INSERT INTO todos(id, created_at, completed_at, description, completed, created_by, completed_by, list_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, completed_at = EXCLUDED.completed_at, description = EXCLUDED.description, completed = EXCLUDED.completed, created_by = EXCLUDED.created_by, completed_by = EXCLUDED.completed_by, list_id = EXCLUDED.list_id';
      values = [
        data.id,
        data.created_at,
        data.completed_at,
        data.description,
        data.completed,
        data.created_by,
        data.completed_by,
        data.list_id
      ];
      break;
    default:
      break;
  }
  if (text && values.length > 0) {
    const client = await pool.connect();
    await client.query(text, values);
    await client.release();
    res.status(200).send({
      message: `PUT completed for ${table} ${data.id}`
    });
  } else {
    res.status(400).send({
      message: 'Invalid body provided, expected table and data'
    });
  }
};

export { router as dataRouter };
