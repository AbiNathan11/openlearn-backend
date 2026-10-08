import express from 'express';
import {
    submitRating,
    getInstructorRatings,
    getCourseRatings,
    canRateCourse,
    getStudentRatingHistory,
    updateRating,
    deleteRating
} from '../controllers/rating.controller.js';
import enhancedAuth from '../middlewares/enhancedAuth.middleware.js';

const router = express.Router();

// POST /api/ratings/submit - Submit rating for a course
// Students only (must have completed the course)
router.post('/ratings/submit', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireStudent, 
    submitRating
);

// GET /api/ratings/instructor/:instructorId - Get instructor rating statistics
// Public endpoint (for course pages)
router.get('/ratings/instructor/:instructorId', getInstructorRatings);

// GET /api/ratings/course/:courseId - Get course ratings with pagination
// Public endpoint (for course pages)
router.get('/ratings/course/:courseId', getCourseRatings);

// GET /api/ratings/can-rate/:courseId - Check if student can rate course
// Students only
router.get('/ratings/can-rate/:courseId', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireStudent, 
    canRateCourse
);

// GET /api/ratings/my-history - Get student's rating history
// Students only
router.get('/ratings/my-history', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireStudent, 
    getStudentRatingHistory
);

// PUT /api/ratings/:ratingId - Update rating
// Students only (own ratings only, within 24 hours)
router.put('/ratings/:ratingId', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireStudent, 
    updateRating
);

// DELETE /api/ratings/:ratingId - Delete rating
// Students only (own ratings only, within 24 hours)
router.delete('/ratings/:ratingId', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    enhancedAuth.requireStudent, 
    deleteRating
);

export default router;
