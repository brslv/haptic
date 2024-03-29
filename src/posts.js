const { cache, cacheKeys, ttl } = require("./cache");
const comments = require("./comments");

const TEXT_TYPE = "text";
const POLL_TYPE = "poll";
const UNKNOWN_TYPE = "unkown";

const DEFAULT_PAGINATION_DATA = {
  perPage: 10,
  currentPage: 1,
  isLengthAware: true,
};

const types = [TEXT_TYPE, POLL_TYPE];

const BROWSABLE_ORDER = {
  BOOSTS: [
    { column: "boosts_count", order: "desc" },
    { column: "posts.created_at", order: "desc" },
  ],
  NEWEST: [{ column: "posts.created_at", order: "desc" }],
};

function actions({ db, user }) {
  function _publishText(product, text, images) {
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
                if (images && images.length) {
                  const imagesArr = images.map((i) => ({
                    post_id: postId,
                    url: i,
                  }));

                  db("images")
                    .transacting(trx)
                    .insert(imagesArr)
                    .returning("id")
                    .then((imagesResult) => {
                      trx
                        .commit()
                        .then(() => {
                          _getPostText(postId)
                            .then((post) => {
                              res(post);
                            })
                            .catch((err) => {
                              throw err;
                            });
                        })
                        .catch((err) => {
                          throw err;
                        });
                    });
                  // return Promise.resolve(true);
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

  // TODO: image is not yet implemented
  function _publishPoll(product, { question, details, options }, image) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        // insert in posts

        db("posts")
          .transacting(trx)
          .insert({ type: POLL_TYPE, product_id: product.id, user_id: user.id })
          .returning("id")
          .then((result) => result[0])
          .then(function postPollInsert(postId) {
            // insert in posts_poll

            return db("posts_poll")
              .transacting(trx)
              .insert({
                post_id: postId,
                question,
                details,
              })
              .returning("id")
              .then(function postPollInsertSuccess([postPollId]) {
                return { postPollId, postId };
              })
              .catch((err) => {
                throw err;
              });
          })
          .then(({ postPollId, postId }) => {
            // insert poll options
            const pollOptionsPromises = options.map((option) => {
              return db("poll_options")
                .transacting(trx)
                .insert({
                  text: option,
                  post_id: postId,
                })
                .returning("id");
            });

            return Promise.all(pollOptionsPromises)
              .then(function pollOptionsInsertSuccess(result) {
                return {
                  postId,
                  postPollId,
                  pollOptionsIds: result.map((idInArray) => idInArray[0]),
                };
              })
              .catch((err) => {
                console.log(err);
                throw Error("Could not insert poll options");
              });
          })
          .then(({ postId, postPollId, pollOptionsIds }) => {
            // console.log({ postId, postPollId, pollOptionsIds });

            // insert images if any and return the post
            if (image) {
              // insert image then commit
              return db("images")
                .transacting(trx)
                .insert({ post_id: postId, url: image })
                .returning("id")
                .then(function imageInsertSuccess(imageResult) {
                  trx.commit().then(() => {
                    _getPostPoll(postId)
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
                _getPostPoll(postId)
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
          .as("boosts_count"),
        db("post_boosts")
          .select("id")
          .first()
          .whereRaw(
            `post_boosts.user_id = ${
              user ? user.id : 0
            } AND post_boosts.post_id = posts.id`
          )
          .as("boosted")
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
      .then((postWithComments) => {
        const id = postWithComments.id;
        return db("images")
          .select(
            "images.id as image_id",
            "images.url as image_url",
            "images.created_at as image_created_at"
          )
          .where("post_id", id)
          .orderBy("images.created_at", "asc")
          .then((imagesData) => {
            return { ...postWithComments, images: imagesData };
          })
          .catch((err) => {
            console.log(err);
            throw err;
          });
      })
      .then((result) => {
        return result;
      })
      .catch((err) => {
        return err;
      });
  }

  function _getPostPoll(
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
        "posts_poll.question",
        "posts_poll.details",
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
          .as("boosts_count"),
        db("post_boosts")
          .select("id")
          .first()
          .whereRaw(
            `post_boosts.user_id = ${
              user ? user.id : 0
            } AND post_boosts.post_id = posts.id`
          )
          .as("boosted")
      )
      .table("posts_poll")
      .leftJoin("posts", "posts_poll.post_id", "posts.id")
      .leftJoin("users", "posts.user_id", "users.id")
      .leftJoin("images", "images.post_id", "posts.id")
      .where({ "posts_poll.post_id": postId });

    if (userId) {
      query.where({ "posts.user_id": userId });
    }

    return query
      .first()
      .then((result) => {
        return db("poll_options")
          .select("poll_options.id", "poll_options.text")
          .leftJoin("posts", "posts.id", "poll_options.post_id")
          .where("posts.id", result.id)
          .then(function pollOptionsSuccess(pollOptions) {
            return {
              result,
              pollOptions,
            };
          });
      })
      .then(({ result, pollOptions }) => {
        return db("poll_votes")
          .select(
            "poll_votes.id",
            "poll_options.id as poll_options_id",
            "poll_options.text",
            "users.id as user_id",
            "users.type as user_type",
            "users.slug as user_slug",
            "users.twitter_name as user_twitter_name",
            "users.twitter_profile_image_url as user_twitter_profile_image_url",
            "users.twitter_screen_name as user_twitter_screen_name"
          )
          .leftJoin(
            "poll_options",
            "poll_votes.poll_option_id",
            "poll_options.id"
          )
          .leftJoin("users", "poll_votes.user_id", "users.id")
          .whereIn("poll_votes.poll_option_id", pollOptions.map((o) => o.id))
          .then(function pollVotesSuccess(pollVotes) {
            const allVotesCount = pollVotes.length;

            pollOptions = pollOptions.map((opt) => {
              const votesCount = pollVotes.reduce((count, vote) => {
                if (vote.poll_options_id === opt.id) count += 1;
                return count;
              }, 0);

              opt.votes_count = votesCount;
              const percent = (votesCount / allVotesCount) * 100;
              opt.votes_percent =
                Math.round((percent + Number.EPSILON) * 100) / 100;

              return opt;
            });

            return {
              result,
              pollOptions,
              pollVotes,
            };
          });
      })
      .then(({ result, pollOptions, pollVotes }) => {
        if (withComments) {
          return commentsActions
            .getComments(result.id)
            .then((commentsResult) => {
              return {
                ...result,
                comments: commentsResult,
                poll_options: pollOptions,
                poll_votes: pollVotes,
              };
            })
            .catch((err) => {
              console.log(err);
              throw err;
            });
        } else {
          return {
            ...result,
            poll_options: pollOptions,
            poll_votes: pollVotes,
          };
        }
      })
      .then((result) => {
        return {
          ...result,
          user_has_voted: result.poll_votes.some(
            (vote) => user && vote.user_id === user.id
          ),
        };
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
    paginationData = DEFAULT_PAGINATION_DATA,
  }) {
    return new Promise((res, rej) => {
      const cachedPosts = cache.get(cacheKeys.browsablePosts(order));
      if (cachedPosts) {
        return res(cachedPosts);
      }

      _getAllPostsQuery(null, {
        order,
        withComments,
        paginationData,
        isProductListed: true,
        isProductPublic: true,
      })
        .then((result) => {
          // cache.set(cacheKeys.browsablePosts(order), result, ttl[5]);
          res(result);
        })
        .catch((err) => {
          rej(err);
        });

      // db.transaction().then((trx) => {
      //   db.transacting(trx)
      //     .select(
      //       "posts.id",
      //       "posts.type",
      //       "posts.created_at",
      //       "posts.updated_at",
      //       "posts.user_id as user_id",
      //       "posts_text.text",
      //       "products.slug as product_slug",
      //       "products.name as product_name",
      //       "products.is_public",
      //       "products.is_listed",
      //       "users.type as user_type",
      //       "users.slug as user_slug",
      //       "users.twitter_name as user_twitter_name",
      //       "users.twitter_profile_image_url as user_twitter_profile_image_url",
      //       "users.twitter_screen_name as user_twitter_screen_name",
      //       "images.id as image_id",
      //       "images.url as image_url",
      //       "images.created_at as image_created_at",
      //       db("post_boosts")
      //         .count()
      //         .whereRaw("post_id = posts.id")
      //         .as("boosts_count")
      //     )
      //     .table("posts_text")
      //     .leftJoin("posts", "posts_text.post_id", "posts.id")
      //     .leftJoin("products", "posts.product_id", "products.id")
      //     .leftJoin("users", "posts.user_id", "users.id")
      //     .leftJoin("images", "images.post_id", "posts.id")
      //     .where({ "products.is_public": true, "products.is_listed": true })
      //     .orderBy(order)
      //     .limit(12)
      //     .then((result) => {
      //       if (withComments) {
      //         let commentsPromises = [];
      //         result.forEach((post) => {
      //           commentsPromises.push(commentsActions.getComments(post.id));
      //         });
      //         return Promise.all(commentsPromises)
      //           .then((commentsResult) => {
      //             return [
      //               ...result.map((post, idx) => ({
      //                 ...post,
      //                 comments: commentsResult[idx],
      //               })),
      //             ];
      //           })
      //           .catch((err) => {
      //             console.log(err);
      //             throw err;
      //           });
      //       } else {
      //         return result;
      //       }
      //     })
      //     .then((result) => {
      //       trx.commit().then(() => {
      //         cache.set(cacheKeys.browsablePosts(order), result, ttl[1]);
      //         res(result);
      //       });
      //     })
      //     .catch((err) => {
      //       trx.rollback().then(() => rej(err));
      //     });
      // });
    });
  }

  function getPost(type, { postId, userId }, options = {}) {
    switch (type) {
      case TEXT_TYPE: {
        return _getPostText(postId, userId, options);
      }
      case POLL_TYPE: {
        return _getPostPoll(postId, userId, options);
      }
      case UNKNOWN_TYPE: {
        return _getUnknownTypePost(postId, userId, options);
      }
      default:
        return Promise.reject(Error("Invalid post type."));
    }
  }

  function _getUnknownTypePost(postId, userId, options) {
    return new Promise((res, rej) => {
      return db("posts")
        .select("type")
        .where({ id: postId })
        .first()
        .then((result) => {
          if (!result) {
            return res(null);
          }
          getPost(result.type, { postId, userId }, options)
            .then((post) => {
              res(post);
            })
            .catch((err) => {
              rej(err);
            });
        })
        .catch((err) => {
          rej(err);
        });
    });
  }

  function getAllPosts(
    productId,
    {
      withComments = false,
      limit = null,
      order = BROWSABLE_ORDER.NEWEST,
      paginationData = DEFAULT_PAGINATION_DATA,
    } = {
      withComments: false,
      limit: null,
      order: BROWSABLE_ORDER.NEWEST,
      paginationData: DEFAULT_PAGINATION_DATA,
    }
  ) {
    return new Promise((res, rej) => {
      const cachedPosts = cache.get(cacheKeys.productPosts(productId));
      if (cachedPosts) {
        return res(cachedPosts);
      }

      _getAllPostsQuery(productId, {
        withComments,
        limit,
        order,
        paginationData,
        isProductPublic: !user ? true : undefined,
      })
        .then((result) => {
          // cache.set(cacheKeys.productPosts(productId), result, ttl.day);
          res(result);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function _getAllPostsQuery(
    productId,
    {
      withComments = false,
      order = BROWSABLE_ORDER.NEWEST,
      paginationData = DEFAULT_PAGINATION_DATA,
      isProductListed = undefined,
      isProductPublic = undefined,
    } = {
      withComments: false,
      isProductListed: undefined,
      isProductPublic: undefined,
      order: BROWSABLE_ORDER.NEWEST,
      paginationData: DEFAULT_PAGINATION_DATA,
    }
  ) {
    const commentsActions = comments.actions({ db, user });
    return new Promise((res, rej) => {
      const query = db("posts")
        .select(
          "posts.id",
          "posts.type",
          "posts.created_at",
          "posts.updated_at",
          "posts_text.text",
          "posts_poll.question as poll_question",
          "posts_poll.details as poll_details",
          "products.slug as product_slug",
          "products.name as product_name",
          "products.is_public",
          "products.is_listed",
          "users.id as user_id",
          "users.type as user_type",
          "users.slug as user_slug",
          "users.twitter_name as user_twitter_name",
          "users.twitter_profile_image_url as user_twitter_profile_image_url",
          "users.twitter_screen_name as user_twitter_screen_name",
          db("post_boosts")
            .count()
            .whereRaw("post_id = posts.id")
            .as("boosts_count"),
          db("post_boosts")
            .select("id")
            .first()
            .whereRaw(
              `post_boosts.user_id = ${
                user ? user.id : 0
              } AND post_boosts.post_id = posts.id`
            )
            .as("boosted")
        )
        .leftJoin("posts_text", "posts_text.post_id", "posts.id")
        .leftJoin("posts_poll", "posts_poll.post_id", "posts.id")
        .leftJoin("users", "posts.user_id", "users.id")
        .leftJoin("products", "products.id", "posts.product_id");

      let where = {};
      if (isProductListed !== undefined)
        where["products.is_listed"] = isProductListed;
      if (isProductPublic !== undefined)
        where["products.is_public"] = isProductPublic;

      if (productId) {
        where["posts.product_id"] = productId;
      }
      query.where(where);

      if (order) {
        query.orderBy(order);
      }

      query
        .paginate(paginationData)
        .then((postsResultWithPagination) => {
          if (withComments) {
            let commentsPromises = [];
            postsResultWithPagination.data.forEach((post) => {
              commentsPromises.push(commentsActions.getComments(post.id));
            });
            return Promise.all(commentsPromises)
              .then((commentsResult) => {
                return {
                  ...postsResultWithPagination,
                  data: [
                    ...postsResultWithPagination.data.map((post, idx) => ({
                      ...post,
                      comments: commentsResult[idx],
                    })),
                  ],
                };
              })
              .catch((err) => {
                console.log(err);
                throw err;
              });
          } else {
            return postsResultWithPagination;
          }
        })
        .then((postsWithCommentsAndPaginationResult) => {
          const enrichedPosts = postsWithCommentsAndPaginationResult.data.map(
            (post) => {
              const id = post.id;
              return new Promise((res, rej) => {
                db("images")
                  .select(
                    "images.id as image_id",
                    "images.url as image_url",
                    "images.created_at as image_created_at"
                  )
                  .where("post_id", id)
                  .orderBy("images.created_at", "asc")
                  .then((imagesData) => {
                    res({ ...post, images: imagesData });
                  })
                  .catch((err) => {
                    console.log(err);
                    rej(err);
                  });
              });
            }
          );
          return new Promise((res, rej) => {
            Promise.all(enrichedPosts).then((data) => {
              res({ ...postsWithCommentsAndPaginationResult, data });
            });
          });
        })
        .then((postsWithCommentsAndImagesAndPaginationResult) => {
          // enrich the poll with options and answers

          const enrichedPosts = postsWithCommentsAndImagesAndPaginationResult.data
            .map((post) => {
              if (post.type === "poll") {
                return new Promise((res, rej) => {
                  _getPostPoll(post.id).then((pollPostResult) => {
                    return res({ ...post, ...pollPostResult });
                  });
                });
              } else return post;
            })
            .reduce((acc, post) => {
              acc.push(
                new Promise((resolve) => {
                  if (post instanceof Promise) {
                    post.then((result) => {
                      resolve(result);
                    });
                  } else {
                    resolve(post);
                  }
                })
              );
              return acc;
            }, []);

          return new Promise((res, rej) => {
            Promise.all(enrichedPosts).then((data) => {
              res({ ...postsWithCommentsAndImagesAndPaginationResult, data });
            });
          });
        })
        .then((finalPostsResult) => {
          res(finalPostsResult);
        })
        .catch((err) => {
          console.error(err);
          rej(err);
        });
    });
  }

  function publish(type, product, data) {
    cache.del(cacheKeys.productPosts(product.id));
    cache.del(cacheKeys.browsablePosts(BROWSABLE_ORDER.BOOSTS));
    cache.del(cacheKeys.browsablePosts(BROWSABLE_ORDER.NEWEST));
    switch (type) {
      case TEXT_TYPE: {
        return _publishText(product, data.text, data.images);
        break;
      }
      case POLL_TYPE: {
        return _publishPoll(product, data);
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
          .where({ post_id: postId })
          .then((result) => {
            if (!result) throw Error("Couldn't update post " + postId);
            cache.del(cacheKeys.productPosts(result.product_id));
            return result;
          })
          .then((updateResult) => {
            // find the post's images
            return db
              .transacting(trx)
              .table("images")
              .select("id", "url")
              .where({ post_id: postId })
              .then((imagesResult) => {
                return imagesResult ? imagesResult : null;
              });
          })
          .then((images) => {
            if (data.images && !data.images.length && images && images.length) {
              // no data is passed through the "data.image", but the post already has images
              // so remove them from the db
              return db
                .transacting(trx)
                .table("images")
                .where({ post_id: postId })
                .del()
                .then(() => {
                  trx.commit().then(() => res(true));
                });
            }

            // update/add the image if any images are being passed through "data.image"
            if (images && images.length && data.images && data.images.length) {
              // the post already has an image, so delete it all and add the new as new records
              return db
                .transacting(trx)
                .table("images")
                .where({ post_id: postId })
                .del()
                .then(() => {
                  return db
                    .transacting(trx)
                    .table("images")
                    .insert(
                      data.images.map((i) => ({ url: i, post_id: postId }))
                    )
                    .then(() => {
                      trx.commit().then(() => res(true));
                    })
                    .catch((err) => {
                      throw err;
                    });
                })
                .catch((err) => {
                  throw err;
                });
            } else if (
              data.images &&
              data.images.length &&
              (!images || !images.length)
            ) {
              // the post doesn't have any images, so add the image
              return db
                .transacting(trx)
                .table("images")
                .insert(data.images.map((i) => ({ url: i, post_id: postId })))
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

            if (
              !data.images ||
              (!data.images.length && !images) ||
              !images.length
            ) {
              trx.commit().then(() => res(true));
            }
          })
          .catch((err) => {
            console.log(err);
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

  function vote(postId, optionId) {
    return new Promise((res, rej) => {
      return db("poll_votes")
        .insert({ post_id: postId, poll_option_id: optionId, user_id: user.id })
        .returning("id")
        .then((result) => {
          return res(result);
        })
        .catch((err) => {
          return rej(err);
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
    vote,
  };
}

module.exports = {
  actions,
  types,
  TEXT_TYPE,
  POLL_TYPE,
  UNKNOWN_TYPE,
  BROWSABLE_ORDER,
  DEFAULT_PAGINATION_DATA,
};
