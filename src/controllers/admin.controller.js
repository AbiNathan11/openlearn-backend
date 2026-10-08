import User from "../models/User.model.js";
import Course from "../models/Course.model.js";

export const getDashboardData = async (req, res) => {
    try {
        // Calculate stats
        const totalStudents = await User.countDocuments({ role: "student" });
        const totalInstructors = await User.countDocuments({ role: "instructor" });
        const totalCourses = await Course.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        
        const allCoursesDetails = await Course.find().select("price students enrolledStudents");
        let totalRevenue = 0;
        let totalEnrollments = 0;

        allCoursesDetails.forEach(course => {
            if (course.price && course.students) {
                totalRevenue += (course.price * course.students.length);
            }
            if (course.enrolledStudents) {
                totalEnrollments += course.enrolledStudents.length;
            }
        });

        const stats = {
            totalStudents,
            totalInstructors,
            totalCourses,
            totalRevenue,
            activeUsers,
            totalEnrollments
        };

        // Calculate start of current week (e.g. 7 days ago, or Sunday)
        const dateOffset = (24*60*60*1000) * 7; // 7 days
        const startOfWeek = new Date();
        startOfWeek.setTime(startOfWeek.getTime() - dateOffset);

        // Fetch recent users from this week
        const recentUsers = await User.find({ createdAt: { $gte: startOfWeek } })
            .sort({ createdAt: -1 })
            .select("name role createdAt");

        // Fetch recent courses from this week
        const recentCourses = await Course.find({ createdAt: { $gte: startOfWeek } })
            .sort({ createdAt: -1 })
            .populate("instructor", "name")
            .select("title instructor createdAt");

        const activities = [];

        recentUsers.forEach(user => {
            activities.push({
                id: `u-${user._id}`,
                action: user.role === "admin" ? "New admin registered" : user.role === "instructor" ? "New instructor registered" : "New student registered",
                user: user.name,
                time: user.createdAt,
                timestamp: new Date(user.createdAt).getTime(),
            });
        });

        recentCourses.forEach(course => {
            activities.push({
                id: `c-${course._id}`,
                action: `Course created: ${course.title}`,
                user: course.instructor?.name || "Unknown Instructor",
                time: course.createdAt,
                timestamp: new Date(course.createdAt).getTime(),
            });
        });

        // Sort by timestamp descending
        activities.sort((a, b) => b.timestamp - a.timestamp);

        res.status(200).json({ stats, activities });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Failed to load dashboard data" });
    }
};

export const getReportsData = async (req, res) => {
    try {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // New Registrations: Users created in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newRegistrations = await User.countDocuments({ 
            role: "student", 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        // Registrations for increment calculation
        const currentMonthRegistrations = await User.countDocuments({ 
            role: "student",
            createdAt: { $gte: startOfCurrentMonth } 
        });
        const previousMonthRegistrations = await User.countDocuments({ 
            role: "student",
            createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } 
        });

        // Total Revenue & Profit
        const allCoursesDetails = await Course.find().select("price students enrolledStudents createdAt");
        let totalRevenue = 0;
        let currentMonthRevenue = 0;
        let previousMonthRevenue = 0;

        allCoursesDetails.forEach(course => {
            const coursePrice = course.price || 0;
            if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
                course.enrolledStudents.forEach(enrollment => {
                    const enrolledAt = enrollment.enrolledAt ? new Date(enrollment.enrolledAt) : new Date(course.createdAt || Date.now());
                    totalRevenue += coursePrice;

                    if (enrolledAt >= startOfCurrentMonth) {
                        currentMonthRevenue += coursePrice;
                    } else if (enrolledAt >= startOfPreviousMonth && enrolledAt <= endOfPreviousMonth) {
                        previousMonthRevenue += coursePrice;
                    }
                });
            }
        });

        // Compute profit as 20% of total revenue
        const profits = totalRevenue * 0.2;
        const currentMonthProfits = currentMonthRevenue * 0.2;
        const previousMonthProfits = previousMonthRevenue * 0.2;

        const calculateIncrement = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous * 100).toFixed(1);
        };

        const revenueIncrement = calculateIncrement(currentMonthRevenue, previousMonthRevenue);
        const registrationsIncrement = calculateIncrement(currentMonthRegistrations, previousMonthRegistrations);
        const profitsIncrement = calculateIncrement(currentMonthProfits, previousMonthProfits);

        // Calculate revenue for the last 12 months
        let revenueByMonth = Array(12).fill(0);

        allCoursesDetails.forEach(course => {
            const coursePrice = course.price || 0;
            if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
                course.enrolledStudents.forEach(enrollment => {
                    const date = enrollment.enrolledAt ? new Date(enrollment.enrolledAt) : new Date(course.createdAt || Date.now());
                    const month = date.getMonth();
                    revenueByMonth[month] += coursePrice;
                });
            }
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const revenueData = [];
        const today = new Date();

        // Get data for the last 6 months including current
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const m = date.getMonth();
            revenueData.push({
                month: monthNames[m],
                amount: Math.round(revenueByMonth[m])
            });
        }

        // Compute top instructors
        const allCoursesWithInstructor = await Course.find()
            .populate("instructor", "name isActive")
            .select("instructor price students");
            
        const instructorStats = {};

        allCoursesWithInstructor.forEach(course => {
            if (!course.instructor) return;
            const instructorId = course.instructor._id.toString();

            if (!instructorStats[instructorId]) {
                instructorStats[instructorId] = {
                    name: course.instructor.name,
                    isActive: course.instructor.isActive,
                    courses: 0,
                    students: 0,
                    revenue: 0,
                };
            }

            instructorStats[instructorId].courses += 1;
            const studentsCount = course.students ? course.students.length : 0;
            instructorStats[instructorId].students += studentsCount;
            instructorStats[instructorId].revenue += (course.price || 0) * studentsCount;
        });

        const topInstructors = Object.values(instructorStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(instructor => ({
                name: instructor.name,
                courses: instructor.courses,
                students: instructor.students,
                revenue: instructor.revenue,
                status: instructor.isActive === false ? "Inactive" : "Active"
            }));

        res.status(200).json({
            totalRevenue,
            newRegistrations, // This is current 30 day count
            profits,
            monthlyRevenue: currentMonthRevenue,
            monthlyRegistrations: currentMonthRegistrations,
            monthlyProfits: currentMonthProfits,
            revenueIncrement,
            registrationsIncrement,
            profitsIncrement,
            revenueData,
            topInstructors
        });

    } catch (error) {
        console.error("Reports error:", error);
        res.status(500).json({ message: "Failed to load reports data" });
    }
};
