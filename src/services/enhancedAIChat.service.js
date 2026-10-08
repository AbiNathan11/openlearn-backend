import OpenAI from 'openai';
import embeddingsService from './embeddings.service.js';
import pineconeService from './pinecone.service.js';

class EnhancedAIChatService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    // Generate AI response using vector-based RAG
    async generateResponse(question, courseId, lessons, currentLessonId) {
        try {
            console.log('Starting enhanced AI chat response generation...');
            console.log('Question:', question);
            console.log('Course ID:', courseId);
            console.log('Lessons count:', lessons?.length);
            
            // Generate query embedding
            const queryEmbeddingResult = await embeddingsService.generateQueryEmbedding(question);
            if (!queryEmbeddingResult.success) {
                throw new Error('Failed to generate query embedding');
            }
            
            const queryEmbedding = queryEmbeddingResult.embedding;
            
            // Search for similar content in Pinecone
            const searchResult = await pineconeService.searchSimilar(
                queryEmbedding,
                { courseId },
                5
            );
            
            let relevantContext = '';
            let sources = [];
            
            if (searchResult.success && searchResult.results.length > 0) {
                // Format retrieved content as context
                relevantContext = this.formatContextFromEmbeddings(searchResult.results);
                sources = this.identifySources(searchResult.results);
                
                console.log('Found relevant context from vector search');
                console.log('Context length:', relevantContext.length);
                console.log('Sources found:', sources.length);
            } else {
                // Fallback to traditional keyword-based search
                console.log('No vector results, falling back to keyword search');
                const fallbackResult = await this.fallbackSearch(lessons, question);
                relevantContext = fallbackResult.context;
                sources = fallbackResult.sources;
            }
            
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
            console.log('Enhanced AI response generated successfully');

            return {
                success: true,
                answer,
                sources,
                method: searchResult.success ? 'vector_search' : 'keyword_search',
                contextUsed: relevantContext.length > 0
            };

        } catch (error) {
            console.error('Error generating enhanced AI response:', error);
            console.error('OpenAI Error Details:', error.response?.data || error);
            
            return {
                success: false,
                error: 'Failed to generate response. Please try again.',
                details: error.message
            };
        }
    }

    // Format context from embedding results
    formatContextFromEmbeddings(embeddingResults) {
        const contextParts = embeddingResults.map(result => {
            const similarity = result.similarity.toFixed(3);
            const source = result.source || 'unknown';
            const title = result.title || 'Untitled';
            
            return `[Source: ${source} | Title: ${title} | Similarity: ${similarity}]\n${result.text}`;
        });
        
        return contextParts.join('\n\n---\n\n');
    }

    // Identify sources from embedding results
    identifySources(embeddingResults) {
        const sources = embeddingResults.map(result => ({
            lessonId: result.lessonId,
            title: result.title,
            source: result.source,
            similarity: result.similarity,
            text: result.text.substring(0, 100) + '...'
        }));
        
        // Remove duplicates and sort by similarity
        const uniqueSources = sources.filter((source, index, self) =>
            index === self.findIndex(s => s.lessonId === source.lessonId && s.source === source.source)
        );
        
        return uniqueSources.sort((a, b) => b.similarity - a.similarity);
    }

    // Fallback keyword-based search
    async fallbackSearch(lessons, question) {
        const keywords = question.toLowerCase().split(' ').filter(word => word.length > 3);
        
        let relevantLessons = lessons.map(lesson => {
            let score = 0;
            const fullText = `${lesson.title} ${lesson.description} ${lesson.content || lesson.transcript || ''}`.toLowerCase();
            
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
        
        const context = topLessons.map(lesson => 
            `Lesson: ${lesson.title}\nDescription: ${lesson.description}\nContent: ${lesson.content || lesson.transcript || ''}`
        ).join('\n\n---\n\n');
        
        const sources = topLessons.map(lesson => ({
            lessonId: lesson._id,
            title: lesson.title,
            source: 'keyword_search',
            similarity: lesson.relevanceScore / keywords.length,
            text: (lesson.content || lesson.transcript || '').substring(0, 100) + '...'
        }));
        
        return {
            context,
            sources
        };
    }

    // Process and store embeddings for a lesson
    async processLessonEmbeddings(lesson) {
        try {
            console.log('Processing embeddings for lesson:', lesson.title);
            
            // Extract and process content
            const processResult = await embeddingsService.processLessonContent(lesson);
            
            if (!processResult.success) {
                throw new Error(processResult.error);
            }
            
            // Store embeddings in Pinecone
            const storeResult = await pineconeService.updateLessonEmbeddings(
                lesson._id,
                processResult.embeddings
            );
            
            console.log(`Successfully processed and stored ${processResult.totalEmbeddings} embeddings for lesson: ${lesson.title}`);
            
            return {
                success: true,
                embeddingsStored: storeResult.insertedCount || 0,
                processedSources: processResult.processedSources,
                totalEmbeddings: processResult.totalEmbeddings
            };
            
        } catch (error) {
            console.error('Error processing lesson embeddings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get vector database statistics
    async getVectorDBStats() {
        try {
            return await pineconeService.getStatistics();
        } catch (error) {
            console.error('Error getting vector DB stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Search for specific content in a course
    async searchCourseContent(courseId, query, limit = 10) {
        try {
            // Generate query embedding
            const queryEmbeddingResult = await embeddingsService.generateQueryEmbedding(query);
            if (!queryEmbeddingResult.success) {
                throw new Error('Failed to generate query embedding');
            }
            
            // Search in Pinecone
            const searchResult = await pineconeService.searchSimilar(
                queryEmbeddingResult.embedding,
                { courseId },
                limit
            );
            
            return {
                success: true,
                results: searchResult.results,
                totalFound: searchResult.totalSearched
            };
            
        } catch (error) {
            console.error('Error searching course content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Rebuild embeddings for a course
    async rebuildCourseEmbeddings(courseId, lessons) {
        try {
            console.log('Rebuilding embeddings for course:', courseId);
            
            let totalProcessed = 0;
            let errors = [];
            
            for (const lesson of lessons) {
                try {
                    const result = await this.processLessonEmbeddings(lesson);
                    if (result.success) {
                        totalProcessed += result.embeddingsStored;
                    } else {
                        errors.push({
                            lessonId: lesson._id,
                            title: lesson.title,
                            error: result.error
                        });
                    }
                } catch (error) {
                    errors.push({
                        lessonId: lesson._id,
                        title: lesson.title,
                        error: error.message
                    });
                }
            }
            
            console.log(`Completed rebuilding embeddings for course: ${totalProcessed} embeddings processed`);
            
            return {
                success: true,
                totalEmbeddingsProcessed: totalProcessed,
                lessonsProcessed: lessons.length - errors.length,
                errors
            };
            
        } catch (error) {
            console.error('Error rebuilding course embeddings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new EnhancedAIChatService();
