import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: ["student", "instructor", "admin"],
            default: "student",
        },
        phone: { type: String, default: "" },
        bio: { type: String, default: "" },
        expertise: { type: String, default: "" },
        location: { type: String, default: "" },
        website: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        twitter: { type: String, default: "" },
        avatar: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
        deactivationReason: { type: String, default: "" },
        deactivatedAt: { type: Date, default: null },
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
