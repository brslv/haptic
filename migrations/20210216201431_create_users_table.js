const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("users").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("users", function(t) {
        t.increments("id").primary();
        t.bigInteger("twitter_id")
          .index()
          .notNullable();
        t.string("twitter_name", 200).nullable();
        t.string("twitter_screen_name", 200).notNullable();
        t.string("twitter_location", 1000).nullable();
        t.string("twitter_description", 400).nullable();
        t.string("twitter_url", 2000).nullable();
        t.string("twitter_profile_image_url", 2000).nullable();
        t.timestamp("created_at")
          .notNullable()
          .defaultTo(knex.fn.now());
        t.timestamp("updated_at").nullable();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("users");
};
