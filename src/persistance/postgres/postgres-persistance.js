import { URL } from 'url';

import PG from 'pg';

const { Pool } = PG;

function escapeIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""').replace(/\./g, '"."')}"`;
}

/**
 * Creates a Postgres batch persister. This is used by the
 * `data` api routes.
 * @param {string} uri Postgres connection URI
 */
export const createPostgresPersister = (uri) => {
  console.debug('Using Postgres Persister');

  const url = new URL(uri);

  const pool = new Pool({
    host: url.hostname,
    database: url.pathname.split('/')[1],
    user: url.username,
    password: url.password,
    port: url.port
  });

  pool.on('error', (err, client) => {
    console.error('Pool connection failure to postgres:', err, client);
  });

  /**
   * @type {import('../persister-factories.js').Persister}
   */
  const persister = {
    updateBatch: async (batch) => {
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
    },
    async createCheckpoint(user_id, client_id) {
      const response = await pool.query(
        `
    INSERT INTO checkpoints(user_id, client_id, checkpoint)
    VALUES 
        ($1, $2, '1')
    ON 
        CONFLICT (user_id, client_id)
    DO 
        UPDATE SET checkpoint = checkpoints.checkpoint + 1
    RETURNING checkpoint;
    `,
        [user_id, client_id]
      );
      /**
       * @type {bigint}
       */
      const checkpoint = response.rows[0].checkpoint;
      return checkpoint;
    }
  };
  return persister;
};
