import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

// Enhanced JWT middleware with 60-minute sessions and role-based access
class EnhancedAuthMiddleware {
    // Generate JWT token with 60-minute expiration
    generateToken(user) {
        return jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "60m", // 60 minutes
                issuer: "openlearn",
                audience: "openlearn-users"
            }
        );
    }

    // Generate refresh token (7 days)
    generateRefreshToken(user) {
        return jwt.sign(
            {
                id: user._id,
                type: "refresh"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
                issuer: "openlearn",
                audience: "openlearn-users"
            }
        );
    }

    // Verify token and attach user to request
    async verifyToken(req, res, next) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided or invalid format",
                code: "NO_TOKEN"
            });
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get fresh user data from database
            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found",
                    code: "USER_NOT_FOUND"
                });
            }

            // Check if user is active/banned (add status field if needed)
            if (user.status === "banned") {
                return res.status(403).json({
                    success: false,
                    message: "Account is banned",
                    code: "ACCOUNT_BANNED"
                });
            }

            // Attach user to request
            req.user = user;
            req.token = token;

            next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Token expired",
                    code: "TOKEN_EXPIRED"
                });
            } else if (error.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token",
                    code: "INVALID_TOKEN"
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: "Token verification failed",
                    error: error.message
                });
            }
        }
    }

    // Role-based access control middleware
    requireRole(...allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                    code: "AUTH_REQUIRED"
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
                    code: "INSUFFICIENT_PERMISSIONS",
                    currentRole: req.user.role,
                    requiredRoles: allowedRoles
                });
            }

            next();
        };
    }

    // Specific role middleware methods
    requireStudent = this.requireRole("student");
    requireInstructor = this.requireRole("instructor", "admin");
    requireAdmin = this.requireRole("admin");
    requireInstructorOrAdmin = this.requireRole("instructor", "admin");

    // Optional authentication (doesn't fail if no token)
    optionalAuth(req, res, next) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            // No token provided, continue without authentication
            req.user = null;
            return next();
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = User.findById(decoded.id).select("-password");

            req.user = user;
            req.token = token;
        } catch (error) {
            // Invalid token, continue without authentication
            req.user = null;
        }

        next();
    }

    // Check if user owns the resource or has admin rights
    requireOwnershipOrAdmin(resourceUserIdField = "userId") {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                    code: "AUTH_REQUIRED"
                });
            }

            const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

            // Admin can access everything
            if (req.user.role === "admin") {
                return next();
            }

            // Check ownership
            if (req.user._id.toString() !== resourceUserId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only access your own resources.",
                    code: "OWNERSHIP_REQUIRED"
                });
            }

            next();
        };
    }

    // Rate limiting middleware (simple in-memory implementation)
    rateLimit = {
        requests: new Map(),

        middleware: (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
            return (req, res, next) => {
                const key = req.user?.id || req.ip;
                const now = Date.now();
                const windowStart = now - windowMs;

                if (!this.rateLimit.requests.has(key)) {
                    this.rateLimit.requests.set(key, []);
                }

                const requests = this.rateLimit.requests.get(key);

                // Remove old requests outside the window
                const validRequests = requests.filter(timestamp => timestamp > windowStart);
                this.rateLimit.requests.set(key, validRequests);

                if (validRequests.length >= maxRequests) {
                    return res.status(429).json({
                        success: false,
                        message: "Too many requests. Please try again later.",
                        code: "RATE_LIMIT_EXCEEDED",
                        retryAfter: Math.ceil(windowMs / 1000)
                    });
                }

                // Add current request
                validRequests.push(now);

                next();
            };
        }
    };

    // Token refresh endpoint
    async refreshToken(req, res) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required",
                code: "REFRESH_TOKEN_REQUIRED"
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

            if (decoded.type !== "refresh") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid refresh token",
                    code: "INVALID_REFRESH_TOKEN"
                });
            }

            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found",
                    code: "USER_NOT_FOUND"
                });
            }

            const newToken = this.generateToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            res.json({
                success: true,
                token: newToken,
                refreshToken: newRefreshToken,
                expiresIn: "60m",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token",
                code: "INVALID_REFRESH_TOKEN",
                error: error.message
            });
        }
    }

    // Logout endpoint (client-side token removal, server-side blacklist if needed)
    logout(req, res) {
        // For stateless JWT, logout is handled client-side
        // If you need server-side token invalidation, implement token blacklist
        res.json({
            success: true,
            message: "Logged out successfully",
            code: "LOGOUT_SUCCESS"
        });
    }
}

export default new EnhancedAuthMiddleware();
