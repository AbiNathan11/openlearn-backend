import OpenAI from 'openai';

class QuizService {
    constructor() {
        this.openai = null;
        this.initializeOpenAI();
    }

    async initializeOpenAI() {
        try {
            console.log('Testing OpenAI connection for quiz service...');
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            
            const response = await this.openai.models.list();
            console.log('OpenAI connection successful for quiz service');
        } catch (error) {
            console.error('OpenAI connection failed for quiz service:', error.message);
        }
    }

    // Generate quiz questions based on completed lessons
    async generateQuizQuestions(userId, courseId, questionCount = 5) {
        try {
            console.log('Generating quiz questions for user:', userId, 'course:', courseId);
            
            // Get completed lessons for the user in this course
            const completedLessons = await this.getCompletedLessons(userId, courseId);
            
            if (completedLessons.length === 0) {
                return {
                    success: false,
                    message: 'No completed lessons found for this course. Please complete some lessons before taking a quiz.'
                };
            }

            console.log('Found completed lessons:', completedLessons.length);

            // Create comprehensive content from completed lessons
            const lessonContent = await this.createLessonContent(completedLessons);
            
            if (lessonContent.length < 100) {
                return {
                    success: false,
                    message: 'Insufficient content available from completed lessons to generate meaningful quiz questions.'
                };
            }

            // Generate quiz questions using OpenAI
            const questions = await this.generateOpenAIQuiz(lessonContent, completedLessons, questionCount);
            
            return {
                success: true,
                data: {
                    questions,
                    lessonCount: completedLessons.length,
                    courseId,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Error generating quiz questions:', error.message);
            return {
                success: false,
                message: 'Failed to generate quiz questions. Please try again.'
            };
        }
    }

    // Get completed lessons for a user in a specific course
    async getCompletedLessons(userId, courseId) {
        try {
            // Use dynamic import for ES6 modules
            const { default: Course } = await import('../models/Course.model.js');
            const { default: Progress } = await import('../models/Progress.model.js');
            const { default: Lesson } = await import('../models/Lesson.model.js');

            // Get user progress for this course
            const progress = await Progress.findOne({ user: userId, course: courseId });
            
            if (!progress || !progress.completedLessons || progress.completedLessons.length === 0) {
                return [];
            }

            // Get lesson details for completed lessons
            const lessons = await Lesson.find({
                _id: { $in: progress.completedLessons }
            }).populate('course');

            return lessons;
        } catch (error) {
            console.error('Error fetching completed lessons:', error);
            return [];
        }
    }

    // Create comprehensive content string from completed lessons
    async createLessonContent(lessons) {
        let content = 'Course Content for Quiz Generation:\n\n';
        
        for (const lesson of lessons) {
            content += `Lesson: ${lesson.title}\n`;
            
            if (lesson.description) {
                content += `Description: ${lesson.description}\n`;
            }
            
            if (lesson.content) {
                content += `Content: ${lesson.content}\n`;
            }
            
            if (lesson.transcript) {
                content += `Video Transcript: ${lesson.transcript.substring(0, 500)}...\n`;
            }
            
            content += '\n';
        }

        return content;
    }

    // Generate quiz questions using OpenAI
    async generateOpenAIQuiz(lessonContent, lessons, questionCount) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an AI quiz generator that creates multiple-choice questions based on lesson content.
                    
                    Generate ${questionCount} multiple-choice questions based on the provided lesson content. Each question should:
                    
                    1. Test understanding of key concepts from the lessons
                    2. Have 4 options (A, B, C, D) with only one correct answer
                    3. Include a brief explanation for the correct answer
                    4. Be clear and concise
                    5. Cover different topics from the lessons
                    
                    Format your response as JSON with this structure:
                    {
                      "questions": [
                        {
                          "question": "The question text",
                          "options": ["Option A", "Option B", "Option C", "Option D"],
                          "correctAnswer": 0,
                          "explanation": "Brief explanation of why this is correct"
                        }
                      ]
                    }
                    
                    Lesson Content:
                    ${lessonContent}`
                },
                {
                    role: "user",
                    content: `Generate ${questionCount} multiple-choice questions for a quiz based on these lessons.`
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const aiResponse = response.choices[0].message.content;
        console.log('Quiz questions generated successfully');

        // Parse the AI response
        let quizData;
        try {
            quizData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.log('JSON parsing failed, using fallback quiz');
            quizData = this.createFallbackQuiz(lessons, questionCount);
        }

        return quizData.questions || this.createFallbackQuiz(lessons, questionCount).questions;
    }

    // Create fallback quiz if AI generation fails
    createFallbackQuiz(lessons, questionCount) {
        const questions = [];
        
        for (let i = 0; i < Math.min(questionCount, lessons.length); i++) {
            const lesson = lessons[i];
            questions.push({
                question: `What is the main topic covered in the lesson "${lesson.title}"?`,
                options: [
                    lesson.title,
                    "Advanced programming concepts",
                    "Database management",
                    "Network security"
                ],
                correctAnswer: 0,
                explanation: `The lesson "${lesson.title}" primarily covers this topic.`
            });
        }

        return { questions };
    }
}

export default new QuizService();