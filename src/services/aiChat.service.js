import OpenAI from 'openai';

class AIChatService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    // Simple RAG implementation using OpenAI embeddings and basic text matching
    async generateResponse(question, courseId, lessons, currentLessonId) {
        try {
            console.log('Starting AI chat response generation...');
            console.log('Question:', question);
            console.log('Course ID:', courseId);
            // Note: currentLessonId is ignored for this implementation
            console.log('Lessons count:', lessons?.length);
            
            // Create lesson context from course materials
            const lessonContext = this.createLessonContext(lessons);
            
            // Simple keyword-based retrieval (simplified RAG) for completed lessons
            const relevantContext = this.retrieveRelevantContext(lessonContext, question);
            
            console.log('Relevant context length:', relevantContext.length);
            
            // Generate AI response with context
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are an AI teaching assistant for an online learning platform. 
                        Use the following lesson content to answer the student's question.
                        Focus on lessons the student has completed and studied.
                        If the answer is not found in the provided context, say so politely 
                        and suggest what the student should focus on learning.
                        
                        Context:
                        ${relevantContext}`
                    },
                    {
                        role: "user",
                        content: question
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
            });

            const answer = response.choices[0].message.content;
            console.log('AI response generated successfully');

            return {
                success: true,
                answer,
                sources: this.identifySources(relevantContext, lessons),
            };

        } catch (error) {
            console.error('Error generating AI response:', error.message);
            console.error('OpenAI Error Details:', error.response?.data || error);
            
            return {
                success: false,
                error: 'Failed to generate response. Please try again.',
                details: error.message
            };
        }
    }

    // Create context from all lessons
    createLessonContext(lessons) {
        return lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            description: lesson.description || '',
            content: lesson.content || lesson.transcript || '',
            order: lesson.order
        }));
    }

    // Simple keyword-based retrieval (simplified RAG) for completed lessons
    retrieveRelevantContext(lessonContext, question) {
        const keywords = question.toLowerCase().split(' ').filter(word => word.length > 3);
        
        let relevantLessons = lessonContext.map(lesson => {
            let score = 0;
            const fullText = `${lesson.title} ${lesson.description} ${lesson.content}`.toLowerCase();
            
            keywords.forEach(keyword => {
                if (fullText.includes(keyword)) {
                    score += 1;
                }
            });
            
            return { ...lesson, relevanceScore: score };
        });

        // Sort by relevance and take top 3
        relevantLessons.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const topLessons = relevantLessons.slice(0, 3);
        
        return topLessons.map(lesson => 
            `Lesson: ${lesson.title}\nDescription: ${lesson.description}\nContent: ${lesson.content}`
        ).join('\n\n---\n\n');
    }

    // Identify which lessons were used as sources
    identifySources(context, lessons) {
        const contextTitles = context.split('Lesson:').slice(1).map(text => text.split('\n')[0].trim());
        
        return contextTitles.map(title => {
            const lesson = lessons.find(l => l.title === title);
            return {
                lessonTitle: title,
                lessonOrder: lesson?.order || 0
            };
        });
    }

    // Fallback response
    generateFallbackResponse(question) {
        return {
            success: true,
            answer: `I understand you're asking about: "${question}". As an AI assistant, I'm here to help you with your course content. Please make sure you have your OpenAI API key configured to get detailed responses based on your lesson materials.`,
            sources: [],
        };
    }
}

export default new AIChatService();
