import Course from "../models/Course.model.js";
import Lesson from "../models/Lesson.model.js";
import Progress from "../models/Progress.model.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { createCheckoutSession } from "../services/payment.service.js";

export const createCourse = async (req, res) => {
    try {
        console.log("createCourse called");
        console.log("User:", req.user);
        console.log("Body:", req.body);

        const { title, description, category, level, price, thumbnail, duration, lessons, published } = req.body;

        // Determine status based on published flag
        let status = "Draft";
        if (published === true || published === "true") {
            status = "Pending";
        }

        let thumbnailUrl = thumbnail;
        if (thumbnail && thumbnail.startsWith("data:image")) {
            const base64Data = thumbnail.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const uploadResult = await uploadToCloudinary(buffer, "openlearn/courses");
            thumbnailUrl = uploadResult.secure_url;
        }

        const courseData = {
            title,
            description,
            category,
            level,
            price,
            thumbnail: thumbnailUrl,
            duration,
            instructor: req.user.id,
            status,
            published: false, // Always false until approved
        };
        console.log("Saving course data:", courseData);

        const newCourse = await Course.create(courseData);
        console.log("Course created:", newCourse);

        // Handle lessons if provided
        if (lessons && Array.isArray(lessons) && lessons.length > 0) {
            const createdLessons = [];

            for (let i = 0; i < lessons.length; i++) {
                const lessonData = lessons[i];

                const lesson = await Lesson.create({
                    title: lessonData.title,
                    description: lessonData.description || "",
                    course: newCourse._id,
                    videoUrl: lessonData.videoUrl || "",
                    pdfUrl: lessonData.pdfUrl || "",
                    duration: lessonData.duration || 0,
                    order: i + 1,
                });

                createdLessons.push(lesson._id);
            }

            // Update course with lesson IDs
            newCourse.lessons = createdLessons;
            await newCourse.save();
        }

        // Populate lessons before sending response
        await newCourse.populate('lessons');

        res.status(201).json({
            success: true,
            message: status === "Pending" ? "Course submitted for approval" : "Course created successfully",
            data: newCourse,
        });
    } catch (error) {
        console.error("createCourse error:", error);
        let errorMsg = error.message;
        if (!errorMsg && typeof error === "object") {
            try {
                errorMsg = JSON.stringify(error);
            } catch (e) {
                errorMsg = "Unknown error object";
            }
        }
        res.status(500).json({
            success: false,
            message: "Failed to create course",
            error: errorMsg || String(error),
        });
    }
};

export const getInstructorCourses = async (req, res) => {
    try {
        console.log("getInstructorCourses called for user:", req.user.id);
        const courses = await Course.find({ instructor: req.user.id }).sort({ createdAt: -1 });
        console.log("Found courses count:", courses.length);
        res.status(200).json({
            success: true,
            data: courses,
        });
    } catch (error) {
        console.error("getInstructorCourses error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch courses",
            error: error.message,
        });
    }
};

export const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ status: "Published" }).populate("instructor", "name email").sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: courses,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch courses",
            error: error.message,
        });
    }
};

export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('lessons');
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }
        res.status(200).json({
            success: true,
            data: course,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch course",
            error: error.message,
        });
    }
};

export const updateCourse = async (req, res) => {
    try {
        let { lessons, ...courseData } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        // Ensure user is the instructor of the course or an admin
        if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this course",
            });
        }

        // Handle Status Change
        if (courseData.published === true || courseData.published === "true") {
            courseData.status = "Pending";
            courseData.published = false; // Keep hidden until approved
        }

        if (courseData.thumbnail && courseData.thumbnail.startsWith("data:image")) {
            const base64Data = courseData.thumbnail.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const uploadResult = await uploadToCloudinary(buffer, "openlearn/courses");
            courseData.thumbnail = uploadResult.secure_url;
        }

        // Handle Lessons Update
        if (lessons && Array.isArray(lessons)) {
            const updatedLessonIds = [];

            for (let i = 0; i < lessons.length; i++) {
                const lessonData = lessons[i];

                if (lessonData._id || lessonData.id) {
                    // Update existing lesson
                    const lessonId = lessonData._id || lessonData.id;
                    await Lesson.findByIdAndUpdate(lessonId, {
                        title: lessonData.title,
                        description: lessonData.description,
                        videoUrl: lessonData.videoUrl,
                        pdfUrl: lessonData.pdfUrl,
                        duration: lessonData.duration,
                        order: i + 1
                    });
                    updatedLessonIds.push(lessonId);
                } else {
                    // Create new lesson
                    const newLesson = await Lesson.create({
                        title: lessonData.title,
                        description: lessonData.description || "",
                        course: course._id,
                        videoUrl: lessonData.videoUrl || "",
                        pdfUrl: lessonData.pdfUrl || "",
                        duration: lessonData.duration || 0,
                        order: i + 1,
                    });
                    updatedLessonIds.push(newLesson._id);
                }
            }

            // Assign the updated list of lesson IDs to courseData
            courseData.lessons = updatedLessonIds;
        }

        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, courseData, {
            new: true,
            runValidators: true,
        }).populate('lessons');

        res.status(200).json({
            success: true,
            message: courseData.status === "Pending" ? "Course submitted for approval" : "Course updated successfully",
            data: updatedCourse,
        });
    } catch (error) {
        console.error("updateCourse error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update course",
            error: error.message,
        });
    }
};

