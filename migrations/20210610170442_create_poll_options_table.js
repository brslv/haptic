const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function (knex) {
  return knex.schema
    .hasTable("poll_options")
    .then(function (exists) {
      if (!exists) {
        return knex.schema.createTable("poll_options", function (t) {
          t.increments("id").primary();
          t.integer("post_id").unsigned().notNullable();
          t.foreign("post_id")
            .references("id")
            .inTable("posts")
            .onDelete("CASCADE");
          t.text("text").notNullable();
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
  return knex.schema.dropTable("poll_options");
};
