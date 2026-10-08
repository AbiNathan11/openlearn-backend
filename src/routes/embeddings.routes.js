import express from 'express';
import aiController from '../controllers/ai.controller.js';
import enhancedAuth from '../middlewares/enhancedAuth.middleware.js';

const router = express.Router();

// Apply rate limiting to all embedding routes
router.use(enhancedAuth.rateLimit.middleware(50, 15 * 60 * 1000)); // 50 requests per 15 minutes

// POST /api/embeddings/process-lesson - Process and store embeddings for a lesson
// Instructor and Admin only
router.post('/embeddings/process-lesson', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.processLessonEmbeddings
);

// POST /api/embeddings/enhanced-chat - Enhanced AI chat with vector search
// All authenticated users
router.post('/embeddings/enhanced-chat', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    aiController.enhancedAIChat
);

// GET /api/embeddings/stats - Get vector database statistics
// Admin only
router.get('/embeddings/stats', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireAdmin, 
    aiController.getPineconeStats
);

// POST /api/embeddings/search-course - Search content within a course
// All authenticated users
router.post('/embeddings/search-course', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    aiController.searchCourseContent
);

// POST /api/embeddings/rebuild-course - Rebuild embeddings for a course
// Instructor and Admin only
router.post('/embeddings/rebuild-course', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.rebuildCourseEmbeddings
);

// POST /api/embeddings/extract-video-text - Extract text from video
// Instructor and Admin only
router.post('/embeddings/extract-video-text', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.extractVideoText
);

// POST /api/embeddings/extract-pdf-text - Extract text from PDF
// Instructor and Admin only
router.post('/embeddings/extract-pdf-text', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.extractPDFText
);

// GET /api/embeddings/lesson/:lessonId - Get embeddings for a specific lesson
// Instructor and Admin only
router.get('/embeddings/lesson/:lessonId', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.getLessonEmbeddings
);

// GET /api/embeddings/course/:courseId - Get embeddings for a specific course
// Instructor and Admin only
router.get('/embeddings/course/:courseId', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.getCourseEmbeddings
);

// DELETE /api/embeddings/lesson/:lessonId - Delete embeddings for a lesson
// Instructor and Admin only
router.delete('/embeddings/lesson/:lessonId', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireInstructorOrAdmin, 
    aiController.deleteLessonEmbeddings
);

export default router;
