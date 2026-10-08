import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export const uploadToCloudinary = async (fileBuffer, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    } catch (error) {
        throw error;
    }
};

export default cloudinary;
