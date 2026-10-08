import express from "express";
import { register, login, getMe, updateProfile, refreshToken, logout, googleAuth, facebookAuth, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { deactivateAccount } from "../controllers/user.controller.js";
import enhancedAuth from "../middlewares/enhancedAuth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// OAuth routes
router.get("/google", googleAuth);
router.get("/facebook", facebookAuth);

// Protected routes (require valid token)
router.get("/me", enhancedAuth.verifyToken.bind(enhancedAuth), getMe);
router.put("/me", enhancedAuth.verifyToken.bind(enhancedAuth), updateProfile);
router.post("/logout", enhancedAuth.verifyToken.bind(enhancedAuth), logout);
router.post("/deactivate-account", enhancedAuth.verifyToken.bind(enhancedAuth), deactivateAccount);

export default router;
