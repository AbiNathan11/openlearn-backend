import express from "express";
import { getAllUsers, deleteUser, toggleUserStatus } from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = express.Router();

// Admin only routes
router.get("/", authMiddleware, getAllUsers);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteUser);
router.put("/:id/toggle-status", authMiddleware, roleMiddleware("admin"), toggleUserStatus);

export default router;
