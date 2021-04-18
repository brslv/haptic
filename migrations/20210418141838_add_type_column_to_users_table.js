const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("users").then(function(exists) {
    if (exists) {
      return knex.schema.table("users", function(t) {
        t.integer("type").defaultTo(0);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table("users", function(t) {
    t.dropColumn("type");
  });
};
