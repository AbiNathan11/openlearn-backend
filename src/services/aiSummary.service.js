import OpenAI from 'openai';

class AISummaryService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Test OpenAI connection
        this.testConnection();
    }

    async testConnection() {
        try {
            console.log('Testing OpenAI connection...');
            console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
            console.log('API Key length:', process.env.OPENAI_API_KEY?.length);
            
            // Simple test call
            const response = await this.openai.models.list();
            console.log('OpenAI connection successful');
        } catch (error) {
            console.error('OpenAI connection failed:', error.message);
            console.error('Error details:', error.response?.data || error);
        }
    }

    // Generate AI summary based on lesson content (video transcripts, PDFs)
    async generateSummary(courseId, lessonId) {
        try {
            console.log('Starting AI summary generation...');
            console.log('Course ID:', courseId);
            console.log('Lesson ID:', lessonId);

            // Get lesson details with content
            const lesson = await this.getLessonContent(courseId, lessonId);
            
            if (!lesson) {
                console.log('Lesson not found, creating fallback summary');
                // Try to get lesson title from the course
                const lessonTitle = await this.getLessonTitleFromCourse(courseId, lessonId);
                return this.createFallbackSummaryResponse(lessonTitle || 'Unknown Lesson', courseId, lessonId);
            }

            // Create comprehensive content from video and PDF materials
            const lessonContentResult = this.createLessonContent(lesson);
            const lessonContent = lessonContentResult.content;
            const hasVideoOrPdfContent = lessonContentResult.hasVideoOrPdfContent;
            
            console.log('Lesson content length:', lessonContent.length);
            console.log('Has video/PDF content:', hasVideoOrPdfContent);
            
            // If no video or PDF content, return a specific message
            if (!hasVideoOrPdfContent) {
                console.log('No video or PDF content found, returning specific message');
                return {
                    success: false,
                    message: 'This lesson does not contain video or PDF materials to summarize. Please select a lesson that has video or PDF content.',
                    hasMediaContent: false
                };
            }

            // Check if we have enough content for AI processing
            if (lessonContent.length < 10) {
                console.log('Minimal video/PDF content available, using enhanced fallback summary');
                return this.createFallbackSummaryResponse(lesson.title, courseId, lessonId);
            }

            // Try OpenAI generation first
            try {
                const aiSummary = await this.generateOpenAISummary(lesson, lessonContent);
                return aiSummary;
            } catch (openaiError) {
                console.error('OpenAI generation failed, using fallback:', openaiError.message);
                return this.createFallbackSummaryResponse(lesson.title, courseId, lessonId);
            }

        } catch (error) {
            console.error('Error generating AI summary:', error.message);
            console.error('OpenAI Error Details:', error.response?.data || error);
            
            // Return fallback summary instead of error
            return this.createFallbackSummaryResponse('Lesson Summary', courseId, lessonId);
        }
    }

    // Get lesson title from course if lesson lookup fails
    async getLessonTitleFromCourse(courseId, lessonId) {
        try {
            // Use dynamic import for ES6 modules
            const { default: Course } = await import('../models/Course.model.js');
            const course = await Course.findById(courseId).populate('lessons');
            
            if (course && course.lessons) {
                const lesson = course.lessons.find(l => l._id.toString() === lessonId);
                if (lesson) {
                    return lesson.title;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting lesson title from course:', error);
            return null;
        }
    }

    // Generate summary using OpenAI (focused on video and PDF content)
    async generateOpenAISummary(lesson, lessonContent) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an AI teaching assistant that creates concise summaries from video transcripts and PDF materials.
                    
                    Analyze the provided video transcript and/or PDF content from this lesson and generate:
                    
                    1. Key takeaways (3 bullet points, max 15 words each)
                    2. Detailed summary (1 paragraph, max 100 words)
                    3. Recommended resources (2 items, max 20 words each)
                    
                    IMPORTANT: Keep responses concise and within token limits.
                    Focus ONLY on the video transcript and PDF content.
                    
                    Format your response as JSON with keys: keyPoints, detailedSummary, resources.
                    
                    Video/PDF Content:
                    ${lessonContent}`
                },
                {
                    role: "user",
                    content: "Generate a concise summary from the video transcript and PDF materials."
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const aiResponse = response.choices[0].message.content;
        console.log('AI summary generated successfully');

        // Parse the AI response
        let summaryData;
        try {
            summaryData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.log('JSON parsing failed, using fallback format');
            // Fallback if JSON parsing fails
            summaryData = this.createFallbackSummary(lesson.title, aiResponse);
        }

        return {
            success: true,
            data: {
                title: lesson.title,
                keyPoints: summaryData.keyPoints || [],
                detailedSummary: summaryData.detailedSummary || aiResponse,
                resources: summaryData.resources || ['Video Materials', 'PDF Resources', 'Practice Exercises', 'Additional Reading'],
                lessonId: lesson._id,
                courseId: lesson.course || courseId
            }
        };
    }

    // Get lesson content from database
    async getLessonContent(courseId, lessonId) {
        try {
            // Use dynamic import for ES6 modules
            const { default: Course } = await import('../models/Course.model.js');
            const { default: Lesson } = await import('../models/Lesson.model.js');
            
            console.log('Fetching lesson content for:', { courseId, lessonId });
            
            // First try to find lesson directly
            let lesson = await Lesson.findById(lessonId);
            if (lesson) {
                console.log('Lesson found directly:', lesson.title);
                return lesson;
            }
            
            // If not found directly, try finding through course
            const course = await Course.findById(courseId).populate('lessons');
            if (!course) {
                console.log('Course not found:', courseId);
                return null;
            }

            console.log('Course found, lessons count:', course.lessons?.length);
            
            lesson = course.lessons.find(l => l._id.toString() === lessonId);
            if (lesson) {
                console.log('Lesson found in course:', lesson.title);
                return lesson;
            } else {
                console.log('Lesson not found in course, trying string comparison');
                lesson = course.lessons.find(l => l._id.toString() === lessonId.toString());
                if (lesson) {
                    console.log('Lesson found with string comparison:', lesson.title);
                    return lesson;
                }
            }

            console.log('Lesson not found anywhere');
            return null;
        } catch (error) {
            console.error('Error fetching lesson content:', error);
            return null;
        }
    }

    // Create comprehensive content string from lesson materials (video and PDF only)
    createLessonContent(lesson) {
        let content = `Lesson Title: ${lesson.title}\n`;
        let hasVideoOrPdfContent = false;

        // Only include video transcript if available
        if (lesson.transcript) {
            content += `Video Transcript:\n${lesson.transcript}\n`;
            hasVideoOrPdfContent = true;
        }

        // Only include PDF content if available
        if (lesson.pdfUrl) {
            content += `PDF Material: Available at ${lesson.pdfUrl}\n`;
            hasVideoOrPdfContent = true;
        }

        // Only include video URL if transcript is not available but video exists
        if (lesson.videoUrl && !lesson.transcript) {
            content += `Video Material: Available at ${lesson.videoUrl}\n`;
            hasVideoOrPdfContent = true;
        }

        // Only add description if no video/PDF content is available (fallback)
        if (!hasVideoOrPdfContent && lesson.description) {
            content += `Lesson Description: ${lesson.description}\n`;
        }

        // Only add general content if no video/PDF content is available (fallback)
        if (!hasVideoOrPdfContent && lesson.content) {
            content += `Lesson Content: ${lesson.content}\n`;
        }

        // Return content with flag indicating if video/PDF content was found
        return { content, hasVideoOrPdfContent };
    }

    // Create fallback summary response
    createFallbackSummaryResponse(title, courseId, lessonId) {
        const fallbackData = this.createFallbackSummary(title, '');
        
        return {
            success: true,
            data: {
                title: title,
                keyPoints: fallbackData.keyPoints,
                detailedSummary: fallbackData.detailedSummary,
                resources: fallbackData.resources,
                lessonId: lessonId,
                courseId: courseId
            }
        };
    }

    // Create fallback summary structure
    createFallbackSummary(title, aiResponse) {
        return {
            keyPoints: [
                `Understanding ${title} fundamentals`,
                `Learning key concepts and terminology`,
                `Practical applications and examples`
            ],
            detailedSummary: aiResponse || `This lesson on ${title} provides essential knowledge and skills. It covers important concepts to build your understanding and practical application.`,
            resources: [
                "Course Materials",
                "Practice Exercises"
            ]
        };
    }
}

export default new AISummaryService();
