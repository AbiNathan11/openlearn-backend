import express from "express";
import { confirmPayment, createPayment, stripeWebhook } from "../controllers/payment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/checkout", authMiddleware, createPayment);
router.post("/confirm", authMiddleware, confirmPayment);
router.post("/webhook", stripeWebhook);

export default router;
