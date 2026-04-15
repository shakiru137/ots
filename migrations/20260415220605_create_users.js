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
  return knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('full_name').notNullable()
    t.string('phone').notNullable().unique()
    t.string('email').unique()
    t.string('password_hash').notNullable()
    t.string('verification_id')           // from Smile ID
    t.string('nin_hash')                  // hashed NIN, never raw
    t.boolean('is_verified').defaultTo(false)
    t.enum('role', ['user', 'responder', 'admin']).defaultTo('user')
    t.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('users')
}
