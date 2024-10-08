export const types = {
  date: (v) => new Date(v),
  boolean: (v) => !!v,
  string: (v) => String(v),
  number: (v) => Number(v)
};

export const schema = {
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
export function applySchema(tableSchema, data) {
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