export const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        // Ensure user is the instructor of the course or an admin
        if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this course",
            });
        }

        await course.deleteOne();

        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete course",
            error: error.message,
        });
    }
};

export const enrollCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        // Check if already enrolled
        if (course.students.includes(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: "You are already enrolled in this course",
            });
        }

        const session = await createCheckoutSession({
            course,
            studentId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: "Checkout session created",
            url: session.url
        });
    } catch (error) {
        console.error("Enrollment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to enroll in course",
            error: error.message,
        });
    }
};

export const getEnrolledCourses = async (req, res) => {
    try {
        const courses = await Course.find({ students: req.user.id })
            .populate("instructor", "name")
            .populate("lessons");
        
        // Add progress data to each course
        const coursesWithProgress = await Promise.all(
            courses.map(async (course) => {
                const progress = await Progress.findOne({
                    user: req.user.id,
                    course: course._id
                });
                
                const completedCount = progress ? progress.completedLessons.length : 0;
                const totalLessons = course.lessons ? course.lessons.length : 0;
                const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                
                return {
                    ...course.toObject(),
                    progress: progressPercentage,
                    completedLessons: progress ? progress.completedLessons : [],
                    completedCount
                };
            })
        );
        
        res.status(200).json({
            success: true,
            data: coursesWithProgress,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch enrolled courses",
            error: error.message,
        });
    }
};

// --- Admin Controllers ---


export const getPendingCourses = async (req, res) => {
    try {
        const courses = await Course.find({ status: 'Pending' }).populate('instructor', 'name email').sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: courses,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending courses",
            error: error.message,
        });
    }
};

export const getAllCoursesAdmin = async (req, res) => {
    try {
        const courses = await Course.find().populate('instructor', 'name email').sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: courses,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch all courses",
            error: error.message,
        });
    }
};


export const approveCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'Published', published: true },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.status(200).json({
            success: true,
            message: "Course approved successfully",
            data: course,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to approve course",
            error: error.message,
        });
    }
};

export const rejectCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'Rejected', published: false },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.status(200).json({
            success: true,
            message: "Course rejected",
            data: course,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to reject course",
            error: error.message,
        });
    }
};

export const getCourseProgress = async (req, res) => {
    try {
        const { id } = req.params; // Course ID
        const userId = req.user.id;

        const progress = await Progress.findOne({ user: userId, course: id });

        if (!progress) {
            // If enrolled but no progress record yet (legacy), return empty
            return res.status(200).json({
                success: true,
                data: {
                    completedLessons: [],
                    completedCount: 0
                }
            });
        }

        res.status(200).json({
            success: true,
            data: progress
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch progress",
            error: error.message,
        });
    }
};

export const markLessonComplete = async (req, res) => {
    try {
        const { id, lessonId } = req.params; // id is Course ID
        const userId = req.user.id;

        let progress = await Progress.findOne({ user: userId, course: id });

        if (!progress) {
            // Create if not exists (auto-enroll check should ideally happen before)
            progress = await Progress.create({
                user: userId,
                course: id,
                completedLessons: [],
                completedCount: 0
            });
        }

        // Add lesson if not already completed
        if (!progress.completedLessons.includes(lessonId)) {
            progress.completedLessons.push(lessonId);
            progress.completedCount = progress.completedLessons.length;
            await progress.save();
        }

        res.status(200).json({
            success: true,
            message: "Lesson marked as complete",
            data: progress
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update progress",
            error: error.message,
        });
    }
};

export const getStudentStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get Enrolled Courses
        const enrolledCourses = await Course.find({ students: userId }).populate("lessons");
        const enrolledCount = enrolledCourses.length;

        // 2. Get Progress Records
        const progressRecords = await Progress.find({ user: userId });
        
        let completedCount = 0;
        let totalProgressSum = 0;
        let totalLearningMinutes = 0;

        enrolledCourses.forEach(course => {
            const progress = progressRecords.find(p => p.course.toString() === course._id.toString());
            const completedCountForCourse = progress ? progress.completedLessons.length : 0;
            const totalLessons = course.lessons ? course.lessons.length : 0;
            const progressPercentage = totalLessons > 0 ? Math.round((completedCountForCourse / totalLessons) * 100) : 0;
            
            if (progressPercentage === 100) {
                completedCount++;
            }
            totalProgressSum += progressPercentage;
            
            // Sum durations of completed lessons
            if (progress && progress.completedLessons.length > 0) {
                const completedLessonIds = progress.completedLessons.map(id => id.toString());
                course.lessons.forEach(lesson => {
                    if (completedLessonIds.includes(lesson._id.toString())) {
                        totalLearningMinutes += (lesson.duration || 30); // Fallback to 30 mins
                    }
                });
            }
        });

        const overallProgress = enrolledCount > 0 ? Math.round(totalProgressSum / enrolledCount) : 0;
        const learningHours = Math.ceil(totalLearningMinutes / 60);

        res.status(200).json({
            success: true,
            data: {
                enrolledCourses: enrolledCount,
                learningHours: learningHours,
                completedCourses: completedCount,
                overallProgress: overallProgress
            }
        });

    } catch (error) {
        console.error("getStudentStats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch student statistics",
            error: error.message,
        });
    }
};
