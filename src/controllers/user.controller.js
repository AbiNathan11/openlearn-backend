import User from "../models/User.model.js";

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message,
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete user",
            error: error.message,
        });
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 
                isActive,
                ...(isActive ? { deactivatedAt: null } : { deactivatedAt: new Date() })
            },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to toggle user status",
            error: error.message,
        });
    }
};

export const deactivateAccount = async (req, res) => {
    try {
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Deactivation reason is required"
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                isActive: false,
                deactivationReason: reason,
                deactivatedAt: new Date()
            },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Account deactivated successfully",
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to deactivate account",
            error: error.message,
        });
    }
};
