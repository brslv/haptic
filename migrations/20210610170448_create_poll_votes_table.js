const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function (knex) {
  return knex.schema
    .hasTable("poll_votes")
    .then(function (exists) {
      if (!exists) {
        return knex.schema.createTable("poll_votes", function (t) {
          t.increments("id").primary();

          t.integer("post_id").unsigned().notNullable();
          t.foreign("post_id")
            .references("id")
            .inTable("posts")
            .onDelete("CASCADE");

          t.integer("poll_option_id").unsigned().notNullable();
          t.foreign("poll_option_id")
            .references("id")
            .inTable("poll_options")
            .onDelete("CASCADE");

          t.integer("user_id").unsigned().notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("SET NULL");

          t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

          t.unique(["post_id", "user_id"]);
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
  return knex.schema.dropTable("poll_votes");
};
