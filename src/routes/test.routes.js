import express from 'express';
import aiSummaryService from '../services/aiSummary.service.js';

const router = express.Router();

// Test AI summary without authentication
router.post('/test-summary', async (req, res) => {
    try {
        console.log('=== Test AI Summary Route Called ===');
        console.log('Request body:', req.body);
        
        const { courseId, lessonId } = req.body;

        if (!courseId || !lessonId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID and Lesson ID are required'
            });
        }

        console.log('Generating test summary for:', { courseId, lessonId });

        // Generate AI summary using lesson content (videos, PDFs, etc.)
        const response = await aiSummaryService.generateSummary(courseId, lessonId);
        
        console.log('=== Test Summary generation response ===');
        console.log('Response success:', response.success);
        console.log('Response message:', response.message);
        console.log('Response hasMediaContent:', response.hasMediaContent);

        res.json(response);

    } catch (error) {
        console.error('=== Test AI Summary Error ===');
        console.error('Error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Simple test endpoint
router.get('/test', (req, res) => {
    console.log('=== Simple Test Endpoint Called ===');
    res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

export default router;
