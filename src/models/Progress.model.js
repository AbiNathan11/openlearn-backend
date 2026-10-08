import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },
        completedLessons: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lesson",
            },
        ],
        completedCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Compound index to ensure a user has only one progress record per course
progressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);
