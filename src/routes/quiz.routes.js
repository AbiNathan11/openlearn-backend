import express from 'express';
import quizService from '../services/quiz.service.js';
import enhancedAuth from '../middlewares/enhancedAuth.middleware.js';

const router = express.Router();

// Test route - simple response
router.get('/test', (req, res) => {
    console.log('=== Quiz Test Route Called ===');
    res.json({ message: 'Quiz routes are working' });
});

// POST /api/quiz/generate - Generate quiz questions based on completed lessons
// All authenticated users (students can take quizzes)
router.post('/quiz/generate', 
    enhancedAuth.verifyToken.bind(enhancedAuth), 
    async (req, res) => {
    try {
        console.log('=== Quiz Generation Route Called ===');
        console.log('User ID:', req.user?.id);
        console.log('User Role:', req.user?.role);
        console.log('Request body:', req.body);
        
        const { courseId, questionCount = 5 } = req.body;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }

        // Students can only generate quizzes for their enrolled courses
        if (req.user.role === 'student') {
            // TODO: Add enrollment check logic here
            console.log('Student generating quiz for course:', courseId);
        }

        console.log('Generating quiz for course:', courseId, 'questions:', questionCount);

        // Generate quiz questions based on completed lessons
        const response = await quizService.generateQuizQuestions(req.user.id, courseId, questionCount);
        
        console.log('=== Quiz Generation Response ===');
        console.log('Success:', response.success);
        console.log('Questions count:', response.data?.questions?.length);

        res.json(response);

    } catch (error) {
        console.error('=== Quiz Generation Error ===');
        console.error('Error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

export default router;