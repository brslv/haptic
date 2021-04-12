const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("feedback")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("feedback", function(t) {
          t.increments("id").primary();

          t.integer("user_id")
            .unsigned()
            .notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

          t.string("type");
          t.string("email", 200).nullable();
          t.text("text").notNullable();

          t.timestamp("created_at")
            .notNullable()
            .defaultTo(knex.fn.now());
        });
      }
    })
    .then(() => {
      return deferFks(knex);
    })
    .catch((err) => {
      throw err;
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable("feedback");
};
