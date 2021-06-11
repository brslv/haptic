const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function (knex) {
  return knex.schema
    .hasTable("poll_answers")
    .then(function (exists) {
      if (!exists) {
        return knex.schema.createTable("poll_answers", function (t) {
          t.increments("id").primary();
          t.integer("poll_option_id").unsigned().notNullable();
          t.foreign("poll_option_id")
            .references("id")
            .inTable("poll_options")
            .onDelete("CASCADE");
          t.integer("user_id").unsigned().notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");
          t.unique(["poll_option_id", "user_id"]);
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

exports.down = function (knex) {
  return knex.schema.dropTable("poll_answers");
};
