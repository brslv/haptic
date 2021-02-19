// load the things we need
const express = require("express");
const path = require("path");
const knex = require("knex");
const dotenv = require("dotenv");
const dbConfig = require("../knexfile");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const Rollbar = require("rollbar");
const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;
const KnexSessionStore = require("connect-session-knex")(expressSession);
const slugify = require("slugify");
const { nanoid } = require("nanoid");
const { flash } = require("express-flash-message");
const posts = require("./posts");

// constants
const HOUR_IN_MS = 3600000;
const IS_DEV = process.env.NODE_ENV === "development";
const IS_PROD = process.env.NODE_ENV === "production";
const SID = "__sid__";
const dbErrCodes = {
  DUP_CODE: "23505",
};
const defaultMetas = {
  title: "Haptic - The #BuildInPublic toolkit for your next big thing",
  description:
    "Build, test and learn in public. Get feedback for your product from your audience and grow beyond their expectations.",
  og: {
    title: "Haptic - The #BuildInPublic toolkit for your next big thing",
    image: "https://haptic.so/static/images/landing/social-img.png",
  },
  twitter: {
    image: "https://haptic.so/static/images/landing/social-img.png",
    image_alt: "Haptic.so social media sharing image",
  },
};

// setup env
const dotenvConfigPath = IS_PROD ? ".env" : ".env.dev";
dotenv.config({ path: dotenvConfigPath });

// setup rollbar
const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

// setup db
const db = knex(IS_PROD ? dbConfig.production : dbConfig.development);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_API_SECRET,
      callbackURL: process.env.TWITTER_API_CALLBACK_URL,
    },
    function(accessToken, refreshToken, profile, done) {
      const twitterData = profile._json;
      db.select()
        .table("users")
        .where({ twitter_id: twitterData.id })
        .first()
        .then((result) => {
          if (!result) {
            db("users")
              .insert({
                bio: twitterData.description,
                twitter_id: twitterData.id,
                twitter_name: twitterData.name,
                twitter_screen_name: twitterData.screen_name,
                twitter_location: twitterData.location,
                twitter_description: twitterData.description,
                twitter_url: twitterData.url,
                twitter_profile_image_url: twitterData.profile_image_url_https,
              })
              .then(() => {
                db.select()
                  .table("users")
                  .first()
                  .then((result) => {
                    done(null, result);
                  })
                  .catch((err) => done(err, null));
              })
              .catch((err) => done(err, null));
          } else {
            // return the user
            done(null, result);
          }
        })
        .catch((err) => {
          return done(err, null);
        });
    }
  )
);

// setup view engine
const app = express();
app.use("/static", express.static(path.join(__dirname, "../public")));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "./views"));
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
if (IS_PROD) app.set("trust proxy", 1);
app.use(
  expressSession({
    name: SID,
    store: new KnexSessionStore({
      knex: db,
      createtable: false,
    }),
    secret: process.env.COOKIES_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: IS_PROD,
      maxAge: HOUR_IN_MS,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash({ sessionKeyName: SID }));

// helpers / middlewares
const isAjaxCall = (req) =>
  req.headers["accept"] && req.headers["accept"].includes("application/json");
const ajaxOnly = (req, res, next) => {
  if (isAjaxCall(req)) next();
  else res.status(400).end("400 Bad Request");
};
const authOnly = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    if (isAjaxCall(req)) {
      return res
        .status(401)
        .json({ ok: 0, err: "Not authorized.", details: null });
    }

    res.status(401).redirect("/login");
  }
};
const guestsOnly = (req, res, next) => {
  if (!req.user) next();
  else res.redirect("/dashboard");
};

// setup routes
app.get("/", (req, res) => {
  res.render("index", { meta: defaultMetas, user: req.user });
});

app.get("/dashboard", authOnly, (req, res) => {
  db("products")
    .select()
    .where({ user_id: req.user.id })
    .then((result) => {
      res.render("dashboard", {
        meta: {
          defaultMetas,
          title: "Dashboard | Haptic",
          og: { title: "Dashboard | Haptic" },
        },
        user: req.user,
        products: result,
      });
    })
    .catch((err) => {
      next(err);
    });
});

app.get("/dashboard/product/:slug", authOnly, (req, res) => {
  return res.redirect(`/dashboard/product/${req.params.slug}/settings`);
});

