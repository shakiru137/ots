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
  return knex.schema.createTable('family_contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    t.string('name').notNullable()
    t.string('phone').notNullable()
    t.string('relationship')
    t.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('family_contacts')
}
