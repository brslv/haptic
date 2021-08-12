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
const boosts = require("./boosts");
const products = require("./products");
const comments = require("./comments");
const emails = require("./emails");
const { upload, uploadCover, uploadLogo } = require("./img-upload");
const notifications = require("./notifications");
const bodyParser = require("body-parser");
const { randomBytes } = require("crypto");
const removeMd = require("remove-markdown");
const validateUrl = require("valid-url");
const queues = require("./queues");
const { createBullBoard } = require("bull-board");
const { BullAdapter } = require("bull-board/bullAdapter");
const { dateFmt, loadArticleFile, mdConverter } = require("./utils");
const { attachPaginate } = require("knex-paginate");

const singleUpload = upload.single("image");
const singleCoverUpload = uploadCover.single("image");
const singleLogoUpload = uploadLogo.single("image");

console.log({ env: process.env.NODE_ENV });

// constants
const HOUR_IN_MS = 3600000;
const USER_TYPES = { CREATOR_LITE: 0, CREATOR: 1 };

// env constants
const IS_DEV = process.env.NODE_ENV === "development";
const IS_PROD = process.env.NODE_ENV === "production";
const IS_STAGE = process.env.NODE_ENV === "stage";
const ROOT_URL = process.env.ROOT_URL;

const SID = "__sid__";
const dbErrCodes = {
  DUP_CODE: "23505",
};
const defaultMetas = {
  title: "Haptic - It's how makers build products in public",
  description:
    "Get exposure for your product on a community of makers and creators. We provide the stage. You got the mic.",
  og: {
    title: "Haptic - It's how makers build products in public",
    image: `${ROOT_URL}/static/images/landing/social-image.png`,
  },
  twitter: {
    image_alt: "Haptic.so social media sharing image",
  },
};

// setup env
const dotEnvConfigs = {
  production: ".env",
  development: ".env.dev",
  stage: ".env.stage",
};
const dotenvConfigPath = dotEnvConfigs[process.env.NODE_ENV];
console.log({ dotenvConfigPath });
dotenv.config({ path: dotenvConfigPath });

// setup rollbar
const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

// setup db
const db = knex(dbConfig[process.env.NODE_ENV]);
attachPaginate();

