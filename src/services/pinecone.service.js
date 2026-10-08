import { Pinecone } from '@pinecone-database/pinecone';

class PineconeService {
    constructor() {
        this.pinecone = null;
        this.index = null;
        this.indexName = process.env.PINECONE_INDEX_NAME || 'openlearn-embeddings';
        this.isConnected = false;
    }

    // Connect to Pinecone
    async connect() {
        try {
            if (this.isConnected) return;

            const apiKey = process.env.PINECONE_API_KEY;
            if (!apiKey) {
                throw new Error('PINECONE_API_KEY environment variable is required');
            }

            this.pinecone = new Pinecone({
                apiKey: apiKey
            });

            // Use existing index by connecting directly to the host
            const indexName = process.env.PINECONE_INDEX_NAME || 'openlearn';
            const host = process.env.PINECONE_HOST;

            if (host) {
                // Connect to existing index using host
                this.index = this.pinecone.index(host);
                console.log('Connected to existing Pinecone index:', host);
            } else {
                // Fallback to index name
                this.index = this.pinecone.index(indexName);
                console.log('Connected to Pinecone index:', indexName);
            }

            this.isConnected = true;
            console.log('Pinecone connected successfully');
        } catch (error) {
            console.error('Error connecting to Pinecone:', error);
            throw error;
        }
    }

