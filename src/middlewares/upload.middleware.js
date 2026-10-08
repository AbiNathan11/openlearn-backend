import multer from "multer";
import path from "path";

// Configure storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    // Accept videos and PDFs
    const allowedMimes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only videos, PDFs, and images are allowed.`), false);
    }
};

// Create multer upload instance
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: fileFilter,
});

// Middleware for different upload scenarios
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10); // Max 10 files
export const uploadFields = upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]);
