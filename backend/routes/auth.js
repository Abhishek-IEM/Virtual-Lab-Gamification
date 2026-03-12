const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const passport = require("passport");
const User = require("../models/User");
const authenticate = require("../middleware/auth");

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const getFrontendUrl = () =>
  process.env.FRONTEND_URL || "http://localhost:5173";

const getMailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
};

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        experimentsCompleted: user.experimentsCompleted,
        badges: user.badges,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        experimentsCompleted: user.experimentsCompleted,
        badges: user.badges,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// GET /auth/profile
router.get("/profile", authenticate, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      points: req.user.points,
      experimentsCompleted: req.user.experimentsCompleted,
      badges: req.user.badges,
    },
  });
});

// GET /auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: true,
  }),
);

// GET /auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${getFrontendUrl()}/login?google=failed`,
    session: true,
  }),
  async (req, res) => {
    const token = generateToken(req.user._id);
    return res.redirect(
      `${getFrontendUrl()}/dashboard?token=${encodeURIComponent(token)}`,
    );
  },
);

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetLink = `${getFrontendUrl()}/reset-password/${rawToken}`;
    const transporter = getMailTransporter();

    await transporter.sendMail({
      from: process.env.MAIL_FROM || "Virtual Lab <no-reply@virtuallab.local>",
      to: user.email,
      subject: "Virtual Lab Password Reset",
      text: `You requested a password reset for your Virtual Lab account.\n\nReset your password using this link:\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
      html: `<p>You requested a password reset for your Virtual Lab account.</p><p><a href="${resetLink}">Click here to reset your password</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    });

    return res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res
      .status(500)
      .json({ message: "Unable to process forgot password request" });
  }
});

// POST /auth/reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    return res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Unable to reset password" });
  }
});

module.exports = router;
