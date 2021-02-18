const TEXT_TYPE = "text";

const types = [TEXT_TYPE];

function actions({ db, user }) {
  function _publishText(product, text) {
    return new Promise((res, rej) => {
      db.transaction((trx) => {
        // insert in posts

        return db("posts")
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

  function publish(type, product, reqBody) {
    switch (type) {
      case "text": {
        return _publishText(product, reqBody.text);
        break;
      }
    }
  }

  return { publish, getPost };
}

module.exports = {
  actions,
  types,
};
