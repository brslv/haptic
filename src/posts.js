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
              .then(function postTextInsertSuccess(postTextId) {
                return { postId, postTextId };
              })
              .catch((err) => {
                trx.rollback();
                throw err;
              });
          })
          .then(function handleSuccess({ postId, postTextId }) {
            trx.commit();
            res({ postId, postTextId });
          })
          .catch((err) => {
            trx.rollback();
            rej(err);
          });
      });
    });
  }

  function _getPostText(postId) {
    return new Promise((res, rej) => {
      db.transaction().then((trx) => {
        db("posts")
          .transacting(trx)
          .select()
          .from("posts")
          .where({ id: postId })
          .first()
          .then((resultPost) => {
            return db("posts_text")
              .transacting(trx)
              .select()
              .where({ post_id: postId })
              .first()
              .then((resultPostText) => {
                return { ...resultPost, ...resultPostText };
              })
              .catch((err) => {
                trx.rollback();
                throw err;
              });
          })
          .then((post) => {
            res(post);
          })
          .catch((err) => {
            trx.rollback();
            rej(err);
          });
      });
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
      return db.transaction().then((trx) => {
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
            trx.commit();
            res(result);
          })
          .catch((err) => {
            trx.rollback();
            rej(err);
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
                trx.commit();
                res(postDelResult);
              });
          })
          .catch((err) => {
            rej(err);
            trx.rollback();
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
