const { cache, cacheKeys, ttl } = require("./cache");
const comments = require("./comments");

const TEXT_TYPE = "text";

const types = [TEXT_TYPE];

const BROWSABLE_ORDER = {
  BOOSTS: [
    { column: "boosts_count", order: "desc" },
    { column: "posts.created_at", order: "desc" },
  ],
  NEWEST: [{ column: "posts.created_at", order: "desc" }],
};

function actions({ db, user }) {
  function _publishText(product, text, image) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        // insert in posts

        db("posts")
          .transacting(trx)
          .insert({ type: TEXT_TYPE, product_id: product.id, user_id: user.id })
          .returning("id")
          .then(function postInsertResult(result) {
            const id = result[0];
            return id;
          })
          .then(function postTextInsert(postId) {
            // insert in posts_text

            return db("posts_text")
              .transacting(trx)
              .insert({
                post_id: postId,
                text,
              })
              .returning("id")
              .then(function postTextInsertSuccess([postTextId]) {
                if (image) {
                  // insert image then commit
                  return db("images")
                    .transacting(trx)
                    .insert({ post_id: postId, url: image })
                    .returning("id")
                    .then((imageResult) => {
                      trx.commit().then(() => {
                        _getPostText(postId)
                          .then((post) => {
                            res(post);
                          })
                          .catch((err) => {
                            throw err;
                          });
                      });
                    })
                    .catch((err) => {
                      throw err;
                    });
                } else {
                  // no image - commit trx
                  trx.commit().then(() => {
                    _getPostText(postId)
                      .then((post) => {
                        res(post);
                      })
                      .catch((err) => {
                        throw err;
                      });
                  });
                }
              })
              .catch((err) => {
                throw err;
              });
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  function _getPostText(
    postId,
    userId,
    { withComments = false } = { withComments: false }
  ) {
    const commentsActions = comments.actions({ db, user });
    const query = db
      .select(
        "posts.id",
        "posts.type",
        "posts.created_at",
        "posts.updated_at",
        "posts.user_id as user_id",
        "posts_text.text",
        "users.type as user_type",
        "users.slug as user_slug",
        "users.twitter_name as user_twitter_name",
        "users.twitter_profile_image_url as user_twitter_profile_image_url",
        "users.twitter_screen_name as user_twitter_screen_name",
        "images.id as image_id",
        "images.url as image_url",
        "images.created_at as image_created_at",
        db("post_boosts")
          .count()
          .whereRaw("post_id = posts.id")
          .as("boosts_count")
      )
      .table("posts_text")
      .leftJoin("posts", "posts_text.post_id", "posts.id")
      .leftJoin("users", "posts.user_id", "users.id")
      .leftJoin("images", "images.post_id", "posts.id")
      .where({ "posts_text.post_id": postId });

    if (userId) {
      query.where({ "posts.user_id": userId });
    }

    return query
      .first()
      .then((result) => {
        if (withComments) {
          return commentsActions
            .getComments(result.id)
            .then((commentsResult) => {
              return {
                ...result,
                comments: commentsResult,
              };
            })
            .catch((err) => {
              console.log(err);
              throw err;
            });
        } else {
          return result;
        }
      })
      .then((result) => {
        return result;
      })
      .catch((err) => {
        return err;
      });
  }

  function getBrowsablePosts({
    order = BROWSABLE_ORDER.BOOSTS,
    withComments = true,
  }) {
    const commentsActions = comments.actions({ db, user });
    return new Promise((res, rej) => {
      const cachedPosts = cache.get(cacheKeys.browsablePosts(order));
      if (cachedPosts) {
        return res(cachedPosts);
      }

      db.transaction().then((trx) => {
        db.transacting(trx)
          .select(
            "posts.id",
            "posts.type",
            "posts.created_at",
            "posts.updated_at",
            "posts.user_id as user_id",
            "posts_text.text",
            "products.slug as product_slug",
            "products.is_public",
            "products.is_listed",
            "users.type as user_type",
            "users.slug as user_slug",
            "users.twitter_name as user_twitter_name",
            "users.twitter_profile_image_url as user_twitter_profile_image_url",
            "users.twitter_screen_name as user_twitter_screen_name",
            "images.id as image_id",
            "images.url as image_url",
            "images.created_at as image_created_at",
            db("post_boosts")
              .count()
              .whereRaw("post_id = posts.id")
              .as("boosts_count")
          )
          .table("posts_text")
          .leftJoin("posts", "posts_text.post_id", "posts.id")
          .leftJoin("products", "posts.product_id", "products.id")
          .leftJoin("users", "posts.user_id", "users.id")
          .leftJoin("images", "images.post_id", "posts.id")
          .where({ "products.is_public": true, "products.is_listed": true })
          .orderBy(order)
          .limit(24)
          .then((result) => {
            if (withComments) {
              let commentsPromises = [];
              result.forEach((post) => {
                commentsPromises.push(commentsActions.getComments(post.id));
              });
              return Promise.all(commentsPromises)
                .then((commentsResult) => {
                  return [
                    ...result.map((post, idx) => ({
                      ...post,
                      comments: commentsResult[idx],
                    })),
                  ];
                })
                .catch((err) => {
                  console.log(err);
                  throw err;
                });
            } else {
              return result;
            }
          })
          .then((result) => {
            trx.commit().then(() => {
              cache.set(cacheKeys.browsablePosts(order), result, ttl[1]);
              res(result);
            });
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  function getPost(type, { postId, userId }, options = {}) {
    switch (type) {
      case "text": {
        return _getPostText(postId, userId, options);
      }
    }
  }

  function getAllPosts(
    productId,
    { withComments = false } = { withComments: false }
  ) {
    const commentsActions = comments.actions({ db, user });

    return new Promise((res, rej) => {
      const cachedPosts = cache.get(cacheKeys.productPosts(productId));
      if (cachedPosts) {
        return res(cachedPosts);
      }

      db.select(
        "posts.id",
        "posts.type",
        "posts.created_at",
        "posts.updated_at",
        "posts_text.text",
        "users.id as user_id",
        "users.type as user_type",
        "users.slug as user_slug",
        "users.twitter_name as user_twitter_name",
        "users.twitter_profile_image_url as user_twitter_profile_image_url",
        "users.twitter_screen_name as user_twitter_screen_name",
        "images.id as image_id",
        "images.url as image_url",
        "images.created_at as image_created_at",
        db("post_boosts")
          .count()
          .whereRaw("post_id = posts.id")
          .as("boosts_count")
      )
        .table("posts_text")
        .leftJoin("posts", "posts_text.post_id", "posts.id")
        .leftJoin("users", "posts.user_id", "users.id")
        .leftJoin("images", "images.post_id", "posts.id")
        .where({ "posts.product_id": productId })
        .orderBy("posts.created_at", "DESC")
        .then((result) => {
          if (withComments) {
            let commentsPromises = [];
            result.forEach((post) => {
              commentsPromises.push(commentsActions.getComments(post.id));
            });
            return Promise.all(commentsPromises)
              .then((commentsResult) => {
                return [
                  ...result.map((post, idx) => ({
                    ...post,
                    comments: commentsResult[idx],
                  })),
                ];
              })
              .catch((err) => {
                console.log(err);
                throw err;
              });
          } else {
            return result;
          }
        })
        .then((result) => {
          cache.set(cacheKeys.productPosts(productId), result, ttl[1]);
          res(result);
        })
        .catch((err) => {
          trx.rollback().then(() => rej(err));
        });
    });
  }

  function publish(type, product, data) {
    cache.del(cacheKeys.productPosts(product.id));
    cache.del(cacheKeys.browsablePosts(BROWSABLE_ORDER.BOOSTS));
    cache.del(cacheKeys.browsablePosts(BROWSABLE_ORDER.NEWEST));
    switch (type) {
      case "text": {
        return _publishText(product, data.text, data.image);
        break;
      }
    }
  }

  function updatePost(type, postId, data) {
    if (data.productId) cache.del(cacheKeys.productPosts(data.productId));
    switch (type) {
      case "text": {
        return _updateTextPost(postId, data);
        break;
      }
    }
  }

  function _updateTextPost(postId, data) {
    return new Promise((res, rej) => {
      db.transaction().then((trx) => {
        db.transacting(trx)
          .table("posts_text")
          .update({ text: data.text }) // update the post
          .where({ id: postId })
          .then((result) => {
            cache.del(cacheKeys.productPosts(result.product_id));

            if (!result) throw Error("Couldn't update post" + postId);
            return result;
          })
          .then((updateResult) => {
            // find the post's images
            return db
              .transacting(trx)
              .table("images")
              .select("id", "url")
              .where({ post_id: postId })
              .first()
              .then((imagesResult) => {
                if (imagesResult) {
                  return imagesResult.id;
                } else {
                  return null;
                }
              });
          })
          .then((imageId) => {
            if (!data.image && imageId) {
              // no data is passed through the "data.image", but the post already has an image
              // so remove it from the db
              db.transacting(trx)
                .table("images")
                .where({ post_id: postId, id: imageId })
                .del()
                .then((result) => {
                  trx.commit().then(() => res(true));
                });
            }

            // update/add the image if any images are being passed through "data.image"
            if (imageId) {
              // the post already has an image, so update it
              db.transacting(trx)
                .table("images")
                .update({ url: data.image })
                .where({ id: imageId })
                .then((updateImageResult) => {
                  if (updateImageResult) {
                    trx.commit().then(() => res(true));
                  } else {
                    throw new Error("Image update failed.");
                  }
                })
                .catch((err) => {
                  throw err;
                });
            } else {
              // the post doesn't have any images, so add the image
              db.transacting(trx)
                .table("images")
                .insert({ url: data.image, post_id: postId })
                .then((insertImageResult) => {
                  if (insertImageResult) {
                    trx.commit().then(() => res(true));
                  } else {
                    throw new Error("Image insert failed.");
                  }
                })
                .catch((err) => {
                  throw err;
                });
            }
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  function removePost(postId) {
    return new Promise((res, rej) => {
      db.transaction().then((trx) => {
        db.transacting(trx)
          .table("posts")
          .select("user_id", "product_id")
          .where({ id: postId })
          .first()
          .then((postResult) => {
            if (!postResult) {
              throw new Error("Invalid post id: " + postId);
            }

            if (user.id !== postResult.user_id) {
              throw new Error("Wrong post owner.");
            }
            cache.del(cacheKeys.productPosts(postResult.product_id));

            return true;
          })
          .then(() => {
            return db
              .transacting(trx)
              .table("posts")
              .select()
              .where({ id: postId })
              .del()
              .then((postDelResult) => {
                trx.commit().then(() => res(postDelResult));
              })
              .catch((err) => {
                console.log(err);
                trx.rollback().then(() => rej(err));
              });
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  return {
    publish,
    getBrowsablePosts,
    getPost,
    updatePost,
    getAllPosts,
    removePost,
  };
}

module.exports = {
  actions,
  types,
  TEXT_TYPE,
  BROWSABLE_ORDER,
};
