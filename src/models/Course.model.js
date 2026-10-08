import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        instructor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        level: {
            type: String,
            enum: ["Beginner", "Intermediate", "Advanced"],
            default: "Beginner",
        },
        price: {
            type: Number,
            default: 0,
        },
        duration: {
            type: Number,
            default: 0,
        },
        thumbnail: {
            type: String,
            default: "", // URL to image
        },
        published: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["Draft", "Pending", "Published", "Rejected"],
            default: "Draft",
        },
        lessons: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lesson",
            },
        ],
        students: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        enrolledStudents: [
            {
                student: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                enrolledAt: {
                    type: Date,
                    default: Date.now,
                },
                completed: {
                    type: Boolean,
                    default: false,
                },
                completedAt: {
                    type: Date,
                },
                progress: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100,
                }
            },
        ],
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
        ratingDistribution: {
            type: [Number], // [1-star, 2-star, 3-star, 4-star, 5-star counts]
            default: [0, 0, 0, 0, 0],
        },
    },
    { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
