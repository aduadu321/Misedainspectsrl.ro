import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

interface TestResult {
  name: string;
  success: boolean;
  details?: string;
}

const runLoginTests = async (): Promise<TestResult[]> => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.GITHUB_CLIENT_ID =
    process.env.GITHUB_CLIENT_ID || "test-client-id";
  process.env.GITHUB_CLIENT_SECRET =
    process.env.GITHUB_CLIENT_SECRET || "test-client-secret";
  process.env.GITHUB_CALLBACK_URL =
    process.env.GITHUB_CALLBACK_URL ||
    "http://localhost:5000/auth/github/callback";
  process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

  const authRoutes = (await import("../server/routes/auth")).default;
  const User = (await import("../server/models/User")).default;

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri("itp-notification-test");

  await mongoose.connect(mongoUri);
  await User.deleteMany({});

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  const results: TestResult[] = [];

  const verifiedUser = await User.create({
    nume: "Popescu",
    prenume: "Ion",
    nrTelefon: "0712345678",
    email: "test-login@misedainspectsrl.ro",
    parola: "Password1!",
    preferredVerification: "email",
    isEmailVerified: true,
    isSMSVerified: true,
  });

  // Ensure flags persisted
  verifiedUser.isEmailVerified = true;
  verifiedUser.isSMSVerified = true;
  await verifiedUser.save();

  const emailLogin = await request(app)
    .post("/api/auth/login")
    .send({ login: verifiedUser.email, parola: "Password1!" });
  results.push({
    name: "Login with verified email",
    success: emailLogin.status === 200 && emailLogin.body.success === true,
    details:
      emailLogin.status !== 200
        ? `Expected 200, received ${emailLogin.status}`
        : undefined,
  });

  const phoneLogin = await request(app)
    .post("/api/auth/login")
    .send({ login: verifiedUser.nrTelefon, parola: "Password1!" });
  results.push({
    name: "Login with phone alias",
    success: phoneLogin.status === 200 && phoneLogin.body.success === true,
    details:
      phoneLogin.status !== 200
        ? `Expected 200, received ${phoneLogin.status}`
        : undefined,
  });

  const wrongPassword = await request(app)
    .post("/api/auth/login")
    .send({ login: verifiedUser.email, parola: "WrongPass1!" });
  results.push({
    name: "Reject invalid password",
    success:
      wrongPassword.status === 401 && wrongPassword.body.success === false,
    details:
      wrongPassword.status !== 401
        ? `Expected 401, received ${wrongPassword.status}`
        : undefined,
  });

  console.log("\n🧪 Test Results:");
  results.forEach((result, i) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${i + 1}. ${result.name}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });

  const passed = results.filter((r) => r.success).length;
  const total = results.length;
  console.log(`\n📊 Summary: ${passed}/${total} tests passed\n`);

  await mongoose.disconnect();
  await mongoServer.stop();

  return results;
};

runLoginTests().catch(console.error);