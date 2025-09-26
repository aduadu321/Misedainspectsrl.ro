"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
var dotenv = require("dotenv");
// Load environment variables FIRST
dotenv.config();
var express = require("express");
var mongoose = require("mongoose");
var cors = require("cors");
var session = require("express-session");
var passport = require("passport");
var path = require("path");
// Import passport configuration AFTER env variables are loaded
require("./config/passport");
// Import routes
var auth_1 = require("./routes/auth");
var user_1 = require("./routes/user");
// Import middleware
var errorHandler_1 = require("./middleware/errorHandler");
var rateLimiter_1 = require("./middleware/rateLimiter");
var app = express();
var PORT = process.env.PORT || 5000;
var defaultOrigins = ["http://localhost:5173"];
var configuredOrigins = ((_a = process.env.CLIENT_URL) !== null && _a !== void 0 ? _a : "")
    .split(",")
    .map(function (origin) { return origin.trim(); })
    .filter(function (origin) { return origin.length > 0; });
var allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;
// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/itp-notification")
    .then(function () {
    console.log("✅ Connected to MongoDB");
})
    .catch(function (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
});
// Middleware
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS: ".concat(origin)));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Rate limiting
app.use(rateLimiter_1.rateLimiter);
// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/user", user_1.default);
// Health check endpoint
app.get("/api/health", function (_req, res) {
    res.json({
        status: "OK",
        message: "ITP NOTIFICATION Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
    });
});
// Serve static files in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../dist")));
    // Catch-all handler for SPA (must be after API routes)
    app.get("/*", function (_req, res) {
        res.sendFile(path.join(__dirname, "../dist/index.html"));
    });
}
// 404 handler for unmatched routes
app.use(function (_req, res) {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
process.on("SIGTERM", function () {
    console.log("SIGTERM received, shutting down gracefully...");
    mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
});
app.listen(PORT, function () {
    console.log("\uD83D\uDE80 Server running on http://localhost:".concat(PORT));
    console.log("\uD83D\uDCF1 ITP NOTIFICATION - Authentication System");
    console.log("\uD83C\uDF0D Environment: ".concat(process.env.NODE_ENV || "development"));
});
exports.default = app;
