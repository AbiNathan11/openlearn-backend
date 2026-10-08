import { uploadToCloudinary } from "../config/cloudinary.js";

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        const file = req.file;
        let resourceType = 'auto';
        let folder = 'openlearn';

        // Determine resource type and folder based on file type
        if (file.mimetype.startsWith('video/')) {
            resourceType = 'video';
            folder = 'openlearn/videos';
        } else if (file.mimetype === 'application/pdf') {
            resourceType = 'raw';
            folder = 'openlearn/pdfs';
        } else if (file.mimetype.startsWith('image/')) {
            resourceType = 'image';
            folder = 'openlearn/images';
        }

        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET ||
            process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
            return res.status(500).json({
                success: false,
                message: "Cloudinary not configured. Please add credentials to .env file.",
            });
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(file.buffer, folder, resourceType);

        res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                format: result.format,
            },
        });
    } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to upload file",
            error: error.message,
        });
    }
};
