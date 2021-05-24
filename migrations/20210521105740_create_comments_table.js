const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("comments").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("comments", function(t) {
        t.increments("id").primary();
        t.integer("user_id")
          .unsigned()
          .notNullable();
        t.foreign("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        t.integer("post_id")
          .unsigned()
          .notNullable();
        t.foreign("post_id")
          .references("id")
          .inTable("posts")
          .onDelete("CASCADE");
        t.text("content").notNullable();
        t.timestamp("created_at")
          .notNullable()
          .defaultTo(knex.fn.now());
        t.timestamp("updated_at").nullable();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("comments");
};
