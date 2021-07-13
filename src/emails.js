const day = require("dayjs");
const postmark = require("postmark");
const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

function createEmailSender({ db }) {
  function _sendEmail(to, template, model) {
    return new Promise((res, rej) => {
      client.sendEmailWithTemplate(
        {
          From: "borislav@haptic.so",
          To: to,
          TemplateAlias: template,
          TemplateModel: model,
        },
        res
      );
    });
  }

  function sendWelcome({ to, name }) {
    return _sendEmail(to, "welcome", {
      name: name,
      product_url: process.env.ROOT_URL,
      product_name: "Haptic",
      company_name: "Haptic.so",
      company_address: "Sofia, Bulgaria",
    });
  }

  function sendCommentNotification(
    { to, body, commentAuthorName, postUrl },
    opts = {
      checkAllowedByUser: true,
    }
  ) {
    const { checkAllowedByUser } = opts;
    const send = () => {
      return _sendEmail(to, "comment-notification", {
        product_url: process.env.ROOT_URL,
        product_name: "Haptic.so",
        body: body,
        commenter_name: commentAuthorName,
        action_url: postUrl,
        company_name: "Haptic.so",
        company_address: "Sofia, Bulgaria",
        notifications_url: `${process.env.ROOT_URL}/dashboard/profile`,
      });
    };

    return new Promise((res, rej) => {
      if (checkAllowedByUser) {
        return db("users")
          .select("email_comments")
          .where("email", to)
          .first()
          .then((userResult) => {
            if (!userResult) {
              return res({
                ok: 0,
                details: "skipped: user not found for email " + to,
              });
            }

            if (userResult.email_comments) {
              return send().then((sendErrors) => {
                return res({
                  ok: sendErrors ? 0 : 1,
                  details: sendErrors ? sendErrors : "sent",
                });
              });
            } else {
              return res({
                ok: 1,
                details: "skipped: email_comments false",
              });
            }
          })
          .catch((err) => {
            console.log(err);
            rej(err);
          });
      } else {
        return send().then((sendResult) => {
          return res({ ok: 1, result: sendResult });
        });
      }
    });
  }

  return {
    sendWelcome,
    sendCommentNotification,
  };
}

function actions({ db, emailsQueue }) {
  function emailWelcome({ email, name }) {
    return emailsQueue.jobs.emailWelcome({ email, name });
  }

  function emailComment({ emailTo, commentData }) {
    return db("users")
      .select("id", "twitter_name")
      .where("id", commentData.commentAuthorId)
      .first()
      .then((userResult) => {
        return db("posts")
          .select("products.slug as product_slug")
          .leftJoin("products", "products.id", "posts.product_id")
          .where("posts.id", commentData.postId)
          .first()
          .then((postResult) => ({ userResult, postResult }));
      })
      .then(({ userResult, postResult }) => {
        return emailsQueue.jobs.emailComment({
          email: emailTo,
          postUrl:
            process.env.ROOT_URL +
            "/p/" +
            postResult.product_slug +
            "/" +
            commentData.postId,
          commentAuthorName: userResult.twitter_name,
          content: commentData.content,
        });
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
  }

  return {
    emailWelcome,
    emailComment,
  };
}

module.exports = {
  actions,
  createEmailSender,
};
