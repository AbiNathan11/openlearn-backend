import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import pineconeService from './pinecone.service.js';

class EmbeddingsService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    // Extract text from video using speech-to-text
    async extractVideoText(videoPath) {
        try {
            console.log('Extracting text from video:', videoPath);
            
            // For now, return existing transcript if available
            // In production, you would use OpenAI Whisper or similar
            const transcript = await this.transcribeVideo(videoPath);
            
            return {
                success: true,
                text: transcript,
                source: 'video',
                metadata: {
                    filePath: videoPath,
                    extractedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error extracting video text:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Transcribe video using OpenAI Whisper (requires video to be accessible)
    async transcribeVideo(videoPath) {
        try {
            // Note: This requires the video file to be accessible by OpenAI API
            // You might need to upload to a temporary location or use local Whisper
            
            // For now, return placeholder - implement actual transcription
            console.log('Video transcription placeholder - implement OpenAI Whisper');
            return "Video transcript would be extracted here using speech-to-text";
            
            /* 
            // Actual implementation would look like:
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(videoPath),
                model: "whisper-1",
            });
            
            return transcription.text;
            */
        } catch (error) {
            console.error('Error transcribing video:', error);
            throw error;
        }
    }

    // Extract text from PDF
    async extractPDFText(pdfPath) {
        try {
            console.log('Extracting text from PDF:', pdfPath);
            
            // Use pdf-parse library
            const pdfParse = await import('pdf-parse');
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdfParse.default(dataBuffer);
            
            return {
                success: true,
                text: data.text,
                source: 'pdf',
                metadata: {
                    filePath: pdfPath,
                    pages: data.numpages,
                    extractedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate embeddings for text
    async generateEmbeddings(text, metadata = {}) {
        try {
            console.log('Generating embeddings for text length:', text.length);
            
            // Split text into chunks for better embedding
            const chunks = this.chunkText(text);
            const embeddings = [];
            
            for (const chunk of chunks) {
                const response = await this.openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: chunk,
                });
                
                embeddings.push({
                    text: chunk,
                    embedding: response.data[0].embedding,
                    metadata: {
                        ...metadata,
                        chunkIndex: embeddings.length,
                        chunkLength: chunk.length,
                        createdAt: new Date().toISOString()
                    }
                });
            }
            
            console.log(`Generated ${embeddings.length} embeddings`);
            return {
                success: true,
                embeddings,
                totalChunks: chunks.length
            };
        } catch (error) {
            console.error('Error generating embeddings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Split text into chunks for embedding
    chunkText(text, maxChunkSize = 1000) {
        const chunks = [];
        const sentences = text.split('. ');
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length < maxChunkSize) {
                currentChunk += sentence + '. ';
            } else {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = sentence + '. ';
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    // Process lesson content and generate embeddings
    async processLessonContent(lesson) {
        try {
            console.log('Processing lesson content for embeddings:', lesson.title);
            
            const allText = [];
            const embeddings = [];
            
            // Process video content
            if (lesson.videoUrl) {
                const videoResult = await this.extractVideoText(lesson.videoUrl);
                if (videoResult.success) {
                    allText.push({
                        text: videoResult.text,
                        source: 'video',
                        metadata: videoResult.metadata
                    });
                }
            }
            
            // Process existing transcript
            if (lesson.transcript) {
                allText.push({
                    text: lesson.transcript,
                    source: 'transcript',
                    metadata: { source: 'existing_transcript' }
                });
            }
            
            // Process PDF content
            if (lesson.pdfUrl) {
                const pdfResult = await this.extractPDFText(lesson.pdfUrl);
                if (pdfResult.success) {
                    allText.push({
                        text: pdfResult.text,
                        source: 'pdf',
                        metadata: pdfResult.metadata
                    });
                }
            }
            
            // Process lesson content text
            if (lesson.content) {
                allText.push({
                    text: lesson.content,
                    source: 'content',
                    metadata: { source: 'lesson_content' }
                });
            }
            
            // Generate embeddings for all text
            for (const textItem of allText) {
                const embeddingResult = await this.generateEmbeddings(
                    textItem.text,
                    {
                        lessonId: lesson._id,
                        courseId: lesson.course,
                        title: lesson.title,
                        source: textItem.source,
                        ...textItem.metadata
                    }
                );
                
                if (embeddingResult.success) {
                    embeddings.push(...embeddingResult.embeddings);
                }
            }
            
            return {
                success: true,
                embeddings,
                processedSources: allText.map(item => item.source),
                totalEmbeddings: embeddings.length
            };
            
        } catch (error) {
            console.error('Error processing lesson content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Search for similar content using embeddings
    async searchSimilarContent(queryEmbedding, embeddings, limit = 5) {
        try {
            // Use Pinecone for similarity search
            const searchResult = await pineconeService.searchSimilar(
                queryEmbedding, 
                {}, // No filters for general search
                limit
            );
            
            if (searchResult.success) {
                return {
                    success: true,
                    results: searchResult.results,
                    totalSearched: searchResult.totalSearched
                };
            } else {
                // Fallback to local cosine similarity calculation
                const similarities = embeddings.map(embedding => {
                    const similarity = this.cosineSimilarity(queryEmbedding, embedding.embedding);
                    return {
                        ...embedding,
                        similarity
                    };
                });
                
                // Sort by similarity and return top results
                similarities.sort((a, b) => b.similarity - a.similarity);
                const topResults = similarities.slice(0, limit);
                
                return {
                    success: true,
                    results: topResults,
                    totalSearched: embeddings.length
                };
            }
        } catch (error) {
            console.error('Error searching similar content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Calculate cosine similarity between two vectors
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        
        return dotProduct / (normA * normB);
    }

    // Generate query embedding
    async generateQueryEmbedding(query) {
        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: query,
            });
            
            return {
                success: true,
                embedding: response.data[0].embedding
            };
        } catch (error) {
            console.error('Error generating query embedding:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new EmbeddingsService();
