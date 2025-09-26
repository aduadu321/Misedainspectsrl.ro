/* eslint-disable */
const dotenv = require("dotenv");

// Load environment variables FIRST
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const path = require("path");

// Import passport configuration AFTER env variables are loaded
import "./config/passport";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";

const app = express();
const PORT = process.env.PORT || 5000;

const defaultOrigins = ["http://localhost:5173"];
const configuredOrigins = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const allowedOrigins =
  configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/itp-notification"
  )
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error: any) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Middleware
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use(rateLimiter);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Health check endpoint
app.get("/api/health", (_req: any, res: any) => {
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
  app.get("/*", (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

// 404 handler for unmatched routes
app.use((_req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 ITP NOTIFICATION - Authentication System`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;