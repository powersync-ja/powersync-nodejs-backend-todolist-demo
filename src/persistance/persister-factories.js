import { createMongoPersister } from './mongo/mongo-persistance.js';
import { createPostgresPersister } from './postgres/postgres-persistance.js';

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
 * @typedef {Object} Persister
 * @prop {BatchPersister} updateBatch

 * @callback PersisterFactory
 * @param {string} URI -
 * @returns {Promise<Persister>}
 */

/**
 * @type {Record<string, PersisterFactory}
 */
export const factories = {
  mongo: createMongoPersister,
  postgres: createPostgresPersister
};
