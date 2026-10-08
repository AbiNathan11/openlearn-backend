import Rating from '../models/Rating.model.js';
import Course from '../models/Course.model.js';
import Progress from '../models/Progress.model.js';
import mongoose from 'mongoose';

// Submit rating for a course
export const submitRating = async (req, res) => {
    try {
        const { courseId, rating, review } = req.body;
        const studentId = req.user._id;

        // 1. Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // 2. Check if student is enrolled and completed the course
        const isEnrolled = course.students.includes(studentId);
        
        if (!isEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must be enrolled in this course to rate it'
            });
        }

        // Check if student has completed the course (100% progress)
        const studentProgress = await Progress.findOne({
            user: studentId,
            course: courseId
        });

        if (!studentProgress) {
            return res.status(403).json({
                success: false,
                message: 'You must complete the course before rating it'
            });
        }

        // Get course details to calculate progress
        const courseDetails = await Course.findById(courseId);
        if (!courseDetails) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Calculate progress percentage
        const totalLessons = courseDetails.lessons.length;
        const completedLessons = studentProgress.completedCount;
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        if (progressPercentage < 100) {
            return res.status(403).json({
                success: false,
                message: `You must complete the course before rating it. Current progress: ${progressPercentage}%`
            });
        }

        // 3. Check if already rated
        const existingRating = await Rating.findOne({
            student: studentId,
            course: courseId
        });

        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'You have already rated this course'
            });
        }

        // 4. Create rating
        const newRating = new Rating({
            student: studentId,
            instructor: course.instructor,
            course: courseId,
            rating,
            review,
            isRated: true
        });

        await newRating.save();

        // 4. Update Course stats
        const stats = await Rating.aggregate([
            { $match: { course: new mongoose.Types.ObjectId(courseId) } },
            {
                $group: {
                    _id: '$course',
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                    // Calculate stars distribution
                    ratings: { $push: '$rating' }
                }
            }
        ]);

        if (stats.length > 0) {
            const result = stats[0];
            const distribution = [0, 0, 0, 0, 0];
            result.ratings.forEach(r => {
                if (r >= 1 && r <= 5) distribution[r - 1]++;
            });

            course.averageRating = parseFloat(result.averageRating.toFixed(1));
            course.totalRatings = result.totalRatings;
            course.ratingDistribution = distribution;
            await course.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: newRating
        });

    } catch (error) {
        console.error('Error submitting rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get instructor rating statistics
export const getInstructorRatings = async (req, res) => {
    try {
        const { instructorId } = req.params;
        const stats = await Rating.getInstructorStats(instructorId);

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting instructor ratings:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get course ratings with pagination
export const getCourseRatings = async (req, res) => {
    try {
        const { courseId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await Rating.getCourseRatings(courseId, page, limit);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting course ratings:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Check if student can rate course
export const canRateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user._id;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found',
                canRate: false
            });
        }

        const existingRating = await Rating.findOne({
            student: new mongoose.Types.ObjectId(studentId),
            course: new mongoose.Types.ObjectId(courseId)
        });

        if (existingRating) {
            return res.status(200).json({
                success: true,
                canRate: false,
                reason: 'Already rated',
                rating: existingRating
            });
        }

        const enrollment = course.enrolledStudents.find(
            e => e.student.toString() === studentId.toString()
        );

        if (!enrollment) {
            return res.status(200).json({
                success: true,
                canRate: false,
                reason: 'Not enrolled'
            });
        }

        if (!enrollment.completed) {
            return res.status(200).json({
                success: true,
                canRate: false,
                reason: 'Course not completed'
            });
        }

        return res.status(200).json({
            success: true,
            canRate: true
        });

    } catch (error) {
        console.error('Error checking can rate:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get student's rating history
export const getStudentRatingHistory = async (req, res) => {
    try {
        const studentId = req.user._id;
        const ratings = await Rating.find({ student: studentId })
            .populate('course', 'title thumbnail')
            .populate('instructor', 'name avatar')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: ratings
        });
    } catch (error) {
        console.error('Error getting rating history:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update rating
export const updateRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const { rating, review } = req.body;
        const studentId = req.user._id;

        const existingRating = await Rating.findOne({ _id: ratingId, student: studentId });

        if (!existingRating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found or permission denied'
            });
        }

        // Check if within 24 hours (optional rule mentioned in routes)
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(existingRating.createdAt).getTime() > ONE_DAY) {
            // Uncomment if you want to strictly enforce the 24h rule mentioned in comments
            // return res.status(403).json({
            //    success: false,
            //    message: 'Ratings can only be edited within 24 hours'
            // });
        }

        if (rating) existingRating.rating = rating;
        if (review !== undefined) existingRating.review = review;

        await existingRating.save();

        // Update Course stats
        // Trigger generic update (could be optimized)
        const course = await Course.findById(existingRating.course);
        const stats = await Rating.aggregate([
            { $match: { course: existingRating.course } },
            {
                $group: {
                    _id: '$course',
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                    ratings: { $push: '$rating' }
                }
            }
        ]);

        if (stats.length > 0 && course) {
            const result = stats[0];
            const distribution = [0, 0, 0, 0, 0];
            result.ratings.forEach(r => {
                if (r >= 1 && r <= 5) distribution[r - 1]++;
            });

            course.averageRating = parseFloat(result.averageRating.toFixed(1));
            course.ratingDistribution = distribution;
            await course.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Rating updated successfully',
            data: existingRating
        });

    } catch (error) {
        console.error('Error updating rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete rating
export const deleteRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const studentId = req.user._id;

        const ratingToDelete = await Rating.findOne({ _id: ratingId, student: studentId });

        if (!ratingToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found or permission denied'
            });
        }

        const courseId = ratingToDelete.course;
        await ratingToDelete.deleteOne();

        // Update Course stats
        const course = await Course.findById(courseId);
        const stats = await Rating.aggregate([
            { $match: { course: courseId } },
            {
                $group: {
                    _id: '$course',
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                    ratings: { $push: '$rating' }
                }
            }
        ]);

        if (course) {
            if (stats.length > 0) {
                const result = stats[0];
                const distribution = [0, 0, 0, 0, 0];
                result.ratings.forEach(r => {
                    if (r >= 1 && r <= 5) distribution[r - 1]++;
                });

                course.averageRating = parseFloat(result.averageRating.toFixed(1));
                course.totalRatings = result.totalRatings;
                course.ratingDistribution = distribution;
            } else {
                course.averageRating = 0;
                course.totalRatings = 0;
                course.ratingDistribution = [0, 0, 0, 0, 0];
            }
            await course.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Rating deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting rating:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
