import express from "express";
import { getDashboardData, getReportsData } from "../controllers/admin.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, roleMiddleware("admin"), getDashboardData);
router.get("/reports", authMiddleware, roleMiddleware("admin"), getReportsData);

export default router;
