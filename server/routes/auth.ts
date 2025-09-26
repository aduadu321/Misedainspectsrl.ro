import * as express from "express";
import * as jwt from "jsonwebtoken";
import passport from "../config/passport";
import * as mongoose from "mongoose";

type Request = express.Request;
type Response = express.Response;
import User from "../models/User";
import { asyncHandler } from "../middleware/errorHandler";
import { authLimiter } from "../middleware/rateLimiter";
import { sendVerificationEmail } from "../services/emailService";
import { sendVerificationSMS } from "../services/smsService";

const router = express.Router();

// Generate JWT token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET not found in environment variables");
  }

  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

// Register endpoint
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      nume,
      prenume,
      nrTelefon,
      email,
      parola,
      confirmaParola,
      preferredVerification,
    } = req.body;

    // Validation
    if (
      !nume ||
      !prenume ||
      !nrTelefon ||
      !email ||
      !parola ||
      !confirmaParola ||
      !preferredVerification
    ) {
      return res.status(400).json({
        success: false,
        message: "Toate câmpurile sunt obligatorii",
      });
    }

    if (parola !== confirmaParola) {
      return res.status(400).json({
        success: false,
        message: "Parolele nu coincid",
      });
    }

    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { nrTelefon }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email ? "Email-ul" : "Numărul de telefon";
      return res.status(400).json({
        success: false,
        message: `${field} este deja înregistrat`,
      });
    }

    // Create new user
    const user = new User({
      nume,
      prenume,
      nrTelefon,
      email,
      parola,
      preferredVerification,
      emailVerificationToken: Math.random().toString(36).substring(2, 15),
      smsVerificationCode: Math.floor(
        100000 + Math.random() * 900000
      ).toString(),
    });

    await user.save();

    // Generate token
    const token = generateToken(
      (user._id as mongoose.Types.ObjectId).toString()
    );

    // Send verification based on preference
    try {
      if (preferredVerification === "email") {
        const emailSent = await sendVerificationEmail(
          user.email,
          `${user.nume} ${user.prenume}`,
          user.emailVerificationToken!
        );

        if (!emailSent) {
          console.error("Failed to send verification email");
          // Continue with registration even if email fails
        }
      } else {
        const smsSent = await sendVerificationSMS(
          user.nrTelefon,
          `${user.nume} ${user.prenume}`,
          user.smsVerificationCode!
        );

        if (!smsSent.success) {
          console.error("Failed to send verification SMS:", smsSent.error);
          // Continue with registration even if SMS fails
        }
      }
    } catch (error) {
      console.error("Verification sending error:", error);
      // Continue with registration even if verification fails
    }

    res.status(201).json({
      success: true,
      message:
        "Cont creat cu succes! Verifică-ți emailul/telefonul pentru activare.",
      token,
      user: {
        id: user._id,
        nume: user.nume,
        prenume: user.prenume,
        email: user.email,
        nrTelefon: user.nrTelefon,
        isEmailVerified: user.isEmailVerified,
        isSMSVerified: user.isSMSVerified,
        preferredVerification: user.preferredVerification,
      },
    });
  })
);

// Login endpoint
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { login, parola } = req.body;

    if (!login || !parola) {
      return res.status(400).json({
        success: false,
        message: "Email/telefon și parola sunt obligatorii",
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: login }, { nrTelefon: login }],
    });

    if (!user || !(await user.comparePassword(parola))) {
      return res.status(401).json({
        success: false,
        message: "Credențiale invalide",
      });
    }

    // Check if account is verified
    const isVerified =
      user.preferredVerification === "email"
        ? user.isEmailVerified
        : user.isSMSVerified;

    if (!isVerified) {
      return res.status(401).json({
        success: false,
        message: "Contul nu este verificat. Verifică-ți emailul/telefonul.",
        needsVerification: true,
        preferredVerification: user.preferredVerification,
      });
    }

    // Generate token
    const token = generateToken(
      (user._id as mongoose.Types.ObjectId).toString()
    );

    res.json({
      success: true,
      message: "Autentificarereușită",
      token,
      user: {
        id: user._id,
        nume: user.nume,
        prenume: user.prenume,
        email: user.email,
        nrTelefon: user.nrTelefon,
        isEmailVerified: user.isEmailVerified,
        isSMSVerified: user.isSMSVerified,
        preferredVerification: user.preferredVerification,
      },
    });
  })
);

// GitHub OAuth routes
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as { _id: mongoose.Types.ObjectId };
    const token = generateToken(user._id.toString());

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// Verify email endpoint
router.post(
  "/verify-email",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token de verificare invalid sau expirat",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verificat cu succes!",
    });
  })
);

// Verify SMS endpoint
router.post(
  "/verify-sms",
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, code } = req.body;

    const user = await User.findOne({
      nrTelefon: phone,
      smsVerificationCode: code,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Cod de verificare invalid",
      });
    }

    user.isSMSVerified = true;
    user.smsVerificationCode = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Numărul de telefon verificat cu succes!",
    });
  })
);

// Logout endpoint
router.post("/logout", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Delogat cu succes",
  });
});

export default router;