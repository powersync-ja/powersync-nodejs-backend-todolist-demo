import * as z from 'zod';

/**
 * SQLite represents booleans as integers.
 * The parser converts these to booleans with default values.
 */
const sqliteBoolean = z
  .int()
  .nullish()
  .transform((value) => value == 1);

/**
 * Our demo client uses a SQL date string, which can be parsed to a JS Date.
 */
const sqliteDate = z.string().transform((value) => new Date(value));

/**
 * Defaults to NOW if no value is provided.
 */
const sqliteDateDefaultNow = sqliteDate.nullish().transform((value) => value ?? new Date());

export const List = z.object({
  _id: z.string(), // This is a UUID string
  archived: sqliteBoolean,
  name: z.string(),
  created_at: sqliteDateDefaultNow,
  owner_id: z.string()
});

export const Todo = z.object({
  _id: z.string(), // This is a UUID string
  archived: sqliteBoolean,
  list_id: z.string(),
  created_at: sqliteDateDefaultNow,
  description: z.string(),
  created_by: z.string(),
  completed: sqliteBoolean,
  completed_by: z.string().nullish(),
  completed_at: sqliteDate.nullish()
});

/**
 * @type {Record<string, import('zod').ZodObject>}
 */
export const schema = {
  lists: List,
  todos: Todo
};
