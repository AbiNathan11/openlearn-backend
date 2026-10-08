import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true,
        },
        videoUrl: {
            type: String,
            default: "", // URL to video (could be Cloudinary, YouTube, etc.)
        },
        pdfUrl: {
            type: String,
            default: "", // URL to PDF file
        },
        duration: {
            type: Number, // in minutes
            default: 0,
        },
        order: {
            type: Number, // for ordering lessons
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Lesson", lessonSchema);
