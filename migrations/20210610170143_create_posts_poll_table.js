const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function (knex) {
  return knex.schema
    .hasTable("posts_poll")
    .then(function (exists) {
      if (!exists) {
        return knex.schema.createTable("posts_poll", function (t) {
          t.increments("id").primary();
          t.integer("post_id").unsigned().notNullable();
          t.foreign("post_id")
            .references("id")
            .inTable("posts")
            .onDelete("CASCADE");
          t.text("question").notNullable();
          t.text("details").nullable();
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
  return knex.schema.dropTable("posts_poll");
};
