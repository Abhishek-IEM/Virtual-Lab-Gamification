const crypto = require("crypto");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const User = require("../models/User");

module.exports = function configurePassport(passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:5000/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(
              new Error("Google account does not provide an email"),
              null,
            );
          }

          // First priority: account already linked with this Google ID
          let user = await User.findOne({ googleId: profile.id });
          if (user) return done(null, user);

          // Second priority: existing account with same email -> link Google
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }

          // New Google user
          const randomPassword = crypto.randomBytes(24).toString("hex");
          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            googleId: profile.id,
            password: randomPassword,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      },
    ),
  );
};
