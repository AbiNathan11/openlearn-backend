import express from "express";
import { uploadFile } from "../controllers/upload.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// Upload single file (video, PDF, or image)
router.post("/", authMiddleware, upload.single('file'), uploadFile);

export default router;