app.get("/dashboard/product/:slug/posts", authOnly, (req, res, next) => {
  const slug = req.params.slug;
  db.select()
    .table("products")
    .where({ slug })
    .first()
    .then((productResult) => {
      if (!productResult) {
        return res.status(404).render("404", {
          meta: {
            ...defaultMetas,
            title: "Page not found | Haptic",
            og: { ...defaultMetas.og, title: "Page not found | Haptic" },
          },
          user: req.user,
        });
      }

      posts
        .actions({ db, user: req.user })
        .getAllPosts(productResult.id)
        .then((postsResult) => {
          res.render("dashboard/product/posts", {
            meta: {
              ...defaultMetas,
              title: `${productResult.name} | Haptic`,
              og: {
                ...defaultMetas.og,
                title: `${productResult.name} | Haptic`,
              },
            },
            user: req.user,
            product: { ...productResult },
            posts: [...postsResult],
            links: {
              posts: `/dashboard/product/${slug}/posts`,
              settings: `/dashboard/product/${slug}/settings`,
              url: `/p/${slug}`,
            },
          });
        });
    })
    .catch((err) => {
      next(err);
    });
});

app.get(
  "/dashboard/product/:slug/settings",
  authOnly,
  async (req, res, next) => {
    const slug = req.params.slug;
    const flash = {
      success: await req.consumeFlash("success"),
      error: await req.consumeFlash("error"),
    };

    db.select()
      .table("products")
      .where({ slug })
      .first()
      .then((result) => {
        if (!result) {
          return res.status(404).render("404", {
            meta: {
              ...defaultMetas,
              title: "Page not found | Haptic",
              og: { ...defaultMetas.og, title: "Page not found | Haptic" },
            },
            user: req.user,
          });
        }

        res.render("dashboard/product/settings", {
          meta: {
            ...defaultMetas,
            title: `${result.name} | Haptic`,
            og: {
              ...defaultMetas.og,
              title: `${result.name} | Haptic`,
            },
          },
          user: req.user,
          product: { ...result },
          links: {
            posts: `/dashboard/product/${slug}/posts`,
            settings: `/dashboard/product/${slug}/settings`,
            url: `/p/${slug}`,
          },
          form: {
            action: `/dashboard/product/${slug}/settings/update`,
          },
          flash,
        });
      })
      .catch((err) => {
        next(err);
      });
  }
);

app.post(
  "/dashboard/product/:slug/settings/update",
  authOnly,
  (req, res, next) => {
    const slug = req.params.slug;
    // check if the user owns the product
    db("products")
      .select()
      .where({
        slug,
        user_id: req.user.id,
      })
      .then((result) => {
        if (!result) {
          return res.status(404).render("404", {
            meta: {
              ...defaultMetas,
              title: "Page not found | Haptic",
              og: { ...defaultMetas.og, title: "Page not found | Haptic" },
            },
            user: req.user,
          });
        }

        var input = req.body;
        db("products")
          .where({ slug, user_id: req.user.id })
          .update({
            name: input.name,
            description: input.description,
            website: input.website,
            is_public: input.is_public === "on",
            is_listed: input.is_listed === "on",
          })
          .then((result) => {
            if (result) {
              req.flash("success", "Settings updated 🎉").then(() => {
                res.redirect(`/dashboard/product/${slug}/settings`);
              });
            } else {
              req
                .flash("error", "Settings update failed, please retry 🙏")
                .then(() => {
                  res.redirect(`/dashboard/product/${slug}/settings`);
                });
            }
          })
          .catch((err) => next(err));
      });
  }
);

app.get("/dashboard/profile", authOnly, (req, res, next) => {
  return res.render("dashboard/profile", {
    meta: defaultMetas,
    user: req.user,
    form: {
      action: "/dashboard/profile/update",
    },
  });
});

app.get("/p/:slug", (req, res, next) => {
  const slug = req.params.slug;

  db.select(
    "products.id",
    "products.name",
    "products.slug",
    "products.description",
    "products.website",
    "products.is_public",
    "products.is_listed",
    "products.created_at as product_created_at",
    "products.updated_at as product_updated_at",
    "users.id as user_id",
    "users.bio as user_bio",
    "users.twitter_id as user_twitter_id",
    "users.twitter_name as user_twitter_name",
    "users.twitter_screen_name as user_twitter_screen_name",
    "users.twitter_location as user_twitter_location",
    "users.twitter_url as user_twitter_url",
    "users.twitter_profile_image_url as user_twitter_profile_image_url",
    "users.created_at as user_created_at",
    "users.updated_at as user_updated_at"
  )
    .table("products")
    .leftJoin("users", "products.user_id", "users.id")
    .where({ "products.slug": slug })
    .first()
    .then((result) => {
      if (!result) {
        return res.status(404).render("404", {
          meta: {
            ...defaultMetas,
            title: "Page not found | Haptic",
            og: { ...defaultMetas.og, title: "Page not found | Haptic" },
          },
          user: req.user,
        });
      }

      res.render("product", {
        meta: {
          ...defaultMetas,
          title: `${result.name} | Haptic`,
          og: {
            ...defaultMetas.og,
            title: `${result.name} | Haptic`,
          },
        },
        user: req.user,
        product: { ...result },
        links: {
          posts: `/dashboard/product/${slug}/posts`,
          settings: `/dashboard/product/${slug}/settings`,
          url: `/p/${slug}`,
        },
      });
    })
    .catch((err) => {
      next(err);
    });
});

