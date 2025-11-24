import { URL } from 'url';
import sql from 'mssql';


function escapeIdentifier(identifier) {
  return `[${identifier}]`;
}

/**
 * Creates a MSSQL batch persister. This is used by the
 * `data` api routes.
 * @param {string} uri MSSQL connection URI
 */
export const createMSSQLPersister = async (uri) => {
  console.debug('Using MSSQL Persister');

  const url = new URL(uri);

  const pool = new sql.ConnectionPool({
    user: url.username,
    password: url.password,
    server: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.split('/')[1],
  });

  pool.on('error', (err) => {
    console.error('MSSQL pool connection failure', err);
  });

  await pool.connect();

  /**
   * @type {import('../persister-factories.js').Persister}
   */
  const persister = {
    updateBatch: async (batch) => {
      const transaction = await pool.transaction();
      try {

        await transaction.begin();

        for (let op of batch) {
          const table = escapeIdentifier(op.table);
          if (op.op == 'PUT') {
            const data = op.data;
            const with_id = { ...data, id: op.id ?? op.data.id };

            // [id], [col1], [col3]
            const columnsEscaped = Object.keys(with_id).map(escapeIdentifier);
            const columns = columnsEscaped.join(', ');
            const columnParamaters = columnsEscaped.map((c) => `@${c}`).join(', ');
            const sourceColumns = columnsEscaped.map(column => `source.${column}`).join(', ');

            let updateClauses = [];
            // [[col1] = source.col1, [col3] = source.col3]
            for (const key of Object.keys(data)) {
              if (key == 'id') {
                continue;
              }
              updateClauses.push(`${escapeIdentifier(key)} = source.${escapeIdentifier(key)}`);
            }

            const updateClause = updateClauses.length > 0 ? `WHEN MATCHED THEN UPDATE SET ${updateClauses.join(', ')}` : `DO NOTHING`;
            const insertClause = `WHEN NOT MATCHED THEN INSERT (${columns}) VALUES (${sourceColumns})`;

            const statement = `
            MERGE INTO ${table} AS t
            USING (SELECT ${columnParamaters}) AS source (${columns})
              ON t.id = source.id
            ${updateClause}
            ${insertClause}
            `;

            const request = transaction.request();
            for (const column of columnsEscaped) {
              request.input(column, with_id[column]);
            }
            const result = await request.query(statement);
            console.log(result);
          } else if (op.op == 'PATCH') {
            const data = op.data;
            const with_id = { ...data, id: op.id ?? data.id };

            let updateClauses = [];

            for (const key of Object.keys(data)) {
              if (key == 'id') {
                continue;
              }
              updateClauses.push(`${escapeIdentifier(key)} = @${key}`);
            }

            const statement = `
              UPDATE ${table}
              SET ${updateClauses.join(', ')}
              WHERE id = @id`;
            
            const request = transaction.request();
            for (const column of Object.keys(with_id)) {
              request.input(column, with_id[column]);
            }

            const result = await request.query(statement);
            console.log(result);
          } else if (op.op == 'DELETE') {
            const id = op.id ?? op.data?.id;
            const statement = `DELETE FROM ${table} WHERE id = @id`;
            const request = transaction.request();
            request.input('id', id);
            const result = await request.query(statement);
            console.log(result);
          }
        }
        await transaction.commit();
      } catch (e) {
        await transaction.rollback();
        throw e;
      }
    },
    async createCheckpoint(user_id, client_id) {
      const transaction = await pool.transaction();
      try {
      await transaction.begin();

      const statement = `
        MERGE INTO checkpoints AS t
        USING (SELECT @user_id, @client_id, @checkpoint) AS source (user_id, client_id, checkpoint)
          ON t.user_id = source.user_id AND t.client_id = source.client_id
        WHEN MATCHED THEN 
          UPDATE SET t.checkpoint = t.checkpoint + 1
        WHEN NOT MATCHED THEN 
          INSERT (user_id, client_id, checkpoint)
          VALUES (source.user_id, source.client_id, source.checkpoint)
        OUTPUT INSERTED.checkpoint;
      `;
      const request = transaction.request();
      request.input('user_id', user_id);
      request.input('client_id', client_id);
      request.input('checkpoint', 1);
      const response = await request.query(statement);

      await transaction.commit();
      return response.recordset[0].checkpoint;
      } catch (e) {
        await transaction.rollback();
        throw e;
      }
  
    }
  };
  return persister;
};
