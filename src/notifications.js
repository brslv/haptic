const day = require("dayjs");
const { cache, cacheKeys, ttl } = require("./cache");

const POST_BOOSTS_TYPE = "post_boosts";
const PRODUCT_COLLECTIONS_TYPE = "product_collections";
const PRODUCT_BOOSTS_TYPE = "product_boosts";

const types = [POST_BOOSTS_TYPE, PRODUCT_COLLECTIONS_TYPE, PRODUCT_BOOSTS_TYPE];
const typesMap = {
  POST_BOOSTS_TYPE: POST_BOOSTS_TYPE,
  PRODUCT_COLLECTIONS_TYPE: PRODUCT_COLLECTIONS_TYPE,
  PRODUCT_BOOSTS_TYPE: PRODUCT_BOOSTS_TYPE,
};

const dateFmt = (dateStr) => {
  return day(dateStr).format("DD MMM, HH:mm");
};

function actions({ db, user }) {
  function _addPostBoost({ post_id }) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        db.transacting(trx)
          .table("posts")
          .select("user_id")
          .where({ id: post_id })
          .first()
          .then((postResult) => {
            if (!postResult) throw Error("Non-existing post");

            return db
              .table("notifications")
              .transacting(trx)
              .insert({
                user_id: postResult.user_id,
                type: POST_BOOSTS_TYPE,
                origin_user_id: user.id,
              })
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
              });
          })
          .catch((err) => {
            trx.rollback().then(rej(err));
          });
      });
    });
  }

  function _addProductBoost({ product_id }) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        db.transacting(trx)
          .table("products")
          .select("user_id")
          .where({ id: product_id })
          .first()
          .then((productResult) => {
            if (!productResult) throw Error("Non-existing product");

            return db
              .transacting(trx)
              .table("notifications")
              .insert({
                user_id: productResult.user_id,
                type: PRODUCT_BOOSTS_TYPE,
                origin_user_id: user.id,
              })
              .returning("id")
              .then(([notificationId]) => {
                return db
                  .transacting(trx)
                  .table("notifications_product_boosts")
                  .insert({
                    notification_id: notificationId,
                    product_id,
                  })
                  .then((notificationsProductBoostsResult) => {
                    trx.commit().then(
                      res({
                        id: notificationId,
                      })
                    );
                  });
              });
          })
          .catch((err) => {
            trx.rollback().then(rej(err));
          });
      });
    });
  }

  function _addProductCollection({ product_id }) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        db.transacting(trx)
          .table("products")
          .select("user_id")
          .where({ id: product_id })
          .first()
          .then((productResult) => {
            if (!productResult) throw Error("Non-existing product");

            return db
              .transacting(trx)
              .table("notifications")
              .insert({
                user_id: productResult.user_id,
                type: PRODUCT_COLLECTIONS_TYPE,
                origin_user_id: user.id,
              })
              .returning("id")
              .then(([notificationId]) => {
                return db
                  .transacting(trx)
                  .table("notifications_product_collections")
                  .insert({
                    notification_id: notificationId,
                    product_id,
                  })
                  .then((notificationsPostBoostsResult) => {
                    trx.commit().then(
                      res({
                        id: notificationId,
                      })
                    );
                  });
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
      case POST_BOOSTS_TYPE:
        return _addPostBoost(data);
      case PRODUCT_COLLECTIONS_TYPE:
        return _addProductCollection(data);
      case PRODUCT_BOOSTS_TYPE:
        return _addProductBoost(data);
    }

    throw Error("Invalid notification type: ", type);
  }

  function getAll() {
    return new Promise((res, rej) => {
      const cached = cache.get(cacheKeys.notifications(user.id));
      if (cached) {
        return res(cached);
      }
      return (
        db
          .select(
            "notifications.id",
            "notifications.type",
            "notifications.is_read",
            "notifications.created_at",
            "posts.id as post_id",
            "products.slug as product_slug",
            "products.name as product_name",
            "user.id as user_id",
            "user.twitter_name as user_twitter_name",
            "user.twitter_profile_image_url as user_twitter_profile_image_url",
            "origin_user.id as origin_user_id",
            "origin_user.twitter_name as origin_user_twitter_name",
            "user.twitter_profile_image_url as origin_user_twitter_profile_image_url"
          )
          // .distinct()
          .from("notifications")
          // .join(function () {
          //   this.on(function () {
          //     db.select('*').from('notifications_product_collections').union()
          //   })
          // })

          // .leftOuterJoin("notifications_product_collections", function() {
          //   this.on(
          //     "notifications_product_collections.notification_id",
          //     "=",
          //     "notifications.id"
          //   ).andOnVal("notifications.type", "=", PRODUCT_COLLECTIONS_TYPE);
          // })
          // .leftOuterJoin("notifications_post_boosts", function() {
          //   this.on(
          //     "notifications_post_boosts.notification_id",
          //     "=",
          //     "notifications.id"
          //   ).andOnVal("notifications.type", "=", POST_BOOSTS_TYPE);
          // })

          .leftOuterJoin(
            "notifications_product_collections",
            "notifications_product_collections.notification_id",
            "notifications.id"
          )
          .leftOuterJoin(
            "notifications_product_boosts",
            "notifications_product_boosts.notification_id",
            "notifications.id"
          )
          .leftOuterJoin(
            "notifications_post_boosts",
            "notifications_post_boosts.notification_id",
            "notifications.id"
          )
          .leftOuterJoin(
            "posts",
            "notifications_post_boosts.post_id",
            "posts.id"
          )
          .leftOuterJoin("users as user", "notifications.user_id", "user.id")
          .leftOuterJoin(
            "users as origin_user",
            "notifications.origin_user_id",
            "origin_user.id"
          )
          .leftOuterJoin("products", function() {
            this.on("posts.product_id", "products.id")
              .orOn(
                "notifications_product_collections.product_id",
                "products.id"
              )
              .orOn("notifications_product_boosts.product_id", "products.id");
          })
          .where({ "notifications.user_id": user.id })
          .orderBy("notifications.created_at", "DESC")
          .then((result) => {
            const notifications = result.reduce(
              (acc, notif) => {
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

            cache.set(cacheKeys.notifications(user.id), notifications, ttl[1]);
            res(notifications);
          })
          .catch((err) => {
            rej(err);
          })
      );
    });
  }

  function readAll() {
    return new Promise((res, rej) => {
      db("notifications")
        .where({ user_id: user.id, is_read: false })
        .update({ is_read: true })
        .then((result) => {
          cache.del(cacheKeys.notifications(user.id));
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
  typesMap,
};
