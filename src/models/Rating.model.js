import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        instructor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: {
                validator: Number.isInteger,
                message: "Rating must be an integer between 1 and 5"
            }
        },
        review: {
            type: String,
            maxlength: 1000,
            trim: true,
        },
        ratedAt: {
            type: Date,
            default: Date.now,
        },
        // Prevent duplicate ratings
        isRated: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

// Compound index to prevent duplicate ratings
ratingSchema.index({ student: 1, course: 1 }, { unique: true });

// Static method to get instructor rating statistics
ratingSchema.statics.getInstructorStats = async function(instructorId) {
    const stats = await this.aggregate([
        {
            $match: { instructor: new mongoose.Types.ObjectId(instructorId) }
        },
        {
            $group: {
                _id: "$instructor",
                averageRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
                ratingDistribution: {
                    $push: "$rating"
                }
            }
        },
        {
            $project: {
                averageRating: { $round: ["$averageRating", 2] },
                totalRatings: 1,
                ratingDistribution: 1
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: [0, 0, 0, 0, 0]
        };
    }

    // Calculate distribution (1-5 stars)
    const distribution = [0, 0, 0, 0, 0];
    stats[0].ratingDistribution.forEach(rating => {
        if (rating >= 1 && rating <= 5) {
            distribution[rating - 1]++;
        }
    });

    return {
        averageRating: stats[0].averageRating,
        totalRatings: stats[0].totalRatings,
        ratingDistribution: distribution
    };
};

// Static method to check if student has rated course
ratingSchema.statics.hasStudentRatedCourse = async function(studentId, courseId) {
    const existingRating = await this.findOne({
        student: new mongoose.Types.ObjectId(studentId),
        course: new mongoose.Types.ObjectId(courseId)
    });
    
    return !!existingRating;
};

// Static method to get course ratings
ratingSchema.statics.getCourseRatings = async function(courseId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const ratings = await this.find({ course: new mongoose.Types.ObjectId(courseId) })
        .populate('student', 'name avatar')
        .sort({ ratedAt: -1 })
        .skip(skip)
        .limit(limit);
    
    const total = await this.countDocuments({ course: new mongoose.Types.ObjectId(courseId) });
    
    return {
        ratings,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRatings: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
        }
    };
};

export default mongoose.model("Rating", ratingSchema);
