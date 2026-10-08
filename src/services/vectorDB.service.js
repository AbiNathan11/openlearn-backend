import { MongoClient } from 'mongodb';

class VectorDBService {
    constructor() {
        this.client = null;
        this.db = null;
        this.collection = null;
        this.isConnected = false;
    }

    // Connect to MongoDB
    async connect() {
        try {
            if (this.isConnected) return;

            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/openlearn';
            this.client = new MongoClient(mongoUri);
            
            await this.client.connect();
            this.db = this.client.db();
            this.collection = this.db.collection('embeddings');
            
            // Create index for vector search
            await this.collection.createIndex({
                embedding: 1,
                lessonId: 1,
                courseId: 1,
                source: 1
            });
            
            this.isConnected = true;
            console.log('Vector DB connected successfully');
        } catch (error) {
            console.error('Error connecting to Vector DB:', error);
            throw error;
        }
    }

    // Store embeddings
    async storeEmbeddings(embeddings) {
        try {
            await this.connect();
            
            const documents = embeddings.map(embedding => ({
                ...embedding,
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            
            const result = await this.collection.insertMany(documents);
            console.log(`Stored ${result.insertedCount} embeddings in vector DB`);
            
            return {
                success: true,
                insertedCount: result.insertedCount,
                insertedIds: result.insertedIds
            };
        } catch (error) {
            console.error('Error storing embeddings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Search similar embeddings
    async searchSimilar(queryEmbedding, filters = {}, limit = 5) {
        try {
            await this.connect();
            
            // Build query filter
            const query = {};
            if (filters.lessonId) query.lessonId = filters.lessonId;
            if (filters.courseId) query.courseId = filters.courseId;
            if (filters.source) query.source = filters.source;
            
            // Get all embeddings matching filters
            const embeddings = await this.collection.find(query).toArray();
            
            // Calculate similarities
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
        } catch (error) {
            console.error('Error searching similar embeddings:', error);
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
            
            const embeddings = await this.collection.find({ lessonId }).toArray();
            
            return {
                success: true,
                embeddings,
                count: embeddings.length
            };
        } catch (error) {
            console.error('Error getting lesson embeddings:', error);
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
            
            const embeddings = await this.collection.find({ courseId }).toArray();
            
            return {
                success: true,
                embeddings,
                count: embeddings.length
            };
        } catch (error) {
            console.error('Error getting course embeddings:', error);
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
            
            const result = await this.collection.deleteMany({ lessonId });
            
            return {
                success: true,
                deletedCount: result.deletedCount
            };
        } catch (error) {
            console.error('Error deleting lesson embeddings:', error);
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
            console.error('Error updating lesson embeddings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get embedding statistics
    async getStatistics() {
        try {
            await this.connect();
            
            const stats = await this.collection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalEmbeddings: { $sum: 1 },
                        uniqueLessons: { $addToSet: "$lessonId" },
                        uniqueCourses: { $addToSet: "$courseId" },
                        sources: { $addToSet: "$source" }
                    }
                },
                {
                    $project: {
                        totalEmbeddings: 1,
                        uniqueLessons: { $size: "$uniqueLessons" },
                        uniqueCourses: { $size: "$uniqueCourses" },
                        sources: { $size: "$sources" }
                    }
                }
            ]).toArray();
            
            return {
                success: true,
                stats: stats[0] || {
                    totalEmbeddings: 0,
                    uniqueLessons: 0,
                    uniqueCourses: 0,
                    sources: 0
                }
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Calculate cosine similarity
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
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (normA * normB);
    }

    // Close connection
    async close() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('Vector DB connection closed');
        }
    }
}

export default new VectorDBService();
