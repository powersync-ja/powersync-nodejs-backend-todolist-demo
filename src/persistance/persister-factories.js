import { createMongoPersister } from './mongo/mongo-persistance.js';
import { createMySQLPersister } from './mysql/mysql-persistance.js';
import { createPostgresPersister } from './postgres/postgres-persistance.js';
import { createMSSQLPersister } from './mssql/mssql-persistance.js';

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
 * @callback BatchPersister
 * @param {(DeleteOp | PutOp | PatchOp)[]} batch
 * @returns {Promise<void>}
 * 
 * @callback CreateCheckpoint
 * @param {string} user_id
 * @param {string} client_id
 * @returns {Promise<bigint>} checkpoint
 *
 * @callback CreateCheckpointRequest
 * @param {string} user_id
 * @param {string} client_id
 * @param {bigint} checkpoint_request_id
 * @param {Date} checkpoint_requested_at
 * @returns {Promise<bigint|string|number>} checkpoint_request_id
 * 
 * @typedef {Object} Persister
 * @prop {BatchPersister} updateBatch
 * @prop {CreateCheckpoint} createCheckpoint
 * @prop {CreateCheckpointRequest} createCheckpointRequest

 * @callback PersisterFactory
 * @param {string} URI -
 * @returns {Promise<Persister> | Persister}
 */

/**
 * @type {Record<string, PersisterFactory>}
 */
export const factories = {
  mongodb: createMongoPersister,
  postgres: createPostgresPersister,
  mysql: createMySQLPersister,
  mssql: createMSSQLPersister
};
