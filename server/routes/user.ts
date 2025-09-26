import express from "express";
import User from "../models/User";
import { asyncHandler } from "../middleware/errorHandler";

type Request = express.Request;
type Response = express.Response;

const router = express.Router();

// Get user profile
router.get(
  "/profile",
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Add JWT authentication middleware
    const userId = req.headers["x-user-id"]; // Temporary, will be replaced with JWT middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Nu ești autentificat",
      });
    }

    const user = await User.findById(userId).select("-parola");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilizator negăsit",
      });
    }

    res.json({
      success: true,
      user,
    });
  })
);

// Update user profile
router.put(
  "/profile",
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Add JWT authentication middleware
    const userId = req.headers["x-user-id"]; // Temporary

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Nu ești autentificat",
      });
    }

    const { nume, prenume, nrTelefon } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { nume, prenume, nrTelefon },
      { new: true, runValidators: true }
    ).select("-parola");

    res.json({
      success: true,
      message: "Profil actualizat cu succes",
      user,
    });
  })
);

export default router;