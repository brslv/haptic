// load the things we need
const express = require("express");
const path = require("path");
const knex = require("knex");
const dotenv = require("dotenv");
const dbConfig = require("../knexfile");
const helmet = require("helmet");

const dbErrCodes = {
  DUP_CODE: "23505",
};

// setup env
const isProd = process.env.NODE_ENV === "production";
const dotenvConfigPath = isProd ? ".env" : ".env.dev";
dotenv.config({ path: dotenvConfigPath });

// setup view engine
const app = express();
app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");
app.use("/static", express.static(path.join(__dirname, "../public")));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'",
          "cdnjs.cloudflare.com",
          "fonts.gstatic.com",
          "fonts.googleapis.com",
        ],
      },
    },
  })
);

// setup db
const db = knex(isProd ? dbConfig.production : dbConfig.development);

// default meta for views
const defaultMetas = {
  title: "Haptic - The #BuildInPublic toolkit for your next big thing",
  description:
    "Build, test and learn in public. Get feedback for your product from your audience and grow beyond their expectations.",
  og: {
    title: "Haptic - The #BuildInPublic toolkit for your next big thing",
    image: "https://haptic.so/static/images/landing/social-img.png",
  },
};

// helpers
const isAjaxCall = (req) =>
  req.headers["accept"] && req.headers["accept"].includes("application/json");
const ajaxOnly = (req, res, next) => {
  if (isAjaxCall(req)) next();
  else res.status(400).end("400 Bad Request");
};

// setup routes
app.get("/", (req, res) => {
  res.render("index", {
    meta: defaultMetas,
  });
});

// ajax routes
app.post("/sub", ajaxOnly, express.json(), (req, res) => {
  db("subs")
    .insert({
      email: req.body.email,
      accepted_marketing_mails: req.body.accept_emails,
    })
    .then((result) => {
      res.json({
        ok: 1,
        err: null,
        details: { msg: "Thank you for subscribing. 😍" },
      });
    })
    .catch((err) => {
      if (err.code === dbErrCodes.DUP_CODE)
        res
          .status(400)
          .json({ ok: 0, err: "Email already used. 😱", details: null });

      next(err);
    });
});

// error handler
app.use((err, req, res, next) => {
  console.log("An error occurred.", err);
  if (res.headersSent) return next(err);
  if (isAjaxCall(req))
    return res.json({
      ok: 0,
      err:
        "Something went wrong. 😱 Please, write to me in twitter to resolve this issue for you.",
      details: { err },
    });
  res.status(500);
  res.render("error", { error: err, meta: defaultMetas });
});

// run this bad boy!
app.listen(process.env.PORT);
console.log(process.env.PORT + " is where the magic happens. 🚀");
