import mysql from 'mysql2/promise';

function escapeIdentifier(identifier) {
  return `\`${identifier.replace(/`/g, '``').replace(/\./g, '`.`')}\``;
}

/**
 * Creates a MySQL batch persister. This is used by the
 * `data` API routes.
 * @param {string} uri MySQL connection URI
 */
export const createMySQLPersister = (uri) => {
  console.debug('Using MySQL Persister');

  const pool = mysql.createPool(uri);

  return {
    /**
     * @type {import('../persister-factories.js').BatchPersister}
     */
    updateBatch: async (batch) => {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        for (let op of batch) {
          const table = escapeIdentifier(op.table);
          if (op.op === 'PUT') {
            const data = op.data;
            const with_id = { ...data, id: op.id ?? op.data.id };

            const columnsEscaped = Object.keys(with_id).map(escapeIdentifier);
            const columnsJoined = columnsEscaped.join(', ');

            let updateClauses = [];

            for (let key of Object.keys(data)) {
              if (key === 'id') continue;
              updateClauses.push(`${escapeIdentifier(key)} = VALUES(${escapeIdentifier(key)})`);
            }

            const updateClause = updateClauses.length > 0 ? `ON DUPLICATE KEY UPDATE ${updateClauses.join(', ')}` : ``;

            const statement = `
              INSERT INTO ${table} (${columnsJoined})
              VALUES (${Object.keys(with_id)
                .map(() => '?')
                .join(', ')})
              ${updateClause}`;

            await connection.execute(statement, Object.values(with_id));
          } else if (op.op === 'PATCH') {
            const data = op.data;
            const with_id = { ...data, id: op.id ?? data.id };

            let updateClauses = [];

            for (let key of Object.keys(data)) {
              if (key === 'id') continue;
              updateClauses.push(`${escapeIdentifier(key)} = ?`);
            }

            const statement = `
              UPDATE ${table}
              SET ${updateClauses.join(', ')}
              WHERE id = ?`;

            const values = [...Object.values(data), with_id.id];
            await connection.execute(statement, values);
          } else if (op.op === 'DELETE') {
            const id = op.id ?? op.data?.id;
            const statement = `DELETE FROM ${table} WHERE id = ?`;
            await connection.execute(statement, [id]);
          }
        }
        await connection.commit();
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        connection.release();
      }
    }
  };
};
