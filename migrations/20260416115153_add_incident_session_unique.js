/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};

exports.up = function(knex) {
  return knex.schema.alterTable('incidents', (t) => {
    t.unique('session_id')
  })
}

exports.down = function(knex) {
  return knex.schema.alterTable('incidents', (t) => {
    t.dropUnique('session_id')
  })
}