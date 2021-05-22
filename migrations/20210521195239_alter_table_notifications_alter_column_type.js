const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("notifications").then(async function(exists) {
    if (exists) {
      await knex.raw("ALTER TABLE notifications ALTER type TYPE VARCHAR;");
      await knex.raw(
        "ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;"
      );
    }
  });
};

exports.down = function(knex) {
  //
};
