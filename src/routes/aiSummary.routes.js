import express from 'express';
import aiSummaryService from '../services/aiSummary.service.js';
import auth from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/ai-summary/generate - Generate AI summary for lesson
router.post('/ai-summary/generate', auth, async (req, res) => {
    try {
        console.log('=== AI Summary Route Called ===');
        console.log('Request body:', req.body);
        console.log('User ID:', req.user?.id);
        console.log('Headers:', req.headers);
        
        const { courseId, lessonId } = req.body;

        if (!courseId || !lessonId) {
            console.log('Missing courseId or lessonId');
            return res.status(400).json({
                success: false,
                message: 'Course ID and Lesson ID are required'
            });
        }

        console.log('Generating summary for:', { courseId, lessonId });

        // Generate AI summary using lesson content (videos, PDFs, etc.)
        const response = await aiSummaryService.generateSummary(courseId, lessonId);
        
        console.log('=== Summary generation response ===');
        console.log('Response success:', response.success);
        console.log('Response message:', response.message);
        console.log('Response hasMediaContent:', response.hasMediaContent);

        res.json(response);

    } catch (error) {
        console.error('=== AI Summary Error ===');
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
