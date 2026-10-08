import enhancedAIChatService from '../services/enhancedAIChat.service.js';
import embeddingsService from '../services/embeddings.service.js';
import pineconeService from '../services/pinecone.service.js';

class AIController {
    // Process lesson content and generate embeddings
    async processLessonEmbeddings(req, res) {
        try {
            console.log('=== AI Controller: Process Lesson Embeddings ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const { lessonId } = req.body;

            if (!lessonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Lesson ID is required'
                });
            }

            // Get lesson details
            const { default: Lesson } = await import('../models/Lesson.model.js');
            const lesson = await Lesson.findById(lessonId).populate('course');
            
            if (!lesson) {
                return res.status(404).json({
                    success: false,
                    message: 'Lesson not found'
                });
            }

            console.log('Processing embeddings for lesson:', lesson.title);

            // Process and store embeddings
            const result = await enhancedAIChatService.processLessonEmbeddings(lesson);
            
            console.log('=== Lesson Embeddings Processing Response ===');
            console.log('Success:', result.success);
            console.log('Embeddings stored:', result.embeddingsStored);

            res.json(result);

        } catch (error) {
            console.error('=== Process Lesson Embeddings Error ===');
            console.error('Error:', error.message);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Enhanced AI chat with Pinecone vector search
    async enhancedAIChat(req, res) {
        try {
            console.log('=== AI Controller: Enhanced AI Chat ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const { question, courseId, lessons, currentLessonId } = req.body;

            if (!question || !courseId) {
                return res.status(400).json({
                    success: false,
                    message: 'Question and Course ID are required'
                });
            }

            console.log('Generating enhanced AI response for course:', courseId);

            // Generate enhanced AI response using Pinecone
            const result = await enhancedAIChatService.generateResponse(
                question, 
                courseId, 
                lessons || [], 
                currentLessonId
            );
            
            console.log('=== Enhanced AI Chat Response ===');
            console.log('Success:', result.success);
            console.log('Method used:', result.method);
            console.log('Context used:', result.contextUsed);

            res.json(result);

        } catch (error) {
            console.error('=== Enhanced AI Chat Error ===');
            console.error('Error:', error.message);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get Pinecone statistics
    async getPineconeStats(req, res) {
        try {
            console.log('=== AI Controller: Get Pinecone Stats ===');
            
            const result = await pineconeService.getStatistics();
            
            console.log('=== Pinecone Stats Response ===');
            console.log('Success:', result.success);

            res.json(result);

        } catch (error) {
            console.error('=== Pinecone Stats Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Search course content using Pinecone
    async searchCourseContent(req, res) {
        try {
            console.log('=== AI Controller: Search Course Content ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const { courseId, query, limit = 10 } = req.body;

            if (!courseId || !query) {
                return res.status(400).json({
                    success: false,
                    message: 'Course ID and query are required'
                });
            }

            console.log('Searching course content for:', query);

            const result = await enhancedAIChatService.searchCourseContent(
                courseId, 
                query, 
                limit
            );
            
            console.log('=== Search Course Content Response ===');
            console.log('Success:', result.success);
            console.log('Results found:', result.results?.length);

            res.json(result);

        } catch (error) {
            console.error('=== Search Course Content Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Rebuild embeddings for a course
    async rebuildCourseEmbeddings(req, res) {
        try {
            console.log('=== AI Controller: Rebuild Course Embeddings ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const { courseId } = req.body;

            if (!courseId) {
                return res.status(400).json({
                    success: false,
                    message: 'Course ID is required'
                });
            }

            // Get all lessons for the course
            const { default: Lesson } = await import('../models/Lesson.model.js');
            const lessons = await Lesson.find({ course: courseId });
            
            if (lessons.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No lessons found for this course'
                });
            }

            console.log('Rebuilding embeddings for course:', courseId, 'with', lessons.length, 'lessons');

            const result = await enhancedAIChatService.rebuildCourseEmbeddings(
                courseId, 
                lessons
            );
            
            console.log('=== Rebuild Course Embeddings Response ===');
            console.log('Success:', result.success);
            console.log('Total embeddings processed:', result.totalEmbeddingsProcessed);

            res.json(result);

        } catch (error) {
            console.error('=== Rebuild Course Embeddings Error ===');
            console.error('Error:', error.message);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Extract text from video
    async extractVideoText(req, res) {
        try {
            console.log('=== AI Controller: Extract Video Text ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const { videoPath } = req.body;

            if (!videoPath) {
                return res.status(400).json({
                    success: false,
                    message: 'Video path is required'
                });
            }

            console.log('Extracting text from video:', videoPath);

            const result = await embeddingsService.extractVideoText(videoPath);
            
            console.log('=== Extract Video Text Response ===');
            console.log('Success:', result.success);
            console.log('Text length:', result.text?.length);

            res.json(result);

        } catch (error) {
            console.error('=== Extract Video Text Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Extract text from PDF
    async extractPDFText(req, res) {
        try {
            console.log('=== AI Controller: Extract PDF Text ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const { pdfPath } = req.body;

            if (!pdfPath) {
                return res.status(400).json({
                    success: false,
                    message: 'PDF path is required'
                });
            }

            console.log('Extracting text from PDF:', pdfPath);

            const result = await embeddingsService.extractPDFText(pdfPath);
            
            console.log('=== Extract PDF Text Response ===');
            console.log('Success:', result.success);
            console.log('Text length:', result.text?.length);

            res.json(result);

        } catch (error) {
            console.error('=== Extract PDF Text Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get embeddings for a specific lesson
    async getLessonEmbeddings(req, res) {
        try {
            console.log('=== AI Controller: Get Lesson Embeddings ===');
            console.log('User ID:', req.user?.id);
            console.log('Request params:', req.params);
            
            const { lessonId } = req.params;

            if (!lessonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Lesson ID is required'
                });
            }

            const result = await pineconeService.getLessonEmbeddings(lessonId);
            
            console.log('=== Get Lesson Embeddings Response ===');
            console.log('Success:', result.success);
            console.log('Embeddings count:', result.count);

            res.json(result);

        } catch (error) {
            console.error('=== Get Lesson Embeddings Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get embeddings for a specific course
    async getCourseEmbeddings(req, res) {
        try {
            console.log('=== AI Controller: Get Course Embeddings ===');
            console.log('User ID:', req.user?.id);
            console.log('Request params:', req.params);
            
            const { courseId } = req.params;

            if (!courseId) {
                return res.status(400).json({
                    success: false,
                    message: 'Course ID is required'
                });
            }

            const result = await pineconeService.getCourseEmbeddings(courseId);
            
            console.log('=== Get Course Embeddings Response ===');
            console.log('Success:', result.success);
            console.log('Embeddings count:', result.count);

            res.json(result);

        } catch (error) {
            console.error('=== Get Course Embeddings Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Delete embeddings for a lesson
    async deleteLessonEmbeddings(req, res) {
        try {
            console.log('=== AI Controller: Delete Lesson Embeddings ===');
            console.log('User ID:', req.user?.id);
            console.log('Request params:', req.params);
            
            const { lessonId } = req.params;

            if (!lessonId) {
                return res.status(400).json({
                    success: false,
                    message: 'Lesson ID is required'
                });
            }

            const result = await pineconeService.deleteLessonEmbeddings(lessonId);
            
            console.log('=== Delete Lesson Embeddings Response ===');
            console.log('Success:', result.success);
            console.log('Deleted count:', result.deletedCount);

            res.json(result);

        } catch (error) {
            console.error('=== Delete Lesson Embeddings Error ===');
            console.error('Error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

export default new AIController();