const TEXT_TYPE = "text";

const types = [TEXT_TYPE];

function actions({ db, user }) {
  function _publishText(product, text) {
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
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  function _getPostText(postId) {
    return db
      .select(
        "posts.id",
        "posts.type",
        "posts.created_at",
        "posts.updated_at",
        "posts_text.text",
        "users.twitter_name as user_twitter_name",
        "users.twitter_profile_image_url as user_twitter_profile_image_url",
        "users.twitter_screen_name as user_twitter_screen_name"
      )
      .table("posts_text")
      .leftJoin("posts", "posts_text.post_id", "posts.id")
      .leftJoin("users", "posts.user_id", "users.id")
      .where({ "posts_text.post_id": postId })
      .first()
      .then((result) => {
        return result;
      })
      .catch((err) => {
        return err;
      });
  }

  function getPost(type, { postId }) {
    switch (type) {
      case "text": {
        return _getPostText(postId);
      }
    }
  }

  function getAllPosts(productId) {
    return new Promise((res, rej) => {
      db.transaction().then((trx) => {
        db.transacting(trx)
          .select(
            "posts.id",
            "posts.type",
            "posts.created_at",
            "posts.updated_at",
            "posts_text.text",
            "users.twitter_name as user_twitter_name",
            "users.twitter_profile_image_url as user_twitter_profile_image_url",
            "users.twitter_screen_name as user_twitter_screen_name"
          )
          .table("posts_text")
          .leftJoin("posts", "posts_text.post_id", "posts.id")
          .leftJoin("users", "posts.user_id", "users.id")
          .where({ "posts.product_id": productId })
          .orderBy("posts.created_at", "DESC")
          .then((result) => {
            trx.commit().then(() => res(result));
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  function publish(type, product, reqBody) {
    switch (type) {
      case "text": {
        return _publishText(product, reqBody.text);
        break;
      }
    }
  }

  function removePost(postId) {
    return new Promise((res, rej) => {
      db.transaction().then((trx) => {
        db.transacting(trx)
          .table("posts")
          .select("user_id")
          .where({ id: postId })
          .first()
          .then((postResult) => {
            if (!postResult) {
              throw new Error("Invalid post id: " + postId);
            }

            if (user.id !== postResult.user_id) {
              throw new Error("Wrong post owner.");
            }

            return true;
          })
          .then(() => {
            db.transacting(trx)
              .table("posts")
              .select()
              .where({ id: postId })
              .del()
              .then((postDelResult) => {
                trx.commit().then(() => res(postDelResult));
              });
          })
          .catch((err) => {
            trx.rollback().then(() => rej(err));
          });
      });
    });
  }

  return { publish, getPost, getAllPosts, removePost };
}

module.exports = {
  actions,
  types,
};