// JOBS / QUEUES
const notificationsQueue = queues.loadNotificationsQueue({ db });
const emailsQueue = queues.loadEmailsQueue({ db, isProd: IS_PROD });
const { router } = createBullBoard([
  new BullAdapter(notificationsQueue.queue),
  new BullAdapter(emailsQueue.queue),
]);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  if (!user || !user.id) return done(null, user);

  // We need to refetch the user every time, in order to
  // get the latest user information from the db.
  db("users")
    .select()
    .where({ id: user.id })
    .first()
    .then((result) => {
      if (result.subscription_deactivation_date !== null)
        result.subscription_deactivation_date = dateFmt(
          Number(result.subscription_deactivation_date),
          "DD MMM, YYYY"
        );
      done(null, result);
    });
});

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_API_SECRET,
      userProfileURL:
        "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
      callbackURL: process.env.TWITTER_API_CALLBACK_URL,
    },
    function(accessToken, refreshToken, profile, done) {
      const profileEmails = profile.emails;
      const twitterData = profile._json;
      db.select()
        .table("users")
        .where({ twitter_id: twitterData.id })
        .first()
        .then((result) => {
          const emailsActions = emails.actions({ db, emailsQueue });
          if (!result) {
            // registration
            const userEmail =
              profileEmails && profileEmails[0] && profileEmails[0].value
                ? profileEmails[0].value
                : undefined;
            db("users")
              .insert({
                bio: twitterData.description,
                slug: twitterData.screen_name,
                email: userEmail,
                twitter_id: twitterData.id,
                twitter_name: twitterData.name,
                twitter_screen_name: twitterData.screen_name,
                twitter_location: twitterData.location,
                twitter_description: twitterData.description,
                twitter_url: twitterData.url,
                twitter_profile_image_url: twitterData.profile_image_url_https,
              })
              .returning("*")
              .then((insertedUser) => {
                if (userEmail) {
                  emailsActions.emailWelcome({
                    email: userEmail,
                    name: twitterData.name,
                  });
                }
                done(null, insertedUser[0]);
              })
              .catch((err) => {
                console.error(err);
                done(err, null);
              });
          } else {
            // login
            // return the user
            db("users")
              .update({
                twitter_profile_image_url: twitterData.profile_image_url_https,
              })
              .where({ id: result.id })
              .returning(["twitter_profile_image_url"])
              .then(([updateResult]) => {
                done(null, {
                  ...result,
                  twitter_profile_image_url:
                    updateResult.twitter_profile_image_url,
                });
              });
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
if (IS_PROD || IS_STAGE) app.set("trust proxy", 1);
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
    sameSite: "lax",
    cookie: {
      secure: IS_PROD || IS_STAGE,
      maxAge: HOUR_IN_MS * 72, // three days
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  // common variables
  res.locals.user = req.user;
  res.locals.USER_TYPES = USER_TYPES;
  res.locals.ROOT_URL = ROOT_URL;
  res.locals.fsStorefrontUrl = process.env.FAST_SPRING_STOREFRONT_URL;
  res.locals.fsAccountUrl = process.env.FAST_SPRING_ACCOUNT_URL;
  next();
});
app.use(flash({ sessionKeyName: SID }));

// helpers / middlewares
const getPageFromQuery = (query) =>
  isNaN(Number(query.page)) || Number(query.page) < 1 ? 1 : Number(query.page);
const predefinedCovers = [
  "https://hpt-assets.s3.eu-central-1.amazonaws.com/cover-1.jpg",
  "https://hpt-assets.s3.eu-central-1.amazonaws.com/cover-2.jpg",
  "https://hpt-assets.s3.eu-central-1.amazonaws.com/cover-3.jpg",
  "https://hpt-assets.s3.eu-central-1.amazonaws.com/cover-4.jpg",
];
const setupCsrf = (req, res, next) => {
  if (req.session.csrf === undefined) {
    req.session.csrf = randomBytes(100).toString("base64"); // convert random data to a string
  }
  res.locals.csrf = req.session.csrf;
  next();
};
app.use(setupCsrf);
const csrfProtected = (req, res, next) => {
  const isAjax = isAjaxCall(req);
  if (!req.body.csrf) {
    if (isAjax)
      return res
        .status(400)
        .json({ ok: 0, err: "No csrf token found.", details: null });
    return res.status(400).send(`No csrf token found.`);
  }

  if (req.body.csrf !== req.session.csrf) {
    if (isAjax)
      return res
        .status(400)
        .json({ ok: 0, err: "Invalid csrf token.", details: null });
    return res.status(400).send("Invalid csrf token.");
  }

  next();
};
const isAjaxCall = (req) =>
  req.headers["accept"] && req.headers["accept"].includes("application/json");
const ajaxOnly = (req, res, next) => {
  if (isAjaxCall(req)) next();
  else res.status(400).end("400 Bad Request");
};
const adminOnly = (req, res, next) => {
  if (
    (req.user && req.user.twitter_screen_name === "Brslv") ||
    req.user.twitter_screen_name === "hapticso"
  ) {
    next();
  } else {
    if (isAjaxCall(req)) {
      return res
        .status(405)
        .json({ ok: 0, err: "Not allowed.", details: null });
    }

    const title = "Page not allowed for guests | Haptic";
    res.status(405).render("not-allowed", {
      meta: {
        ...defaultMetas,
        title,
        og: {
          ...defaultMetas.og,
          title,
        },
      },
    });
  }
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
  else res.redirect("/browse");
};
const loadNotifications = (req, res, next) => {
  if (!req.user) return next();
  const notificationsActions = notifications.actions({ db, user: req.user });
  notificationsActions
    .getAll()
    .then((notificationsResult) => {
      res.locals.notifications = Object.keys(notificationsResult)
        .reduce((acc, n) => {
          return [...acc, ...notificationsResult[n]];
        }, [])
        .sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });

      res.locals.notificationsCount = Object.values(notificationsResult).reduce(
        (acc, curr) => {
          return (acc += curr.length);
        },
        0
      );
      next();
    })
    .catch((err) => {
      next(err);
    });
};
app.use(loadNotifications);
const injectEnv = (req, res, next) => {
  res.locals.env = process.env.NODE_ENV;
  res.locals.isDev = IS_DEV;
  res.locals.isProd = IS_PROD;
  res.locals.isStage = IS_STAGE;
  res.locals.predefinedCovers = predefinedCovers;
  next();
};
app.use(injectEnv);

app.use("/queues", authOnly, adminOnly, router); // @TODO: make admin only

// articles

// shortcodes
const cta = `
<div class="bg-white border border-gray-100 rounded-md shadow-sm p-4 text-center my-8">
  <div class="mx-auto" style="max-width: 38ch;">
    <p class="text-xl md:text-3xl font-bold my-8"> Start building your product in public on Haptic now</p>
    <a href="/pricing" class="btn btn-primary no-underline text-gray-800 text-lg md:text-xl mb-8 inline-block">Take me to my dashboard</a>
  </div>
</div>
  `;

function processArticleShortcodes(content) {
  // process cta
  content = content.replace(/{{-cta-}}/gi, cta);
  return content;
}

app.get("/how-to-build-in-public", async (req, res) => {
  const title = "How to build in public";
  const description =
    "A framework for building products in public and engaging with your audience.";
  loadArticleFile("how-to-build-in-public.md")
    .then((content) => {
      return res.render("article", {
        meta: {
          ...defaultMetas,
          title: `${title} | Haptic`,
          description,
          og: {
            ...defaultMetas.og,
            image: `${ROOT_URL}/static/images/articles/how-to-build-in-public/social-image.png`,
            description,
          },
        },
        articleImage: `${ROOT_URL}/static/images/articles/how-to-build-in-public/article-image.jpg`,
        title,
        description,
        content: mdConverter.makeHtml(content),
        sideSectionTitle: "Insights",
        sideSectionContent: mdConverter.makeHtml(`
- Make sure you have a clear and strong purpose.
- Pick the right audiences.
- Diversify your audiences based on your purpose.
- Be authentic.
- Share learnings, stats, milestones, plans, etc.
- Be active, but don't stress it too much.
- Choose a platform.
- <a href="/login">Use Haptic to narrate a coherent and tractable story.</a>
        `),
        cta,
        suggest: [
          {
            link: "/20-plus-build-in-public-post-ideas-with-examples",
            title: "20+ build in public post ideas (with examples)",
          },
        ],
      });
    })
    .catch((err) => {
      throw err;
    });
});

app.get(
  "/20-plus-build-in-public-post-ideas-with-examples",
  async (req, res) => {
    const title = "20+ build in public post ideas (with examples)";
    const description =
      "You can use them as a source of inspiration, as a checklist or simply as a way to further explore the space of creating content for the narrative around your startup or idea.";
    loadArticleFile("20-plus-build-in-public-post-ideas-with-examples.md")
      .then((content) => {
        return res.render("article", {
          meta: {
            ...defaultMetas,
            title: `${title} | Haptic`,
            description,
            og: {
              ...defaultMetas.og,
              image: `${ROOT_URL}/static/images/articles/20-plus-build-in-public-post-ideas-with-examples/social-image.png`,
              description,
            },
          },
          articleImage: `${ROOT_URL}/static/images/articles/20-plus-build-in-public-post-ideas-with-examples/article-image.jpg`,
          title,
          description,
          content: mdConverter.makeHtml(processArticleShortcodes(content)),
          sideSectionTitle: "Insights",
          sideSectionContent: mdConverter.makeHtml(`
- Daily reflections
- Weekly/monthly/yearly reviews
- Hardships
- Roadmaps, next steps and conquering the world
- Ask and get feedback - polls and surveys
- Shoutouts - mention people and groups that helped you
- Marketing endeavors
- Acquisition strategies
- Retention strategies
- Teach it
- What keeps you motivated to build?
- The ways you manage to stay productive
- Share your resources
- Hiring
- Design decisions
- Technical decisions
- Idea validation, PMF, Customer development
- The philosophy behind your product
- Mutual feadback
- Personal challanges - gonna do x for y days 
- Thought experiements - what if's?
- Changelogs
        `),
          cta,
          suggest: [
            {
              link: "/how-to-build-in-public",
              title: "How to build in public",
            },
          ],
        });
      })
      .catch((err) => {
        throw err;
      });
  }
);

// setup routes
app.get("/", (req, res) => {
  if (req.user) {
    return res.redirect("/browse");
  }
  res.render("index", { meta: defaultMetas, isHomepage: true });
});

app.get("/pricing", (req, res) => {
  const title = "Pricing | Haptic";
  const description = "Haptic's pricing model details";

  res.render("pricing", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: {
        ...defaultMetas.og,
        title,
        description,
      },
    },
    isHomepage: true,
  });
});

app.get("/publish", authOnly, (req, res) => {
  const productsActions = products.actions({ db, user: req.user });
  productsActions.getMyProducts().then((myProductsResult) => {
    res.render("publish", {
      meta: { ...defaultMetas },
      myProducts: myProductsResult,
    });
  });
});

