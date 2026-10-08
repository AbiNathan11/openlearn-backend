import User from "../models/User.model.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { generateToken } from "../utils/generateToken.js";
import crypto from "crypto";
import sendTokenEmail from "../utils/sendEmail.js";

export const registerUser = async ({ name, email, password, role }) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("User already exists");
    }

    // Prevent users from registering as admin
    if (role === "admin") {
        throw new Error("Cannot register as admin. Please contact system administrator.");
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
    });

    return {
        user,
        token: generateToken(user),
    };
};

export const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("Invalid email or password");
    }

    // Check if user account is active
    if (!user.isActive) {
        throw new Error("Account has been deactivated. Please contact support.");
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

    return {
        user,
        token: generateToken(user),
    };
};

export const getUserById = async (id) => {
    const user = await User.findById(id).select("-password");
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

export const updateUserProfile = async (id, updateData) => {
    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

export const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("User with this email already exists");
    }

    // Generate a simple 6-digit OTP for dev/testing ease
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    await user.save();
    
    // Attempt to send email
    await sendTokenEmail(user.email, resetToken, user.name);
    
    return resetToken;
};

export const resetPassword = async (token, newPassword) => {
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new Error("Invalid or expired reset token");
    }

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await user.save();
    return user;
};
