const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("products").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("products", function(t) {
        t.increments("id").primary();
        t.integer("user_id")
          .unsigned()
          .notNullable();
        t.foreign("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        t.string("name", 200).notNullable();
        t.string("slug", 200)
          .unique()
          .notNullable();
        t.string("description", 280).nullable();
        t.string("website", 400).nullable();
        t.boolean("is_public").defaultTo(true);
        t.boolean("is_listed").defaultTo(true);
        t.timestamp("created_at")
          .notNullable()
          .defaultTo(knex.fn.now());
        t.timestamp("updated_at").nullable();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("products");
};