app.get("/browse", (req, res) => {
  const productsActions = products.actions({ db, user: req.user });
  const page = getPageFromQuery(req.query);
  const postsActions = posts.actions({ db, user: req.user });
  const order = posts.BROWSABLE_ORDER.NEWEST;

  productsActions
    .getBrowsableProducts({
      order: products.BROWSABLE_ORDER.NEWEST,
      limit: 8,
    })
    .then((newestProductsResult) => {
      return productsActions
        .getRecentlyUpdatedProducts({
          limit: 8,
        })
        .then((recentlyUpdatedProductsResult) => {
          return db("users")
            .select(
              "twitter_name",
              "slug",
              "bio",
              "twitter_profile_image_url",
              "type"
            )
            .orderBy("id", "desc")
            .limit(10)
            .then((usersResponse) => {
              const title = "Browse | Haptic";
              const description =
                "Get inspired by other build in public makers by browsing their public updates and products";

              res.render("browse", {
                meta: {
                  ...defaultMetas,
                  title,
                  description,
                  og: {
                    ...defaultMetas.og,
                    title,
                    description,
                  },
                },
                page: page,
                newestUsers: usersResponse,
                newestProducts: newestProductsResult,
                recentlyUpdatedProducts: recentlyUpdatedProductsResult,
              });
            });
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
});

app.get("/frame/browse/posts", (req, res) => {
  const params = req.query;
  const productsActions = products.actions({ db, user: req.user });
  const page = getPageFromQuery(req.query);
  const postsActions = posts.actions({ db, user: req.user });
  const order = posts.BROWSABLE_ORDER.NEWEST;
  const hidePagination = params.hidePagination === "true";
  const perPage =
    params.perPage && !isNaN(Number(params.perPage))
      ? Number(params.perPage)
      : 18;
  postsActions
    .getBrowsablePosts({
      order,
      paginationData: {
        ...posts.DEFAULT_PAGINATION_DATA,
        perPage,
        currentPage: page,
      },
    })
    .then((postsResult) => {
      const title = "Browse public updates | Haptic";
      const description =
        "Browse public updates by other makers, who build their products in public";
      res.render("frame-browse", {
        meta: {
          ...defaultMetas,
          title,
          description,
          og: {
            ...defaultMetas.og,
            title,
            description,
          },
        },
        pagination: postsResult.pagination,
        createPaginationLink: (n) => `/browse?page=${n}`,
        hidePagination,
        posts: [
          ...postsResult.data.map((post) => {
            const strippedMdText = removeMd(post.text);
            const twitterText =
              strippedMdText.length > 180
                ? strippedMdText.substring(0, 180) + "..."
                : strippedMdText;
            return {
              ...post,
              text_md: post.text,
              twitter_text: twitterText,
              text: mdConverter.makeHtml(post.text),
              details_md: post.type === "poll" ? post.details : undefined,
              details:
                post.type === "poll"
                  ? mdConverter.makeHtml(post.details)
                  : undefined,
              created_at_formatted: dateFmt(post.created_at),
            };
          }),
        ],
      });
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
});

app.get("/products", (req, res) => {
  const ord = req.query.ord;
  const PRODUCTS_BROWSABLE_ORDER = products.BROWSABLE_ORDER;

  const productsActions = products.actions({ db, user: req.user });
  const order =
    ord === "newest"
      ? PRODUCTS_BROWSABLE_ORDER.NEWEST
      : PRODUCTS_BROWSABLE_ORDER.BOOSTS;
  productsActions
    .getBrowsableProducts({
      order,
    })
    .then((result) => {
      let title = "Products | Haptic";
      let description =
        "Browse products that are being built publicly on Haptic.";
      if (order === PRODUCTS_BROWSABLE_ORDER.NEWEST) {
        title = "Newest Products | Haptic";
        description =
          "Browse the newest products that are being built publicly on Haptic.";
      }
      if (order === PRODUCTS_BROWSABLE_ORDER.BOOSTS) {
        title = "Top Products | Haptic";
        description =
          "Browse the top products that are being built publicly on Haptic.";
      }

      res.render("products", {
        meta: {
          ...defaultMetas,
          title,
          description,
          og: {
            ...defaultMetas.og,
            title,
            description,
          },
        },
        products: result,
        type: "products",
        ord: ord === "newest" ? ord : "boosts",
      });
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
});

app.get("/terms-of-service", (req, res) => {
  const title = "Terms of service | Haptic";
  const description = "Terms of service on Haptic";
  res.render("legal/terms-of-service.pug", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
  });
});

app.get("/privacy-policy", (req, res) => {
  const title = "Privacy policy | Haptic";
  const description = "Privacy policy on Haptic";
  res.render("legal/privacy-policy.pug", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
  });
});

app.get("/cookie-policy", (req, res) => {
  const title = "Cookie policy | Haptic";
  const description = "Cookie policy on Haptic";
  res.render("legal/cookie-policy.pug", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
  });
});

app.get("/dashboard", authOnly, async (req, res, next) => {
  const flash = {
    success: await req.consumeFlash("success"),
  };
  const productsActions = products.actions({ db, user: req.user });
  const title = "Products | " + req.user.twitter_name + " | Haptic";
  const description = "Products of " + req.user.twitter_name;

  productsActions
    .getMyProducts()
    .then((result) => {
      res.render("dashboard", {
        meta: {
          defaultMetas,
          title,
          description,
          og: { title, description },
        },
        products: result,
        canCreateProducts:
          req.user.type === USER_TYPES.CREATOR || result.length === 0,
        flash,
      });
    })
    .catch((err) => {
      next(err);
    });
});

app.get("/collections", authOnly, (req, res, next) => {
  const title = "Collections | " + req.user.twitter_name + " | Haptic";
  const description = "Collected products by " + req.user.twitter_name;
  db.select(
    "collections.id",
    "collections.created_at",
    "products.name",
    "products.description",
    "products.slug"
  )
    .table("collections")
    .innerJoin("products", "collections.product_id", "products.id")
    .where({ "collections.user_id": req.user.id })
    .then((result) => {
      res.render("collections", {
        meta: {
          ...defaultMetas,
          title,
          description,
          og: { ...defaultMetas.og, title, description },
        },
        collections: result,
      });
    })
    .catch((err) => {
      next(err);
    });
});

app.get("/dashboard/product/:slug", authOnly, (req, res) => {
  return res.redirect(`/dashboard/product/${req.params.slug}/settings`);
});

// app.get("/dashboard/product/:slug/posts", authOnly, (req, res, next) => {
//   const slug = req.params.slug;
//   const page = getPageFromQuery(req.query);
//   const productsActions = products.actions({ db, user: req.user });
//   productsActions
//     .getProductBySlug({ slug, user_id: req.user.id })
//     .then((productResult) => {
//       if (!productResult) {
//         return res.status(404).render("404", {
//           meta: {
//             ...defaultMetas,
//             title: "Page not found | Haptic",
//             og: { ...defaultMetas.og, title: "Page not found | Haptic" },
//           },
//         });
//       }
//
//       return posts
//         .actions({ db, user: req.user })
//         .getAllPosts(productResult.id, {
//           withComments: true,
//           paginationData: {
//             ...posts.DEFAULT_PAGINATION_DATA,
//             perPage: 5,
//             currentPage: page,
//           },
//         })
//         .then((postsResult) => {
//           return db("product_tools")
//             .where({ product_id: productResult.id })
//             .then((toolsResult) => {
//               const title = `Product | ${productResult.name} | Haptic`;
//               const description = `Product dashboard - ${productResult.name}`;
//               res.render("dashboard/product/posts", {
//                 meta: {
//                   ...defaultMetas,
//                   title,
//                   description,
//                   og: {
//                     ...defaultMetas.og,
//                     title,
//                     description,
//                   },
//                 },
//                 product: { ...productResult },
//                 tools: [...toolsResult],
//                 pagination: postsResult.pagination,
//                 createPaginationLink: (n) =>
//                   `/dashboard/product/${slug}/posts?page=${n}`,
//                 posts: [
//                   ...postsResult.data.map((post) => {
//                     const strippedMdText = removeMd(post.text);
//                     const twitterText =
//                       strippedMdText.length > 180
//                         ? strippedMdText.substring(0, 180) + "..."
//                         : strippedMdText;
//                     return {
//                       ...post,
//                       text_md: post.text,
//                       twitter_text: twitterText,
//                       text: mdConverter.makeHtml(post.text),
//                       details_md:
//                         post.type === "poll" ? post.details : undefined,
//                       details:
//                         post.type === "poll"
//                           ? mdConverter.makeHtml(post.details)
//                           : undefined,
//                       created_at_formatted: dateFmt(post.created_at),
//                     };
//                   }),
//                 ],
//                 links: {
//                   posts: `/dashboard/product/${slug}/posts`,
//                   settings: `/dashboard/product/${slug}/settings`,
//                   url: `/p/${slug}`,
//                 },
//               });
//             });
//         });
//     })
//     .catch((err) => {
//       next(err);
//     });
// });

app.get(
  "/dashboard/product/:slug/settings",
  authOnly,
  async (req, res, next) => {
    const slug = req.params.slug;
    const flash = {
      success: await req.consumeFlash("success"),
      error: await req.consumeFlash("error"),
      data: await req.consumeFlash("data"),
    };
    const productsActions = products.actions({ db, user: req.user });

    productsActions
      .getProductBySlug({ slug, user_id: req.user.id })
      .then((result) => {
        if (!result) {
          return res.status(404).render("404", {
            meta: {
              ...defaultMetas,
              title: "Page not found | Haptic",
              og: { ...defaultMetas.og, title: "Page not found | Haptic" },
            },
          });
        }

        const title = `Settings | ${result.name} | Haptic`;
        const description = `Product settings - ${result.name}`;

        res.render("dashboard/product/settings", {
          meta: {
            ...defaultMetas,
            title,
            description,
            og: {
              ...defaultMetas.og,
              title,
              description,
            },
          },
          product: { ...result },
          links: {
            posts: `/dashboard/product/${slug}/posts`,
            settings: `/dashboard/product/${slug}/settings`,
            url: `/p/${slug}`,
          },
          form: {
            action: `/dashboard/product/${slug}/settings/update`,
            delete: {
              action: `/dashboard/product/${slug}/delete`,
            },
          },
          predefinedCovers,
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
  csrfProtected,
  (req, res, next) => {
    const slug = req.params.slug;
    const productsActions = products.actions({ db, user: req.user });
    const input = req.body;
    // check if the user owns the product

    // validate
    let errors = {};
    if (input.website.length && !validateUrl.isWebUri(input.website)) {
      errors.website = {
        msg: 'URL must start with "http://" or "https://"',
        val: input.website,
      };
    }

    if (input.description && input.description.length > 280) {
      errors.description = {
        msg: "Description is too long (280 symbols max)",
        val: input.description,
      };
    }

    if (Object.keys(errors).length) {
      return req.flash("data", { errors }).then(() => {
        res
          .set(`Location`, `/dashboard/product/${slug}/settings`)
          .sendStatus(303);
      });
    }

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
          });
        }

        delete input.csrf;

        productsActions
          .updateProduct({ slug, input })
          .then((result) => {
            if (result) {
              req.flash("success", "Settings updated 🎉").then(() => {
                res
                  .set(`Location`, `/dashboard/product/${slug}/settings`)
                  .sendStatus(303);
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

app.post(
  "/dashboard/product/:slug/delete",
  authOnly,
  csrfProtected,
  (req, res, next) => {
    const slug = req.params.slug;
    const user = req.user;
    const productsActions = products.actions({ db, user: req.user });
    productsActions
      .delProduct({ slug })
      .then((result) => {
        if (result) {
          req.flash("success", "Product deleted ✅").then(() => {
            res.set("Location", "/dashboard").sendStatus(303);
          });
        }
      })
      .catch((err) => {
        next(err);
      });
  }
);

app.get("/dashboard/profile", authOnly, async (req, res, next) => {
  const flash = {
    success: await req.consumeFlash("success"),
    error: await req.consumeFlash("error"),
    data: await req.consumeFlash("data"),
  };
  const title = `Profile | ${req.user.twitter_name} | Haptic`;
  const description = `Profile of ${req.user.twitter_name}`;
  return res.render("dashboard/profile", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
    form: {
      action: "/dashboard/profile/update",
    },
    flash,
  });
});

app.post(
  "/dashboard/profile/update",
  authOnly,
  csrfProtected,
  (req, res, next) => {
    const data = req.body;
    const userId = req.user.id;

    if (data.website !== "" && !validateUrl.isWebUri(data.website)) {
      let errors = {
        website: {
          msg: 'URL must start with "http://" or "https://"',
          val: data.website,
        },
      };

      return req.flash("data", { errors }).then(() => {
        res.set(`Location`, `/dashboard/profile`).sendStatus(303);
      });
    }

    db("users")
      .update({
        email: data.email,
        bio: data.bio,
        website: data.website,
        email_comments: data.email_comments === "on",
      })
      .where({ id: userId })
      .then((result) => {
        if (result) {
          req.flash("success", "Profile updated 🎉").then(() => {
            res.set(`Location`, `/dashboard/profile`).sendStatus(303);
          });
        } else {
          req
            .flash("error", "Something went wrong, please try again.")
            .then(() => {
              res.set(`Location`, `/dashboard/profile`).sendStatus(303);
            });
        }
      });
  }
);

app.get("/u/:slug", (req, res, next) => {
  const slug = req.params.slug;
  const productsActions = products.actions({ db, user: req.user });
  db("users")
    .select(
      "id",
      "bio",
      "type",
      "website",
      "twitter_name",
      "twitter_screen_name",
      "twitter_profile_image_url",
      "created_at"
    )
    .where({ slug })
    .first()
    .then((userResult) => {
      if (!userResult) {
        return res.status(404).render("404", {
          meta: {
            ...defaultMetas,
            title: "Page not found | Haptic",
            og: { ...defaultMetas.og, title: "Page not found | Haptic" },
          },
        });
      }

      productsActions
        .getBrowsableProducts({
          order: products.BROWSABLE_ORDER.NEWEST,
          userId: userResult.id,
        })
        .then((productsResult) => {
          const title = `${userResult.twitter_name} | User profile on Haptic`;
          const description = `Public profile of ${userResult.twitter_name} on Haptic`;
          res.render("user", {
            meta: {
              ...defaultMetas,
              title,
              description,
              og: { ...defaultMetas.og, title, description },
              description: userResult.bio,
            },
            data: {
              ...userResult,
              created_at_formatted: dateFmt(userResult.created_at),
            },
            products: productsResult,
          });
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    })
    .catch((err) => {
      console.log("err", err);
      throw err;
    });
});

app.get("/frame/p/:slug", (req, res, next) => {
  const slug = req.params.slug;
  const page = getPageFromQuery(req.query);
  const postsActions = posts.actions({ db, user: req.user });
  const boostsActions = boosts.actions({ db });

  db.select(
    "products.id",
    "products.name",
    "products.slug",
    "products.description",
    "products.website",
    "products.is_public",
    "products.is_listed",
    "products.cover_image_url",
    "products.logo_url",
    "products.created_at as product_created_at",
    "products.updated_at as product_updated_at",
    "users.id as user_id",
    "users.bio as user_bio",
    "users.slug as user_slug",
    "users.type as user_type",
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
        });
      }

      if (!result.is_public && (!req.user || req.user.id !== result.user_id)) {
        return res.render("private-product", {
          meta: {
            ...defaultMetas,
            title: "Private product | Haptic",
            og: { ...defaultMetas.og, title: "Private product | Haptic" },
          },
        });
      }

      return postsActions
        .getAllPosts(result.id, {
          withComments: true,
          paginationData: {
            ...posts.DEFAULT_PAGINATION_DATA,
            perPage: 5,
            currentPage: page,
          },
        })
        .then(({ data: postsResult, pagination }) => {
          res.render("frame-product", {
            meta: {
              ...defaultMetas,
              title: `${result.name} | Haptic`,
              description: result.description,
              og: {
                ...defaultMetas.og,
                title: `${result.name} | Haptic`,
                description: result.description,
              },
            },
            predefinedCovers,
            product: { ...result },
            posts: [
              ...postsResult.map((post) => {
                const strippedMdText = removeMd(post.text);
                const twitterText =
                  strippedMdText.length > 180
                    ? strippedMdText.substring(0, 180) + "..."
                    : strippedMdText;
                return {
                  ...post,
                  text_md: post.text,
                  twitter_text: twitterText,
                  text: mdConverter.makeHtml(post.text),
                  details_md: post.type === "poll" ? post.details : undefined,
                  details:
                    post.type === "poll"
                      ? mdConverter.makeHtml(post.details)
                      : undefined,
                  created_at_formatted: dateFmt(post.created_at),
                };
              }),
            ],
            pagination,
            createPaginationLink: (n) => `/p/${slug}?page=${n}`,
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

app.get("/p/:slug", (req, res, next) => {
  const slug = req.params.slug;
  const page =
    isNaN(Number(req.query.page)) || Number(req.query.page) < 1
      ? 1
      : Number(req.query.page);
  const postsActions = posts.actions({ db, user: req.user });
  const boostsActions = boosts.actions({ db });

  db.select(
    "products.id",
    "products.name",
    "products.slug",
    "products.description",
    "products.website",
    "products.is_public",
    "products.is_listed",
    "products.cover_image_url",
    "products.logo_url",
    "products.created_at as product_created_at",
    "products.updated_at as product_updated_at",
    "users.id as user_id",
    "users.bio as user_bio",
    "users.slug as user_slug",
    "users.type as user_type",
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
        });
      }

      if (!result.is_public && (!req.user || req.user.id !== result.user_id)) {
        return res.render("private-product", {
          meta: {
            ...defaultMetas,
            title: "Private product | Haptic",
            og: { ...defaultMetas.og, title: "Private product | Haptic" },
          },
        });
      }

      return boostsActions.getProductBoosts(result.id).then((boostsResult) => {
          res.render("product", {
            meta: {
              ...defaultMetas,
              title: `${result.name} | Haptic`,
              description: result.description,
              og: {
                ...defaultMetas.og,
                title: `${result.name} | Haptic`,
                description: result.description,
              },
            },
            predefinedCovers,
            product: { ...result },
            page: page,
            boosts: boostsResult,
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

app.get("/p/:slug/:postId", (req, res, next) => {
  const postsActions = posts.actions({ db, user: req.user });
  const slug = req.params.slug;
  const postId = req.params.postId;
  if (isNaN(postId)) {
    return res.status(404).render("404", {
      meta: {
        ...defaultMetas,
        title: "Page not found | Haptic",
        og: { ...defaultMetas.og, title: "Page not found | Haptic" },
      },
    });
  }

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
    "users.slug as user_slug",
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
    .then((productResult) => {
      if (!productResult) {
        return res.status(404).render("404", {
          meta: {
            ...defaultMetas,
            title: "Page not found | Haptic",
            og: { ...defaultMetas.og, title: "Page not found | Haptic" },
          },
        });
      }

      if (
        !productResult.is_public &&
        (!req.user || req.user.id !== productResult.user_id)
      ) {
        return res.render("private-product", {
          meta: {
            ...defaultMetas,
            title: "Private product | Haptic",
            og: { ...defaultMetas.og, title: "Private product | Haptic" },
          },
        });
      }

      return postsActions
        .getPost(posts.UNKNOWN_TYPE, { postId }, { withComments: true })
        .then((result) => {
          if (!result) {
            return res.status(404).render("404", {
              meta: {
                ...defaultMetas,
                title: "Page not found | Haptic",
                og: { ...defaultMetas.og, title: "Page not found | Haptic" },
              },
            });
          }

          // resolve title
          let title = "";
          if (result.type === "text") {
            title = result.text;
          }
          if (result.type === "poll") {
            title = result.question;
          }
          title = title.length > 100 ? title.slice(0, 100) + "..." : title;

          // setup meta tags
          const ogTags = {
            ...defaultMetas.og,
            title: `${title} | ${productResult.name}`,
            description: productResult.description || undefined,
          };
          if (result.image_url) ogTags.image = result.image_url;

          const strippedMdText = removeMd(
            result.type === "text" ? result.text : result.question
          );
          const twitterText =
            strippedMdText.length > 180
              ? strippedMdText.substring(0, 180) + "..."
              : strippedMdText;

          const finalPost = {
            ...result,
            twitter_text: twitterText,
            created_at_formatted: dateFmt(result.created_at),
          };
          if (finalPost.type === "text") {
            finalPost.text = mdConverter.makeHtml(result.text);
          }
          if (finalPost.type === "poll") {
            finalPost.details_md = result.details;
            finalPost.details = mdConverter.makeHtml(result.details);
          }

          return res.render("post", {
            meta: {
              ...defaultMetas,
              title: `${title} | ${productResult.name}`,
              description: productResult.description || undefined,
              author: productResult.user_twitter_name,
              og: ogTags,
            },
            product: productResult,
            post: finalPost,
          });
        })
        .catch((err) => {
          next(err);
        });
    })
    .catch((err) => {
      next(err);
    });
});

app.get("/notifications", authOnly, async (req, res, next) => {
  const flash = {
    success: await req.consumeFlash("success"),
  };
  const title = "Notifications | " + req.user.twitter_name + " | Haptic";
  const description = `Notifications of ${req.user.twitter_name} on Haptic`;
  res.render("notifications", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
    flash,
  });
});

app.post(
  "/mark-notifications-read",
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const notificationsActions = notifications.actions({ db, user: req.user });
    notificationsActions
      .readAll()
      .then((result) => {
        req.flash("success", "Notifications cleared 🎉").then(() => {
          res.redirect(`/notifications`);
        });
      })
      .catch((err) => {
        next(err);
      });
  }
);

app.get("/login", guestsOnly, (req, res) => {
  const title = "Haptic | Login";
  const description = "Login on Haptic";

  res.render("login", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
    creator: req.query && req.query.creator === "true",
  });
});

app.get("/auth/error", (req, res) => res.send("Unknown Error"));

app.get(
  "/auth/twitter",
  function(req, res, next) {
    req.session.creator = req.query.creator;
    next();
  },
  passport.authenticate("twitter")
);

app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/auth/error" }),
  function(req, res) {
    req.session.save(function onSessionSave() {
      if (req.session.creator) {
        res.redirect("/checkout");
      } else {
        const productsActions = products.actions({ db, user: req.user });
        productsActions.getMyProducts().then((myProductsResult) => {
          if (!myProductsResult.length) {
            res.redirect("/dashboard");
          } else {
            res.redirect("/");
          }
        });
      }
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
app.get(
  "/edit-post-data/:id",
  authOnly,
  ajaxOnly,
  express.json(),
  (req, res, next) => {
    const postActions = posts.actions({ db, user: req.user });
    const id = req.params.id;
    const isNum = (n) => !isNaN(Number(n));
    if (!isNum(id)) {
      res.status(400).json({
        ok: 0,
        err: "Invalid post id.",
        details: null,
      });
    }

    postActions
      .getPost(posts.UNKNOWN_TYPE, { postId: id, userId: req.user.id })
      .then((postResult) => {
        if (!postResult || !postResult.id) {
          return res.status(400).json({
            ok: 0,
            err: "Not authorized to edit this post.",
            details: null,
          });
        }

        res.json({ ok: 1, err: null, details: { post: postResult } });
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
  }
);

app.post(
  "/comment",
  authOnly,
  ajaxOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const data = req.body;
    const commentData = {
      commentAuthorId: req.user.id,
      postId: data.postId,
      content: data.content,
    };
    const commentsActions = comments.actions({ user: req.user, db });
    const emailsActions = emails.actions({ db, emailsQueue });

    function enqueueCommentNotification(_commentData) {
      return notificationsQueue.jobs.commentNotification(
        _commentData,
        req.user
      );
    }

    function enqueueCommentNotificationToPostAuthor(_commentData) {
      if (_commentData.userId === _commentData.commentAuthorId) {
        // post author is commenting on his own post, skip notification
        return Promise.resolve(_commentData);
      } else {
        return enqueueCommentNotification(_commentData);
      }
    }

    commentsActions.addComment(commentData).then((commentId) => {
      commentsActions.getComments(data.postId).then((allCommentsInPost) => {
        let queuedNotifications = [];
        let queuedEmails = [];

        // set notifications for the author of the post
        enqueueCommentNotificationToPostAuthor({
          ...commentData,
          commentId,
          userId: data.postAuthorId,
        })
          .then(() => {
            return queuedNotifications.push(data.postAuthorId);
          })
          .then(() => {
            // user commented on his own post
            if (commentData.commentAuthorId === data.postAuthorId) return;

            // send a comment email to the post author
            return db("users")
              .select("email")
              .where("id", data.postAuthorId)
              .first()
              .then((postAuthor) => {
                const postAuthorEmail = postAuthor.email;

                emailsActions.emailComment({
                  emailTo: postAuthorEmail,
                  commentData,
                });
                queuedEmails.push(postAuthorEmail);

                return true;
              })
              .catch((err) => {
                console.log(err);
                next(err);
              });
          })
          .then(() => {
            let queuePromises = [];
            // set notifications for all of the users participating in the comments of this post
            allCommentsInPost.forEach((commentInPost) => {
              const commentAuthorId = commentInPost.user_id;
              const commentAuthorEmail = commentInPost.author_email;
              const commentAuthorName = commentInPost.author_twitter_name;

              // enqueue comment email
              // if the email is not queued and the current comment author is not the author that commented (skips sending emails to the user that has just left a comment)
              if (
                queuedEmails.indexOf(commentAuthorEmail) === -1 &&
                commentAuthorId !== commentData.commentAuthorId
              ) {
                queuePromises.push(
                  emailsActions.emailComment({
                    emailTo: commentAuthorEmail,
                    commentData,
                  })
                );
                queuedEmails.push(commentAuthorEmail);
              }

              // enqueue comment notification
              if (
                queuedNotifications.indexOf(Number(commentInPost.user_id)) !==
                  -1 ||
                Number(commentData.commentAuthorId) ===
                  Number(commentInPost.user_id)
              )
                return;

              queuePromises.push(
                enqueueCommentNotification({
                  ...commentData,
                  commentId,
                  userId: commentAuthorId,
                })
              );
              queuedNotifications.push(commentInPost.user_id);
            });
            return queuePromises;
          })
          .then((queuePromises) => {
            return Promise.resolve(queuePromises);
          })
          .then(() => {
            return res.json({
              ok: 1,
              err: null,
              details: { ...commentData, id: commentId },
            });
          })
          .catch((err) => {
            console.log("err", err);
            throw err;
          });
      });
    });
  }
);

app.post("/sub", ajaxOnly, express.json(), (req, res, next) => {
  db("subs")
    .insert({
      email: req.body.email,
      accepted_marketing_mails: true, // previously it was a checkbox -> req.body.accept_emails,
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
        return res.status(400).json({
          ok: 0,
          err: "Email has been already used. 😱",
          details: null,
        });

      next(err);
    });
});

app.post(
  "/product-slug",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    let slug = nanoid(6).toLowerCase();
    if (req.body.name)
      slug = slugify(req.body.name, { lower: true, remove: /[\.]+/g });

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

app.post(
  "/product",
  express.json(),
  csrfProtected,
  ajaxOnly,
  authOnly,
  (req, res, next) => {
    db("products")
      .insert({
        user_id: req.user.id,
        name: req.body.name,
        slug: req.body.slug.replace(/[\. ]+/g, "-").toLowerCase(),
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
  }
);

app.post(
  "/post/:id/boost",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const id = req.params.id;
    const user = req.user;
    const notificationsActions = notifications.actions({ db, user });

    db.table("post_boosts")
      .insert({ post_id: id, user_id: user.id })
      .then((boostResult) => {
        return notificationsActions
          .add(notifications.typesMap.POST_BOOSTS_TYPE, { post_id: id })
          .then((notificationsResult) => {
            return db("post_boosts")
              .select("id")
              .where({ post_id: id })
              .then((allBoostsResult) => {
                res.json({
                  ok: 1,
                  err: null,
                  details: { boosts: allBoostsResult },
                });
              });
          });
      })
      .catch((err) => {
        if (err.code === dbErrCodes.DUP_CODE)
          return res.status(400).json({
            ok: 0,
            err: "You've already boosted this post.",
            details: null,
          });
        next(err);
      });
  }
);

app.post(
  "/comment/:id/boost",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const cid = req.params.id;
    const user = req.user;
    const notificationsActions = notifications.actions({ db, user });

    if (isNaN(cid)) {
      return res.status(400).json({
        ok: 0,
        err: `Invalid product id: ${cid}. 🧐 Should be numeric.`,
        details: null,
      });
    }

    db.table("comment_boosts")
      .insert({ comment_id: cid, user_id: user.id })
      .then((boostResult) => {
        return notificationsActions.add(
          notifications.typesMap.COMMENT_BOOSTS_TYPE,
          { comment_id: cid }
        );
      })
      .then((notificationsResult) => {
        return db("comment_boosts")
          .select("id")
          .where({ comment_id: cid });
      })
      .then((allBoostsResult) => {
        res.json({
          ok: 1,
          err: null,
          details: { boosts: allBoostsResult },
        });
      })
      .catch((err) => {
        if (err.code === dbErrCodes.DUP_CODE)
          return res.status(400).json({
            ok: 0,
            err: "You've already boosted this comment.",
            details: null,
          });
        next(err);
      });
  }
);

app.post(
  "/post/:pid/:type",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const types = posts.types;
    const type = req.params.type;
    const pid = req.params.pid;

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

    if (type === posts.TEXT_TYPE) {
      return handleTextType(pid, req, res, next);
    } else if (type === posts.POLL_TYPE) {
      return handlePollType(pid, req, res, next);
    }
  }
);

function handleTextType(pid, req, res, next) {
  const postsActions = posts.actions({ db, user: req.user });
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
        .publish(posts.TEXT_TYPE, productResult, req.body)
        .then((post) => {
          res.json({ ok: 1, err: null, details: { post } });
        })
        .catch((err) => next(err));
    });
}

function handlePollType(pid, req, res, next) {
  const postsActions = posts.actions({ db, user: req.user });

  // res.json({ ok: 1, err: null, details: {} });

  // validations
  const data = req.body;
  // if (data.question.length < 10) {
  //   return res.status(400).json({
  //     ok: 0,
  //     err: `Invalid question length. Min: 10 symbols.`,
  //     details: null,
  //   });
  // }
  // if (data.options.length < 2) {
  //   return res.status(400).json({
  //     ok: 0,
  //     err: `Provide at least 2 options.`,
  //     details: null,
  //   });
  // }

  // insert
  db("products")
    .select()
    .where({ id: pid })
    .first()
    .then((productResult) => {
      postsActions
        .publish(posts.POLL_TYPE, productResult, data)
        .then((post) => {
          // respond
          // console.log({ post });
          res.json({ ok: 1, err: null, details: { post } });
        })
        .catch((err) => {
          console.log(err);
          next(err);
        });
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
}

app.post(
  "/vote",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const data = req.body;
    const postsActions = posts.actions({ db, user: req.user });

    if (!data.post_id || !data.option_id || isNaN(Number(data.option_id))) {
      return res.status(400).json({
        ok: 0,
        err: `Invalid vote input.`,
        details: null,
      });
    }

    postsActions
      .vote(data.post_id, data.option_id)
      .then((result) => {
        const id = result[0];
        if (!id) {
          return res.status(400).json({
            ok: 0,
            err: "Couldn't process your vote. Please, try again in a minute.",
            details: null,
          });
        }

        postsActions
          .getPost(posts.POLL_TYPE, { postId: data.post_id })
          .then((pollResult) => {
            res.json({ ok: 1, err: null, details: { poll: pollResult } });
          });
      })
      .catch((err) => {
        console.log(err);
        if (err.code === dbErrCodes.DUP_CODE)
          return res.status(400).json({
            ok: 0,
            err: "You've already voted in this poll.",
            details: null,
          });

        next(err);
      });
  }
);

// update post
app.post(
  "/post/:pid",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const pid = req.params.pid;
    const data = req.body;
    const postsActions = posts.actions({ db, user: req.user });

    if (isNaN(pid)) {
      return res.status(400).json({
        ok: 0,
        err: `Invalid product id: ${pid}. 🧐 Should be numeric.`,
        details: null,
      });
    }

    if (data.text.length < 2) {
      return res.status(400).json({
        ok: 0,
        err: `Invalid text length. Min: 2 symbols.`,
        details: null,
      });
    }

    const type = posts.TEXT_TYPE;
    postsActions
      .getPost(type, { postId: pid, userId: req.user.id })
      .then((result) => {
        if (!result) {
          return res.status(400).json({
            ok: 0,
            err: `Post not found.`,
            details: null,
          });
        }

        postsActions
          .updatePost(type, pid, data)
          .then((result) => {
            if (result) {
              // result = 1
              return res
                .status(200)
                .json({ ok: 1, err: null, details: { post: { id: pid } } });
            }
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        throw err;
      });
  }
);

app.delete(
  "/post/:id",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const id = req.params.id;
    posts
      .actions({ db, user: req.user })
      .removePost(id)
      .then((result) => {
        if (result) {
          return res.json({ ok: 1, err: null, details: { id } });
        } else {
          return res.status(400).json({
            ok: 0,
            err: "Post deletion failed unexpectedly. Please, try again 🙏",
            details: null,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        next(err);
      });
  }
);

app.post(
  "/p/:slug/boost",
  ajaxOnly,
  authOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const slug = req.params.slug;
    const user = req.user;
    const notificationsActions = notifications.actions({ db, user: req.user });

    db("products")
      .select("id")
      .where({ slug })
      .first()
      .then((productResult) => {
        if (!productResult) {
          return res.status(400).json({
            ok: 0,
            err: `No such product (slug: ${slug}).`,
            details: null,
          });
        }

        return db("product_boosts")
          .insert({ product_id: productResult.id, user_id: user.id })
          .then((boostResult) => {
            return notificationsActions
              .add(notifications.typesMap.PRODUCT_BOOSTS_TYPE, {
                product_id: productResult.id,
              })
              .then((notificationResult) => {
                return db("product_boosts")
                  .select("id")
                  .where({ product_id: productResult.id })
                  .then((allBoostsResult) => {
                    res.json({
                      ok: 1,
                      err: null,
                      details: { boosts: allBoostsResult },
                    });
                  });
              });
          });
      })
      .catch((err) => {
        if (err.code === dbErrCodes.DUP_CODE)
          return res.status(400).json({
            ok: 0,
            err: "You've already boosted this product.",
            details: null,
          });
        next(err);
      });
  }
);

app.post(
  "/p/:slug/collect",
  authOnly,
  ajaxOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const slug = req.params.slug;
    const user = req.user;
    const notificationsActions = notifications.actions({ db, user: req.user });
    db("products")
      .select("id")
      .where({ slug })
      .first()
      .then((productResult) => {
        if (!productResult) {
          return res.status(400).json({
            ok: 0,
            err: `No such product (slug: ${slug}).`,
            details: null,
          });
        }

        return db("collections")
          .insert({ user_id: user.id, product_id: productResult.id })
          .returning("id")
          .then((collectionResult) => {
            notificationsActions
              .add(notifications.typesMap.PRODUCT_COLLECTIONS_TYPE, {
                product_id: productResult.id,
              })
              .then((notificationResult) => {
                res.json({
                  ok: 1,
                  err: null,
                  details: { id: collectionResult.id },
                });
              });
          });
      })
      .catch((err) => {
        if (err.code === dbErrCodes.DUP_CODE)
          return res.status(400).json({
            ok: 0,
            err: "You've already collected this product.",
            details: null,
          });
        next(err);
      });
  }
);

app.delete(
  "/p/:slug/collect",
  authOnly,
  ajaxOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const slug = req.params.slug;
    const user = req.user;
    db("products")
      .select("id")
      .where({ slug })
      .first()
      .then((productResult) => {
        if (!productResult) {
          return res.status(400).json({
            ok: 0,
            err: `No such product (slug: ${slug}).`,
            details: null,
          });
        }

        return db
          .table("collections")
          .where({ user_id: user.id, product_id: productResult.id })
          .del()
          .then((collectionResult) => {
            res.json({ ok: 1, err: null, details: null });
          });
      })
      .catch((err) => {
        next(err);
      });
  }
);

app.post("/upload-image", ajaxOnly, authOnly, (req, res, next) => {
  singleUpload(req, res, function handleUpload(err) {
    if (err && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        ok: 0,
        err:
          "Files greater than 2MB in size are not allowed. Please, optimize your image.",
        details: { max: "2MB" },
      });
    }

    if (err) {
      next(err);
      return;
    }

    res.json({ ok: 1, err: null, details: { url: req.file.location } });
  });
});

app.post(
  "/upload-cover",
  ajaxOnly,
  authOnly,
  express.json(),
  (req, res, next) => {
    singleCoverUpload(req, res, function handleUpload(err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          ok: 0,
          err:
            "Files greater than 2MB in size are not allowed. Please, optimize your image.",
          details: { max: "2MB" },
        });
      }

      if (err) {
        next(err);
        return;
      }

      const productsActions = products.actions({ db, user: req.user });
      const slug = req.body.slug;

      productsActions
        .updateProduct({ slug, input: { cover_image_url: req.file.location } })
        .then((result) => {
          res.json({ ok: 1, err: null, details: { url: req.file.location } });
        })
        .catch((err) => {
          console.log(err);
          next(err);
        });
    });
  }
);

app.post(
  "/upload-logo",
  ajaxOnly,
  authOnly,
  express.json(),
  (req, res, next) => {
    singleLogoUpload(req, res, function handleUpload(err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          ok: 0,
          err:
            "Files greater than 2MB in size are not allowed. Please, optimize your image.",
          details: { max: "2MB" },
        });
      }

      if (err) {
        next(err);
        return;
      }

      res.json({ ok: 1, err: null, details: { url: req.file.location } });
    });
  }
);

app.post(
  "/choose-predefined-cover",
  ajaxOnly,
  authOnly,
  express.json(),
  (req, res, next) => {
    const url = req.body.url;
    const slug = req.body.slug;
    const productsActions = products.actions({ db, user: req.user });

    productsActions
      .getProductBySlug({ slug, user_id: req.user.id })
      .then((product) => {
        productsActions
          .updateProduct({
            slug,
            input: { cover_image_url: url },
          })
          .then((result) => {
            res.json({ ok: 1, err: null, details: null });
          })
          .catch((err) => {
            console.log(err);
            throw err;
          });
      });
  }
);

app.post(
  "/product/:slug/tool",
  ajaxOnly,
  ajaxOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const data = req.body;
    const slug = req.params.slug;
    db("products")
      .select("id")
      .where({ user_id: req.user.id, slug })
      .first()
      .then((productResult) => {
        if (!productResult) {
          return res.status(400).json({
            ok: 0,
            err: `No such product (slug: ${slug}).`,
            details: null,
          });
        }

        db("product_tools")
          .insert({ text: data.text, product_id: productResult.id })
          .returning(["id", "text"])
          .then((productToolsResult) => {
            res.json({
              ok: 1,
              err: null,
              details: { tool: productToolsResult[0] },
            });
          })
          .catch((err) => {
            next(err);
          });
      })
      .catch((err) => {
        next(err);
      });
  }
);

app.delete(
  "/product/:slug/tool/:id",
  authOnly,
  ajaxOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const { id, slug } = req.params;
    db("products")
      .select("id")
      .where({ user_id: req.user.id, slug })
      .first()
      .then((productResult) => {
        if (!productResult) {
          return res.status(400).json({
            ok: 0,
            err: `No such product (slug: ${slug}).`,
            details: null,
          });
        }

        db("product_tools")
          .where({ id })
          .del()
          .then((productToolsResult) => {
            res.json({
              ok: 1,
              err: null,
              details: null,
            });
          })
          .catch((err) => {
            next(err);
          });
      })
      .catch((err) => {
        next(err);
      });
  }
);

app.post(
  "/feedback",
  authOnly,
  ajaxOnly,
  express.json(),
  csrfProtected,
  (req, res, next) => {
    const user = req.user;
    const data = req.body;
    db("feedback")
      .insert({
        user_id: user.id,
        email: data.email,
        type: data.type,
        text: data.text,
      })
      .returning("id")
      .then((result) => {
        res.json({ ok: 1, err: null, details: { id: result[0] } });
      })
      .catch((err) => {
        next(err);
      });
  }
);

// payments
app.get("/checkout", authOnly, (req, res) => {
  const title = "Checkout | Haptic";
  const description = "Checkout page on Haptic";
  res.render("checkout", {
    meta: {
      ...defaultMetas,
      title,
      description,
      og: { ...defaultMetas.og, title, description },
    },
  });
});

app.post("/wh", express.json(), (req, res) => {
  const events = req.body.events;

  if (!events || !events.length) return res.status(500).send("No events");

  events.forEach((event) => {
    if (event.type === "order.completed") {
      console.log(event);
      console.log("Handling event:", event.type);
      const hapticUid = event.data.tags["haptic-uid"];
      const plan = event.data.items[0];
      const subscriptionId = plan.subscription.subscription;
      const sku = plan.sku;
      const orderId = event.data.reference;

      // update the user with type = sku
      if (isNaN(hapticUid))
        return res.status(500).send("Invalid haptic-uid: " + hapticUid);

      db("users")
        .where({ id: hapticUid })
        .update({
          type: sku,
          order_id: orderId,
          subscription_id: subscriptionId,
          updated_at: new Date(),
        })
        .then((result) => {
          res.status(200).send();
        });
    }

    if (event.type === "subscription.charge.completed") {
      console.log("Handling event:", event.type);
      const hapticUid = event.data.subscription.tags["haptic-uid"];
      const subscriptionId = event.data.subscription.subscription;
      const plan = event.data.order.items[0];
      const sku = plan.sku;

      // update the user with type = sku
      if (isNaN(hapticUid))
        return res.status(500).send("Invalid haptic-uid: " + hapticUid);

      db("users")
        .where({ id: hapticUid })
        .update({
          type: sku,
          subscription_id: subscriptionId,
          updatedAt: new Date(),
        })
        .then((result) => {
          res.status(200).send();
        });
    }

    if (event.type === "subscription.deactivated") {
      console.log("Handling event:", event.type);
      const hapticUid = event.data.tags["haptic-uid"];

      if (isNaN(hapticUid))
        return res.status(500).send("Invalid haptic-uid: " + hapticUid);

      db("users")
        .where({ id: hapticUid })
        .update({
          type: 0,
          subscription_deactivation_date: null,
          order_id: null,
          subscription_id: null,
          updated_at: new Date(),
        })
        .then((result) => {
          res.status(200).send();
        });
    }

    if (event.type === "subscription.canceled") {
      console.log(event);
      console.log("Handling event:", event.type);
      const hapticUid = event.data.tags["haptic-uid"];
      const deactivationDateTimestamp = event.data.deactivationDate;

      if (isNaN(hapticUid))
        return res.status(500).send("Invalid haptic-uid: " + hapticUid);

      db("users")
        .where({ id: hapticUid })
        .update({
          subscription_deactivation_date: deactivationDateTimestamp,
          updated_at: new Date(),
        })
        .then((result) => {
          res.status(200).send();
        });
    }

    if (event.type === "subscription.uncanceled") {
      console.log("Handling event:", event.type);
      const product = event.data.product;
      const sku = product.sku;
      const hapticUid = event.data.tags["haptic-uid"];

      if (isNaN(hapticUid))
        return res.status(500).send("Invalid haptic-uid: " + hapticUid);

      db("users")
        .where({ id: hapticUid })
        .update({
          subscription_deactivation_date: null,
          type: sku,
          updated_at: new Date(),
        })
        .then((result) => {
          res.status(200).send();
        });
    }
  });
});

// 404
app.get("*", function(req, res, next) {
  res.status(404).render("404", {
    meta: { ...defaultMetas, title: "Page not found | Haptic" },
  });
});

// error handler
app.use(rollbar.errorHandler());
app.use((err, req, res, next) => {
  console.log(err);
  if (res.headersSent) return next(err);
  if (isAjaxCall(req))
    return res.status(500).json({
      ok: 0,
      err:
        "Something went wrong. 😱 Please, use the feedback form or contact me on Twitter.",
      details: { err },
    });
  res.status(500);
  res.render("error", { error: err, meta: defaultMetas });
});

// run this bad boy!
app.listen(process.env.PORT);
console.log(process.env.PORT + " is where the magic happens.");
