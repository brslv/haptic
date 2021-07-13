const Queue = require("bull");
const notifications = require("./notifications");
const emails = require("./emails");

function loadNotificationsQueue({ db }) {
  const queue = new Queue("notifications-queue", process.env.REDIS_URL);

  // consumer
  queue.process(async function processJob(job) {
    const data = job.data;
    const type = data.type;
    const user = data.user;
    const details = data.details;

    switch (type) {
      case "comment": {
        // add notifications to the database
        // for every user that's in the thread of comments
        notifications.actions({ db, user }).add("comment", details);

        return { ok: 1 };
      }
      default:
        return { ok: 0 };
    }
  });

  // producers
  async function _commentNotification(
    { userId, postId, commentAuthorId, content, commentId },
    user
  ) {
    const jobData = {
      type: "comment",
      user,
      details: {
        userId,
        postId,
        commentAuthorId,
        content,
        commentId,
      },
    };
    await queue.add(jobData);
  }

  const jobs = {
    commentNotification: _commentNotification,
  };

  return {
    queue,
    jobs,
  };
}

function loadEmailsQueue({ db, isProd }) {
  const EMAIL_TYPES = {
    WELCOME: "welcome",
    NEW_COMMENT: "new_comment",
  };
  const queue = new Queue("emails-queue", process.env.REDIS_URL);

  // consumer
  queue.process(async function processJob(job) {
    // don't send emails when in non-prod env.
    if (!isProd) {
      return Promise.resolve({
        ok: 1,
        details: "not send because non-prod env",
      });
    }

    const data = job.data;
    const details = data.details;
    const emailSender = emails.createEmailSender({ db, isProd });

    if (details.type === EMAIL_TYPES.NEW_COMMENT) {
      const emailData = {
        to: details.email,
        body: details.content,
        commentAuthorName: details.commentAuthorName,
        postUrl: details.postUrl,
      };
      const opts = {
        checkAllowedByUser: true,
      };

      return emailSender
        .sendCommentNotification(emailData, opts)
        .then((response) => {
          return { ok: 1, response };
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    }

    if (details.type === EMAIL_TYPES.WELCOME) {
      const emailData = {
        to: details.email,
        name: details.name,
      };

      return emailSender
        .sendWelcome(emailData)
        .then((response) => {
          if (response === null) { // no errors 
            return db("users")
              .update({ welcome_email_sent: true })
              .where({ email: emailData.to, twitter_name: emailData.name })
              .then(() => {
                return { ok: 1, response };
              }).catch((err) => {
                return { ok: 1, response: `Could not update welcome_email_sent property on user: { email: ${emailData.to}, name: ${emailData.name} }` };
              });
          } else {
            return { ok: 1, response };
          }
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    }
  });

  // producers

  async function _emailWelcome({ email, name }) {
    const jobData = {
      details: {
        type: EMAIL_TYPES.WELCOME,
        email,
        name,
      },
    };
    await queue.add(jobData);
  }

  async function _emailComment({ email, postUrl, commentAuthorName, content }) {
    const jobData = {
      details: {
        type: EMAIL_TYPES.NEW_COMMENT,
        email,
        postUrl,
        commentAuthorName,
        content: content,
      },
    };
    await queue.add(jobData);
  }

  const jobs = {
    emailWelcome: _emailWelcome,
    emailComment: _emailComment,
  };

  return {
    queue,
    jobs,
  };
}

module.exports = { loadNotificationsQueue, loadEmailsQueue };