    // Store embeddings in Pinecone
    async storeEmbeddings(embeddings) {
        try {
            await this.connect();

            const vectors = embeddings.map((embedding, index) => ({
                id: `${embedding.metadata.lessonId}_${embedding.metadata.source}_${index}_${Date.now()}`,
                values: embedding.embedding,
                metadata: {
                    lessonId: embedding.metadata.lessonId,
                    courseId: embedding.metadata.courseId,
                    title: embedding.metadata.title,
                    source: embedding.metadata.source,
                    text: embedding.text,
                    chunkIndex: embedding.metadata.chunkIndex,
                    chunkLength: embedding.metadata.chunkLength,
                    createdAt: embedding.metadata.createdAt
                }
            }));

            // Batch upsert to Pinecone (max 100 vectors per request)
            const batchSize = 100;
            const results = [];

            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                const result = await this.index.upsert(batch);
                results.push(result);
                console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
            }

            console.log(`Successfully stored ${vectors.length} embeddings in Pinecone`);

            return {
                success: true,
                upsertedCount: vectors.length,
                batchesProcessed: results.length
            };
        } catch (error) {
            console.error('Error storing embeddings in Pinecone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Search for similar embeddings
    async searchSimilar(queryEmbedding, filters = {}, limit = 5) {
        try {
            await this.connect();

            // Build filter for Pinecone
            const filter = {};
            if (filters.lessonId) filter.lessonId = filters.lessonId;
            if (filters.courseId) filter.courseId = filters.courseId;
            if (filters.source) filter.source = filters.source;

            const queryRequest = {
                vector: queryEmbedding,
                topK: limit,
                includeMetadata: true
            };

            if (Object.keys(filter).length > 0) {
                queryRequest.filter = filter;
            }

            const response = await this.index.query(queryRequest);

            const results = response.matches.map(match => ({
                id: match.id,
                score: match.score,
                text: match.metadata.text,
                lessonId: match.metadata.lessonId,
                courseId: match.metadata.courseId,
                title: match.metadata.title,
                source: match.metadata.source,
                chunkIndex: match.metadata.chunkIndex,
                chunkLength: match.metadata.chunkLength,
                createdAt: match.metadata.createdAt,
                embedding: [] // Not returned by Pinecone for efficiency
            }));

            return {
                success: true,
                results,
                totalSearched: response.namespace?.usage?.readUnits || results.length
            };
        } catch (error) {
            console.error('Error searching similar embeddings in Pinecone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get embeddings by lesson
    async getLessonEmbeddings(lessonId) {
        try {
            await this.connect();

            const response = await this.index.query({
                filter: { lessonId },
                topK: 1000, // Get all embeddings for this lesson
                includeMetadata: true,
                vector: Array(1536).fill(0) // Dummy vector for filtering
            });

            const embeddings = response.matches.map(match => ({
                id: match.id,
                text: match.metadata.text,
                lessonId: match.metadata.lessonId,
                courseId: match.metadata.courseId,
                title: match.metadata.title,
                source: match.metadata.source,
                chunkIndex: match.metadata.chunkIndex,
                chunkLength: match.metadata.chunkLength,
                createdAt: match.metadata.createdAt,
                score: match.score
            }));

            return {
                success: true,
                embeddings,
                count: embeddings.length
            };
        } catch (error) {
            console.error('Error getting lesson embeddings from Pinecone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get embeddings by course
    async getCourseEmbeddings(courseId) {
        try {
            await this.connect();

            const response = await this.index.query({
                filter: { courseId },
                topK: 1000, // Get all embeddings for this course
                includeMetadata: true,
                vector: Array(1536).fill(0) // Dummy vector for filtering
            });

            const embeddings = response.matches.map(match => ({
                id: match.id,
                text: match.metadata.text,
                lessonId: match.metadata.lessonId,
                courseId: match.metadata.courseId,
                title: match.metadata.title,
                source: match.metadata.source,
                chunkIndex: match.metadata.chunkIndex,
                chunkLength: match.metadata.chunkLength,
                createdAt: match.metadata.createdAt,
                score: match.score
            }));

            return {
                success: true,
                embeddings,
                count: embeddings.length
            };
        } catch (error) {
            console.error('Error getting course embeddings from Pinecone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete embeddings by lesson
    async deleteLessonEmbeddings(lessonId) {
        try {
            await this.connect();

            // First, get all embeddings for this lesson
            const lessonEmbeddings = await this.getLessonEmbeddings(lessonId);
            
            if (!lessonEmbeddings.success) {
                throw new Error('Failed to retrieve lesson embeddings for deletion');
            }

            // Delete all embeddings for this lesson
            const vectorIds = lessonEmbeddings.embeddings.map(embedding => embedding.id);
            
            if (vectorIds.length > 0) {
                await this.index.deleteOne(vectorIds);
            }

            return {
                success: true,
                deletedCount: vectorIds.length
            };
        } catch (error) {
            console.error('Error deleting lesson embeddings from Pinecone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update embeddings for a lesson
    async updateLessonEmbeddings(lessonId, newEmbeddings) {
        try {
            // Delete existing embeddings
            await this.deleteLessonEmbeddings(lessonId);
            
            // Store new embeddings
            return await this.storeEmbeddings(newEmbeddings);
        } catch (error) {
            console.error('Error updating lesson embeddings in Pinecone:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get Pinecone statistics
    async getStatistics() {
        try {
            await this.connect();

            const indexDescription = await this.index.describeIndexStats();
            
            return {
                success: true,
                stats: {
                    totalVectorCount: indexDescription.totalVectorCount,
                    dimension: indexDescription.dimension,
                    indexFullness: indexDescription.indexFullness,
                    namespaces: indexDescription.namespaces
                }
            };
        } catch (error) {
            console.error('Error getting Pinecone statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create namespace for a course (optional organization)
    async createCourseNamespace(courseId) {
        try {
            await this.connect();
            
            // Pinecone automatically handles namespaces through the query filter
            // This method is for documentation purposes
            console.log(`Course namespace concept: Use courseId filter in queries for course: ${courseId}`);
            
            return {
                success: true,
                message: 'Use courseId filter in queries for course-specific operations'
            };
        } catch (error) {
            console.error('Error creating course namespace:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Close connection (cleanup)
    async close() {
        this.isConnected = false;
        this.index = null;
        this.pinecone = null;
        console.log('Pinecone connection closed');
    }
}

export default new PineconeService();
