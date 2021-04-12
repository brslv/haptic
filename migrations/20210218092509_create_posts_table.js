const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("posts").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("posts", function(t) {
        t.increments("id").primary();
        t.enu("type", ["text"]).notNullable();
        t.integer("product_id")
          .unsigned()
          .notNullable();
        t.foreign("product_id")
          .references("id")
          .inTable("products")
          .onDelete("CASCADE");
        t.integer("user_id")
          .unsigned()
          .notNullable();
        t.foreign("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        t.timestamp("created_at")
          .notNullable()
          .defaultTo(knex.fn.now());
        t.timestamp("updated_at").nullable();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("posts");
};
