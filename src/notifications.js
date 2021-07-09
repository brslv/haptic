const day = require("dayjs");
const { cache, cacheKeys, ttl } = require("./cache");
const { mdConverter } = require("./utils");

const POST_BOOSTS_TYPE = "post_boosts";
const PRODUCT_COLLECTIONS_TYPE = "product_collections";
const PRODUCT_BOOSTS_TYPE = "product_boosts";
const COMMENT_BOOSTS_TYPE = "comment_boosts";
const COMMENT = "comment";

const types = [
  POST_BOOSTS_TYPE,
  PRODUCT_COLLECTIONS_TYPE,
  PRODUCT_BOOSTS_TYPE,
  COMMENT,
  COMMENT_BOOSTS_TYPE,
];
const typesMap = {
  POST_BOOSTS_TYPE: POST_BOOSTS_TYPE,
  PRODUCT_COLLECTIONS_TYPE: PRODUCT_COLLECTIONS_TYPE,
  PRODUCT_BOOSTS_TYPE: PRODUCT_BOOSTS_TYPE,
  COMMENT: COMMENT,
  COMMENT_BOOSTS_TYPE: COMMENT_BOOSTS_TYPE,
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

  function _addComment({
    userId,
    postId,
    commentAuthorId,
    content,
    commentId,
  }) {
    return new Promise((res, rej) => {
      return db.transaction((trx) => {
        return db
          .transacting(trx)
          .table("notifications")
          .insert({
            user_id: userId,
            type: COMMENT,
            origin_user_id: commentAuthorId,
          })
          .returning("id")
          .then(([notificationId]) => {
            return db
              .transacting(trx)
              .table("notifications_comments")
              .insert({
                notification_id: notificationId,
                post_id: postId,
                comment_id: commentId,
              })
              .then((notificationsCommentsResult) => {
                trx.commit().then(
                  res({
                    id: notificationId,
                  })
                );
              })
              .catch((err) => {
                console.log(err);
                trx.rollback().then(rej(err));
              });
          })
          .catch((err) => {
            console.log(err);
            trx.rollback().then(rej(err));
          });
      });
    });
  }

  function _addCommentBoost({ comment_id }) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        db.transacting(trx)
          .table("comments")
          .select("id", "user_id")
          .where({ id: comment_id })
          .first()
          .then((commentResult) => {
            if (!commentResult) throw Error("Non-existing comment");

            return db
              .transacting(trx)
              .table("notifications")
              .insert({
                user_id: commentResult.user_id,
                type: COMMENT_BOOSTS_TYPE,
                origin_user_id: user.id,
              })
              .returning("id")
              .then(([notificationId]) => {
                return db
                  .transacting(trx)
                  .table("notifications_comment_boosts")
                  .insert({
                    notification_id: notificationId,
                    comment_id,
                  })
                  .then((notificationsCommentsBoostsResult) => {
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
      case COMMENT:
        return _addComment(data);
      case COMMENT_BOOSTS_TYPE:
        return _addCommentBoost(data);
    }

    throw Error("Invalid notification type: ", type);
  }

  function getProductCollections() {
    return new Promise((res, rej) => {
      db.select(
        "notifications.id",
        "notifications.type",
        "notifications.is_read",
        "notifications.created_at",
        "products.slug as product_slug",
        "products.name as product_name",
        "user.id as user_id",
        "user.twitter_name as user_twitter_name",
        "user.twitter_profile_image_url as user_twitter_profile_image_url",
        "origin_user.id as origin_user_id",
        "origin_user.twitter_name as origin_user_twitter_name",
        "origin_user.slug as origin_user_slug",
        "origin_user.twitter_profile_image_url as origin_user_twitter_profile_image_url"
      )
        .from("notifications")
        .leftJoin(
          "notifications_product_collections",
          "notifications_product_collections.notification_id",
          "notifications.id"
        )
        .leftJoin(
          "products",
          "notifications_product_collections.product_id",
          "products.id"
        )
        .leftJoin("users as user", "notifications.user_id", "user.id")
        .leftJoin(
          "users as origin_user",
          "notifications.origin_user_id",
          "origin_user.id"
        )
        .where({
          "notifications.type": "product_collections",
          "notifications.user_id": user.id,
          is_read: false,
        })
        .orderBy("notifications.created_at", "DESC")
        .then((result) => {
          const notifications = result.map((notif) => {
            notif.created_at_formatted = dateFmt(notif.created_at);
            return notif;
          });

          // cache.set(cacheKeys.notifications(user.id), notifications, ttl[1]);
          res(notifications);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function getProductBoosts() {
    return new Promise((res, rej) => {
      db.select(
        "notifications.id",
        "notifications.type",
        "notifications.is_read",
        "notifications.created_at",
        "products.slug as product_slug",
        "products.name as product_name",
        "user.id as user_id",
        "user.twitter_name as user_twitter_name",
        "user.twitter_profile_image_url as user_twitter_profile_image_url",
        "origin_user.id as origin_user_id",
        "origin_user.twitter_name as origin_user_twitter_name",
        "origin_user.slug as origin_user_slug",
        "origin_user.twitter_profile_image_url as origin_user_twitter_profile_image_url"
      )
        .from("notifications")
        .leftJoin(
          "notifications_product_boosts",
          "notifications_product_boosts.notification_id",
          "notifications.id"
        )
        .leftJoin(
          "products",
          "notifications_product_boosts.product_id",
          "products.id"
        )
        .leftJoin("users as user", "notifications.user_id", "user.id")
        .leftJoin(
          "users as origin_user",
          "notifications.origin_user_id",
          "origin_user.id"
        )
        .where({
          "notifications.type": "product_boosts",
          "notifications.user_id": user.id,
          is_read: false,
        })
        .orderBy("notifications.created_at", "DESC")
        .then((result) => {
          const notifications = result.map((notif) => {
            notif.created_at_formatted = dateFmt(notif.created_at);
            return notif;
          });

          // cache.set(cacheKeys.notifications(user.id), notifications, ttl[1]);
          res(notifications);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function getPostsBoosts() {
    return new Promise((res, rej) => {
      db.select(
        "notifications.id",
        "notifications.type",
        "notifications.is_read",
        "notifications.created_at",
        "products.slug as product_slug",
        "products.name as product_name",
        "posts.id as post_id",
        "user.id as user_id",
        "user.twitter_name as user_twitter_name",
        "user.twitter_profile_image_url as user_twitter_profile_image_url",
        "origin_user.id as origin_user_id",
        "origin_user.twitter_name as origin_user_twitter_name",
        "origin_user.slug as origin_user_slug",
        "origin_user.twitter_profile_image_url as origin_user_twitter_profile_image_url"
      )
        .from("notifications")
        .leftJoin(
          "notifications_post_boosts",
          "notifications_post_boosts.notification_id",
          "notifications.id"
        )
        .leftJoin("posts", "notifications_post_boosts.post_id", "posts.id")
        .leftJoin("users as user", "notifications.user_id", "user.id")
        .leftJoin(
          "users as origin_user",
          "notifications.origin_user_id",
          "origin_user.id"
        )
        .leftJoin("products", "posts.product_id", "products.id")
        .where({
          "notifications.type": "post_boosts",
          "notifications.user_id": user.id,
          is_read: false,
        })
        .whereNot({
          "notifications_post_boosts.post_id": null,
        })
        .orderBy("notifications.created_at", "DESC")
        .then((result) => {
          const notifications = result.map((notif) => {
            notif.created_at_formatted = dateFmt(notif.created_at);
            return notif;
          });

          // cache.set(cacheKeys.notifications(user.id), notifications, ttl[1]);
          res(notifications);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function getComments() {
    return new Promise((res, rej) => {
      db.select(
        "notifications.id",
        "notifications.type",
        "notifications.is_read",
        "notifications.created_at",
        "comments.content as comment_content",
        "products.slug as product_slug",
        "products.name as product_name",
        "posts.id as post_id",
        "user.id as user_id",
        "user.twitter_name as user_twitter_name",
        "user.twitter_profile_image_url as user_twitter_profile_image_url",
        "origin_user.id as origin_user_id",
        "origin_user.twitter_name as origin_user_twitter_name",
        "origin_user.slug as origin_user_slug",
        "origin_user.twitter_profile_image_url as origin_user_twitter_profile_image_url"
      )
        .from("notifications")
        .leftJoin(
          "notifications_comments",
          "notifications_comments.notification_id",
          "notifications.id"
        )
        .leftJoin(
          "comments",
          "notifications_comments.comment_id",
          "comments.id"
        )
        .leftJoin("posts", "notifications_comments.post_id", "posts.id")
        .leftJoin("users as user", "notifications.user_id", "user.id")
        .leftJoin(
          "users as origin_user",
          "notifications.origin_user_id",
          "origin_user.id"
        )
        .leftJoin("products", "posts.product_id", "products.id")
        .where({
          "notifications.type": "comment",
          "notifications.user_id": user.id,
          is_read: false,
        })
        .whereNot({
          "notifications_comments.post_id": null,
          "notifications_comments.comment_id": null,
        })
        .orderBy("notifications.created_at", "DESC")
        .then((result) => {
          const notifications = result.map((notif) => {
            notif.comment_content_md = notif.content;
            notif.comment_content = mdConverter.makeHtml(notif.comment_content);
            notif.created_at_formatted = dateFmt(notif.created_at);
            return notif;
          });

          // cache.set(cacheKeys.notifications(user.id), notifications, ttl[1]);
          res(notifications);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function getCommentBoosts() {
    return new Promise((res, rej) => {
      db.select(
        "notifications.id",
        "notifications.type",
        "notifications.is_read",
        "notifications.created_at",
        "comments.content as comment_content",
        "posts.id as post_id",
        "products.slug as product_slug",
        "user.id as user_id",
        "user.twitter_name as user_twitter_name",
        "user.twitter_profile_image_url as user_twitter_profile_image_url",
        "origin_user.id as origin_user_id",
        "origin_user.twitter_name as origin_user_twitter_name",
        "origin_user.slug as origin_user_slug",
        "origin_user.twitter_profile_image_url as origin_user_twitter_profile_image_url"
      )
        .from("notifications")
        .leftJoin(
          "notifications_comment_boosts",
          "notifications_comment_boosts.notification_id",
          "notifications.id"
        )
        .leftJoin(
          "comments",
          "notifications_comment_boosts.comment_id",
          "comments.id"
        )
        .leftJoin("posts", "posts.id", "comments.post_id")
        .leftJoin("products", "products.id", "posts.product_id")
        .leftJoin("users as user", "notifications.user_id", "user.id")
        .leftJoin(
          "users as origin_user",
          "notifications.origin_user_id",
          "origin_user.id"
        )
        .where({
          "notifications.type": "comment_boosts",
          "notifications.user_id": user.id,
          is_read: false,
        })
        .orderBy("notifications.created_at", "DESC")
        .then((result) => {
          const notifications = result.map((notif) => {
            notif.created_at_formatted = dateFmt(notif.created_at);
            return notif;
          });

          // cache.set(cacheKeys.notifications(user.id), notifications, ttl[1]);
          res(notifications);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function getAll() {
    return new Promise((res, rej) => {
      const promises = [
        getProductCollections(),
        getProductBoosts(),
        getPostsBoosts(),
        getComments(),
        getCommentBoosts(),
      ];
      Promise.all(promises)
        .then(
          ([
            productCollections,
            productBoosts,
            postsBoosts,
            comments,
            commentBoosts,
          ]) => {
            res({
              productCollections,
              productBoosts,
              postsBoosts,
              comments,
              commentBoosts,
            });
          }
        )
        .catch((err) => {
          console.log(err);
          throw err;
        });
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
