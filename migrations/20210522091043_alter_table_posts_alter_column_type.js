const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("posts").then(async function(exists) {
    if (exists) {
      await knex.raw("ALTER TABLE posts ALTER type TYPE VARCHAR;");
      await knex.raw("ALTER TABLE posts DROP CONSTRAINT posts_type_check;");
    }
  });
};

exports.down = function(knex) {
  //
};
