import express from "express";
import {
    createCourse,
    getInstructorCourses,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    enrollCourse,
    getEnrolledCourses,
    getPendingCourses,
    getAllCoursesAdmin,
    approveCourse,
    rejectCourse,
    getCourseProgress,
    markLessonComplete,
    getStudentStats
} from "../controllers/course.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllCourses);

// Admin Routes (Approvals & Management)
router.get("/admin/all", authMiddleware, roleMiddleware("admin"), getAllCoursesAdmin);
router.get("/admin/pending", authMiddleware, roleMiddleware("admin"), getPendingCourses);
router.put("/:id/approve", authMiddleware, roleMiddleware("admin"), approveCourse);
router.put("/:id/reject", authMiddleware, roleMiddleware("admin"), rejectCourse);

// Protected routes (Instructor only for creation)
router.post("/", authMiddleware, roleMiddleware("instructor", "admin"), createCourse);
router.get("/my-courses", authMiddleware, getInstructorCourses);

// Student Routes
router.get("/enrolled", authMiddleware, getEnrolledCourses);

// Course Management (Get Single, Edit, Delete)
router.get("/:id", authMiddleware, getCourseById);
router.put("/:id", authMiddleware, roleMiddleware("instructor", "admin"), updateCourse);
router.delete("/:id", authMiddleware, roleMiddleware("instructor", "admin"), deleteCourse);

// Enrollment
router.post("/:id/enroll", authMiddleware, enrollCourse);
router.get("/:id/progress", authMiddleware, getCourseProgress);
router.post("/:id/lessons/:lessonId/complete", authMiddleware, markLessonComplete);
// Stats
router.get("/student/dashboard-stats", authMiddleware, getStudentStats);

export default router;
