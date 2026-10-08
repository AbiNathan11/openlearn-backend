import express from "express";
import axios from "axios";
import User from "../models/User.model.js";
import enhancedAuth from "../middlewares/enhancedAuth.middleware.js";

const router = express.Router();

// Google OAuth callback
router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`);
        }

        // Exchange code for access token
        const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code",
        });

        const { access_token, id_token } = tokenResponse.data;

        // Get user info from Google
        const userInfoResponse = await axios.get(
            `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
        );

        const { email, name, picture, id: googleId } = userInfoResponse.data;

        // Find or create user
        let user = await User.findOne({ $or: [{ email }, { googleId }] });

        if (!user) {
            user = new User({
                name,
                email,
                googleId,
                avatar: picture,
                role: "student", // Default role
                isEmailVerified: true,
            });
            await user.save();
        } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = googleId;
            if (!user.avatar) user.avatar = picture;
            await user.save();
        }

        // Generate tokens
        const token = enhancedAuth.generateToken(user);
        const refreshToken = enhancedAuth.generateRefreshToken(user);

        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        }))}`;

        res.redirect(redirectUrl);
    } catch (error) {
        console.error("Google OAuth callback error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
});

// Facebook OAuth callback
router.get("/facebook/callback", async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`);
        }

        // Exchange code for access token
        const tokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code,
            },
        });

        const { access_token } = tokenResponse.data;

        // Get user info from Facebook
        const userInfoResponse = await axios.get(
            `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${access_token}`
        );

        const { id: facebookId, name, email, picture } = userInfoResponse.data;

        // Find or create user
        let user = await User.findOne({ $or: [{ email }, { facebookId }] });

        if (!user) {
            user = new User({
                name,
                email,
                facebookId,
                avatar: picture?.data?.url,
                role: "student", // Default role
                isEmailVerified: true,
            });
            await user.save();
        } else if (!user.facebookId) {
            // Link Facebook account to existing user
            user.facebookId = facebookId;
            if (!user.avatar) user.avatar = picture?.data?.url;
            await user.save();
        }

        // Generate tokens
        const token = enhancedAuth.generateToken(user);
        const refreshToken = enhancedAuth.generateRefreshToken(user);

        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        }))}`;

        res.redirect(redirectUrl);
    } catch (error) {
        console.error("Facebook OAuth callback error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
});

export default router;
