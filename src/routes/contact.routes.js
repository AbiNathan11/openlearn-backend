import express from "express";
import { submitContact, getAllContacts, markAsRead, deleteContact } from "../controllers/contact.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = express.Router();

// Public route for users to send messages
router.post("/", submitContact);

// Admin only routes for managing messages
router.get("/", authMiddleware, roleMiddleware("admin"), getAllContacts);
router.put("/:id/read", authMiddleware, roleMiddleware("admin"), markAsRead);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteContact);

export default router;
