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
  return knex.schema.createTable('incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.uuid('session_id').notNullable().references('id').inTable('sos_sessions').onDelete('CASCADE')
    t.uuid('user_id').notNullable().references('id').inTable('users')
    t.jsonb('movement_path')               // batch-written GPS trail from Redis
    t.string('responder_hub')
    t.enum('outcome', ['rescued', 'false_alarm', 'unresolved']).nullable()
    t.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('incidents')
}
