const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("sessions").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("sessions", function(t) {
        t.string("sid").primary();
        t.json("sess").notNullable();
        t.timestamp("expired")
          .notNullable()
          .index();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("sessions");
};
