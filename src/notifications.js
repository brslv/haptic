const day = require("dayjs");

const POST_BOOSTS_TYPE = "post_boosts";

const types = [POST_BOOSTS_TYPE];

const dateFmt = (dateStr) => {
  return day(dateStr).format("DD MMM, HH:mm");
};

function actions({ db, user }) {
  function _addPostBoost({ post_id }) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        db.table("notifications")
          .transacting(trx)
          .insert({ user_id: user.id })
          .returning("id")
          .then(([notificationId]) => {
            return db
              .transacting(trx)
              .table("notifications_post_boosts")
              .insert({
                notification_id: notificationId,
                post_id,
              })
              .then((notificationsPostBoostsResult) => {
                trx.commit().then(
                  res({
                    id: notificationId,
                  })
                );
              });
          })
          .catch((err) => {
            trx.rollback().then(rej(err));
          });
      });
    });
  }

  function add(type, data) {
    switch (type) {
      case "post_boosts":
        return _addPostBoost(data);
    }

    throw Error("Invalid notification type: ", type);
  }

  function getAll() {
    return new Promise((res, rej) => {
      return db
        .select(
          "notifications.id",
          "notifications.is_read",
          "notifications.created_at",
          "posts.id as post_id",
          "products.slug as product_slug",
          "products.name as product_name",
          "users.id as user_id",
          "users.twitter_name as author_twitter_name",
          "users.twitter_profile_image_url as author_twitter_profile_image_url"
        )
        .from("notifications")
        .innerJoin(
          "notifications_post_boosts",
          "notifications_post_boosts.notification_id",
          "notifications.id"
        )
        .innerJoin("posts", "notifications_post_boosts.post_id", "posts.id")
        .innerJoin("users", "notifications.user_id", "users.id")
        .innerJoin("products", "posts.product_id", "products.id")
        .where({ "posts.user_id": user.id })
        .orderBy("notifications.created_at", "DESC")
        .then((result) => {
          const notifications = result.reduce(
            (acc, notif) => {
              notif.type = POST_BOOSTS_TYPE;
              notif.created_at_formatted = dateFmt(notif.created_at);
              if (notif.is_read) {
                acc.read.push(notif);
              } else {
                acc.unread.push(notif);
              }
              return acc;
            },
            { read: [], unread: [] }
          );

          res(notifications);
        })
        .catch((err) => {
          rej(err);
        });
    });
  }

  function readAll() {
    return new Promise((res, rej) => {
      db("notifications")
        .where({ user_id: user.id })
        .update({ is_read: true })
        .then((result) => {
          res(result);
        })
        .catch((err) => {
          rej(err);
        });
    });
  }

  return { add, getAll, readAll };
}

module.exports = {
  actions,
  types,
};