app.get("/login", guestsOnly, (req, res) => {
  res.render("login", { meta: defaultMetas });
});

app.get("/auth/error", (req, res) => res.send("Unknown Error"));

app.get("/auth/twitter", passport.authenticate("twitter"));

app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/auth/error" }),
  function(req, res) {
    req.session.save(function onSessionSave() {
      res.redirect("/dashboard");
    });
  }
);

app.get("/logout", (req, res) => {
  req.logout();
  req.session.destroy(function(err) {
    res.redirect("/");
  });
});

// ajax routes
app.post("/sub", ajaxOnly, express.json(), (req, res, next) => {
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
        return res
          .status(400)
          .json({ ok: 0, err: "Email already used. 😱", details: null });

      next(err);
    });
});

app.post(
  "/product-slug",
  ajaxOnly,
  authOnly,
  express.json(),
  (req, res, next) => {
    let slug = nanoid(6).toLowerCase();
    if (req.body.name) slug = slugify(req.body.name, { lower: true });

    db("products")
      .where({ slug })
      .then((result) => {
        if (result.length) {
          // slug is taken
          slug = `${slug}-${nanoid(6).toLowerCase()}`;
        }

        res.json({
          ok: 1,
          err: null,
          details: { slug },
        });
      })
      .catch((err) => next(err));
  }
);

app.post("/product", ajaxOnly, authOnly, express.json(), (req, res, next) => {
  db("products")
    .insert({
      user_id: req.user.id,
      name: req.body.name,
      slug: req.body.slug.toLowerCase(),
    })
    .returning(["id", "slug"])
    .then((result) => {
      res.json({ ok: 1, err: null, details: { ...result[0] } });
    })
    .catch((err) => {
      if (err.code === dbErrCodes.DUP_CODE)
        return res.status(400).json({
          ok: 0,
          err: "Slug already taken 😕. Please, use another slug.",
          details: null,
        });

      next(err);
    });
});

app.post(
  "/post/:pid/:type",
  ajaxOnly,
  authOnly,
  express.json(),
  (req, res, next) => {
    const types = posts.types;
    const type = req.params.type;
    const pid = req.params.pid;
    const postsActions = posts.actions({ db, user: req.user });

    if (!types.includes(type)) {
      return res
        .status(400)
        .json({ ok: 0, err: `Invalid post type: ${type}. 🧐`, details: null });
    }

    if (isNaN(pid)) {
      return res.status(400).json({
        ok: 0,
        err: `Invalid product id: ${pid}. 🧐 Should be numeric.`,
        details: null,
      });
    }

    if (req.body.text.length < 2) {
      return res.status(400).json({
        ok: 0,
        err: `Invalid text length. Min: 2 symbols.`,
        details: null,
      });
    }

    db("products")
      .select()
      .where({ id: pid })
      .first()
      .then((productResult) => {
        postsActions
          .publish(type, productResult, req.body)
          .then((publishResult) => {
            return postsActions.getPost(type, { postId: publishResult.postId });
          })
          .then((post) => {
            res.json({ ok: 1, err: null, details: { post } });
          })
          .catch((err) => next(err));
      });
  }
);

// error handler
app.use((err, req, res, next) => {
  console.log("An error occurred.", err);
  if (res.headersSent) return next(err);
  if (isAjaxCall(req))
    return res.status(500).json({
      ok: 0,
      err:
        "Something went wrong. 😱 Sorry for the inconvenience. Please, write to me in twitter to resolve this issue for you.",
      details: { err },
    });
  res.status(500);
  res.render("error", { error: err, meta: defaultMetas });
});

// run this bad boy!
app.listen(process.env.PORT);
console.log(process.env.PORT + " is where the magic happens. 🚀");
