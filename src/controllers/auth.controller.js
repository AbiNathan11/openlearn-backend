import * as authService from "../services/auth.service.js";
import enhancedAuth from "../middlewares/enhancedAuth.middleware.js";

export const register = async (req, res) => {
    try {
        const data = await authService.registerUser(req.body);
        
        // Generate tokens for new user
        const token = enhancedAuth.generateToken(data.user);
        const refreshToken = enhancedAuth.generateRefreshToken(data.user);
        
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                ...data,
                token,
                refreshToken,
                expiresIn: "60m"
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const login = async (req, res) => {
    try {
        const data = await authService.loginUser(req.body);
        
        // Generate tokens for logged in user
        const token = enhancedAuth.generateToken(data.user);
        const refreshToken = enhancedAuth.generateRefreshToken(data.user);
        
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                ...data,
                token,
                refreshToken,
                expiresIn: "60m"
            },
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

export const refreshToken = enhancedAuth.refreshToken.bind(enhancedAuth);

export const logout = enhancedAuth.logout.bind(enhancedAuth);

export const getMe = async (req, res) => {
    try {
        // req.user is set by enhancedAuth middleware with fresh data
        res.status(200).json({
            success: true,
            data: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                phone: req.user.phone,
                bio: req.user.bio,
                expertise: req.user.expertise,
                location: req.user.location,
                website: req.user.website,
                linkedin: req.user.linkedin,
                twitter: req.user.twitter,
                avatar: req.user.avatar,
                createdAt: req.user.createdAt
            },
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const user = await authService.updateUserProfile(req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// Google OAuth
export const googleAuth = async (req, res) => {
    try {
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
            `response_type=code&` +
            `scope=email profile&` +
            `access_type=offline`;
        
        res.redirect(googleAuthUrl);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Google authentication failed",
            error: error.message,
        });
    }
};

// Facebook OAuth
export const facebookAuth = async (req, res) => {
    try {
        const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
            `client_id=${process.env.FACEBOOK_APP_ID}&` +
            `redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&` +
            `response_type=code&` +
            `scope=email public_profile`;
        
        res.redirect(facebookAuthUrl);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Facebook authentication failed",
            error: error.message,
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const token = await authService.forgotPassword(email);
        
        // In a real app, send actual email. Here we just log for dev.
        console.log(`[PASS_RESET] Token for ${email}: ${token}`);
        
        res.status(200).json({
            success: true,
            message: "A password reset code has been sent to your email address."
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        await authService.resetPassword(token, newPassword);
        
        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
