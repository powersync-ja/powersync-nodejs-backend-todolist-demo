export const types = {
  date: (v) => new Date(v),
  boolean: (v) => !!v,
  string: (v) => String(v),
  number: (v) => Number(v)
};

export const schema = {
  counter: {
    _id: types.string,
    user_id: types.string,
    count: types.number,
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
