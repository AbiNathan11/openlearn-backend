import Rating from "../models/Rating.model.js";
import Course from "../models/Course.model.js";
import mongoose from "mongoose";

class RatingService {
    // Submit rating for a course
    async submitRating(studentId, courseId, instructorId, ratingData) {
        try {
            // Check if student has completed the course
            const course = await Course.findById(courseId);
            if (!course) {
                throw new Error("Course not found");
            }

            // Check if student is enrolled and completed the course
            const enrollment = course.enrolledStudents?.find(
                student => student.student?.toString() === studentId
            );

            if (!enrollment) {
                throw new Error("Student is not enrolled in this course");
            }

            if (!enrollment.completed) {
                throw new Error("Student must complete the course before rating");
            }

            // Check if student has already rated this course
            const existingRating = await Rating.hasStudentRatedCourse(studentId, courseId);
            if (existingRating) {
                throw new Error("You have already rated this course");
            }

            // Create new rating
            const newRating = new Rating({
                student: studentId,
                instructor: instructorId,
                course: courseId,
                rating: ratingData.rating,
                review: ratingData.review?.trim() || "",
                isRated: true
            });

            await newRating.save();

            // Update course's rating statistics
            await this.updateCourseRatingStats(courseId);

            return {
                success: true,
                message: "Rating submitted successfully",
                data: {
                    rating: newRating.rating,
                    review: newRating.review,
                    ratedAt: newRating.ratedAt
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    // Get instructor rating statistics
    async getInstructorRatings(instructorId) {
        try {
            const stats = await Rating.getInstructorStats(instructorId);
            
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    // Get course ratings with pagination
    async getCourseRatings(courseId, page = 1, limit = 10) {
        try {
            const result = await Rating.getCourseRatings(courseId, page, limit);
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    // Update course rating statistics
    async updateCourseRatingStats(courseId) {
        try {
            const stats = await Rating.getInstructorStatsByCourse(courseId);
            
            await Course.findByIdAndUpdate(courseId, {
                $set: {
                    averageRating: stats.averageRating,
                    totalRatings: stats.totalRatings,
                    ratingDistribution: stats.ratingDistribution
                }
            });

            return {
                success: true,
                message: "Course rating statistics updated"
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    // Check if student can rate course
    async canStudentRateCourse(studentId, courseId) {
        try {
            const course = await Course.findById(courseId);
            if (!course) {
                return {
                    canRate: false,
                    reason: "Course not found"
                };
            }

            // Check enrollment and completion
            const enrollment = course.enrolledStudents?.find(
                student => student.student?.toString() === studentId
            );

            if (!enrollment) {
                return {
                    canRate: false,
                    reason: "Student is not enrolled in this course"
                };
            }

            if (!enrollment.completed) {
                return {
                    canRate: false,
                    reason: "Student must complete the course before rating"
                };
            }

            // Check if already rated
            const hasRated = await Rating.hasStudentRatedCourse(studentId, courseId);
            if (hasRated) {
                return {
                    canRate: false,
                    reason: "You have already rated this course"
                };
            }

            return {
                canRate: true,
                reason: "Student can rate this course"
            };
        } catch (error) {
            return {
                canRate: false,
                reason: error.message
            };
        }
    }

    // Get student's rating history
    async getStudentRatingHistory(studentId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            
            const ratings = await Rating.find({ student: mongoose.Types.ObjectId(studentId) })
                .populate('course', 'title')
                .populate('instructor', 'name avatar')
                .sort({ ratedAt: -1 })
                .skip(skip)
                .limit(limit);
            
            const total = await Rating.countDocuments({ 
                student: mongoose.Types.ObjectId(studentId) 
            });
            
            return {
                success: true,
                data: {
                    ratings,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalRatings: total,
                        hasNextPage: page < Math.ceil(total / limit),
                        hasPrevPage: page > 1
                    }
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    // Update rating (if allowed)
    async updateRating(ratingId, studentId, updateData) {
        try {
            const rating = await Rating.findById(ratingId);
            
            if (!rating) {
                throw new Error("Rating not found");
            }

            // Check if rating belongs to the student
            if (rating.student.toString() !== studentId) {
                throw new Error("You can only update your own ratings");
            }

            // Allow update only within 24 hours
            const timeDiff = Date.now() - rating.ratedAt.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                throw new Error("Rating can only be updated within 24 hours");
            }

            // Update rating
            if (updateData.rating !== undefined) {
                rating.rating = updateData.rating;
            }
            
            if (updateData.review !== undefined) {
                rating.review = updateData.review?.trim() || "";
            }

            await rating.save();

            // Update course rating statistics
            await this.updateCourseRatingStats(rating.course);

            return {
                success: true,
                message: "Rating updated successfully",
                data: rating
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    // Delete rating (if allowed)
    async deleteRating(ratingId, studentId) {
        try {
            const rating = await Rating.findById(ratingId);
            
            if (!rating) {
                throw new Error("Rating not found");
            }

            // Check if rating belongs to the student
            if (rating.student.toString() !== studentId) {
                throw new Error("You can only delete your own ratings");
            }

            // Allow delete only within 24 hours
            const timeDiff = Date.now() - rating.ratedAt.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                throw new Error("Rating can only be deleted within 24 hours");
            }

            await Rating.findByIdAndDelete(ratingId);

            // Update course rating statistics
            await this.updateCourseRatingStats(rating.course);

            return {
                success: true,
                message: "Rating deleted successfully"
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }
}

export default new RatingService();
