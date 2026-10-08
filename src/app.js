import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import userRoutes from "./routes/user.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import aiChatRoutes from "./routes/aiChat.routes.js";
import aiSummaryRoutes from "./routes/aiSummary.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import testRoutes from "./routes/test.routes.js";
import embeddingsRoutes from "./routes/embeddings.routes.js";
import ratingRoutes from "./routes/rating.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://openlearn-frontend.vercel.app",
        process.env.FRONTEND_URL,
        process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
}));
app.use(express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
        if (req.originalUrl === "/api/payment/webhook") {
            req.rawBody = buf;
        }
    }
}));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", aiChatRoutes);
app.use("/api", aiSummaryRoutes);
app.use("/api", quizRoutes);
app.use("/api", testRoutes);
app.use("/api", embeddingsRoutes);
app.use("/api", ratingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/admin", adminRoutes);

export default app;
