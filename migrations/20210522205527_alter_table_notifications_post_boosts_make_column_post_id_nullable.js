exports.up = (knex) => {
  return knex.schema.alterTable("notifications_post_boosts", (t) => {
    t.integer("post_id")
      .nullable()
      .alter();
  });
};

exports.down = (knex) => {
  return knex.schema.alterTable("notifications_post_boosts", (t) => {
    t.integer("post_id")
      .notNullable()
      .alter();
  });
};
