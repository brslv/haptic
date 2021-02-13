const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;

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
      return done(null, profile);
    }
  )
);
