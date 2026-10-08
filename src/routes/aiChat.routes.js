import express from 'express';
import aiChatService from '../services/aiChat.service.js';
import Course from '../models/Course.model.js';
import auth from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/chat - Send message to AI chat
router.post('/chat', auth, async (req, res) => {
    try {
        const { message, courseId } = req.body;

        if (!message || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Message and courseId are required'
            });
        }

        // Get course details with lessons
        const course = await Course.findById(courseId).populate('lessons');
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Generate AI response using RAG with completed lessons focus
        const response = await aiChatService.generateResponse(
            message,
            courseId,
            course.lessons
        );

        res.json(response);

    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/chat/health - Check AI service health
router.get('/chat/health', (req, res) => {
    res.json({
        success: true,
        message: 'AI Chat service is running',
        openaiConfigured: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    });
});

export default router;
