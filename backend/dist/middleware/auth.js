var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getAuth } from '../auth';
import { fromNodeHeaders } from "better-auth/node";
import { User } from '../models/user.model';
// Helper function to generate unique username
function generateUniqueUsername(baseUsername) {
    return __awaiter(this, void 0, void 0, function* () {
        let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
        let counter = 0;
        while (true) {
            try {
                const existingUser = yield User.findOne({ username: counter === 0 ? username : `${username}${counter}` });
                if (!existingUser) {
                    return counter === 0 ? username : `${username}${counter}`;
                }
                counter++;
            }
            catch (error) {
                console.error('Error checking username uniqueness:', error);
                return `${username}_${Date.now()}`;
            }
        }
    });
}
// Better Auth session middleware
export function requireAuth(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Get session from Better Auth
            const auth = getAuth();
            const session = yield auth.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });
            if (!session || !session.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }
            // Better Auth user ID
            const betterAuthUserId = session.user.id;
            // Check if user exists in our User model
            // First try to find by Better Auth user ID
            let dbUser = yield User.findOne({
                $or: [
                    { _id: betterAuthUserId },
                    { betterAuthUserId: betterAuthUserId }
                ]
            });
            // If no link exists, try to find by email (for migration from Clerk)
            if (!dbUser && session.user.email) {
                dbUser = yield User.findOne({ email: session.user.email.toLowerCase() });
                if (dbUser) {
                    // Link Better Auth user to existing user
                    dbUser.betterAuthUserId = betterAuthUserId;
                    // Update _id if it's different (for migration)
                    if (dbUser._id !== betterAuthUserId) {
                        // Keep old _id but add betterAuthUserId link
                        // We'll handle full migration later
                    }
                    yield dbUser.save();
                }
            }
            // Create user in our DB if doesn't exist
            if (!dbUser) {
                const email = session.user.email || '';
                const name = session.user.name || '';
                const nameParts = name.split(' ');
                dbUser = yield User.create({
                    _id: betterAuthUserId, // Use Better Auth ID as _id
                    betterAuthUserId: betterAuthUserId,
                    username: yield generateUniqueUsername(email.split('@')[0] || `user_${betterAuthUserId.slice(0, 8)}`),
                    email: email.toLowerCase(),
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    profileImageUrl: session.user.image || '',
                    bio: '',
                    website: '',
                    location: '',
                    followerCount: 0,
                    followingCount: 0,
                    postCount: 0,
                    role: 'user',
                    status: 'active',
                    isPrivate: false,
                    lastActivityAt: new Date(),
                });
            }
            // Check if user is suspended
            if (dbUser.status === 'suspended') {
                return res.status(403).json({
                    error: 'Account suspended',
                    suspended: true,
                    message: 'Your account has been suspended by an administrator.',
                    code: 'ACCOUNT_SUSPENDED'
                });
            }
            // Update last activity
            dbUser.lastActivityAt = new Date();
            yield dbUser.save();
            // Attach user data to request
            req.user = {
                id: betterAuthUserId,
                email: session.user.email,
                name: session.user.name,
            };
            // Attach database user to request (for backward compatibility)
            req.dbUser = dbUser;
            req.userId = dbUser._id; // Use for backward compatibility with existing routes
            req.user.sub = dbUser._id; // For backward compatibility with Clerk pattern
            next();
        }
        catch (err) {
            console.error('❌ Authentication error:', (err === null || err === void 0 ? void 0 : err.message) || err);
            if (process.env.NODE_ENV !== 'production') {
                console.error(err);
            }
            // Handle specific Better Auth errors
            if (((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('session')) || ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('cookie'))) {
                return res.status(401).json({
                    error: 'Invalid or expired session',
                    code: 'INVALID_SESSION'
                });
            }
            return res.status(401).json({
                error: 'Authentication failed',
                code: 'AUTH_FAILED'
            });
        }
    });
}
// Admin middleware
export function requireAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // First check authentication
            // We need to manually call requireAuth logic since we can't call it directly
            const auth = getAuth();
            const session = yield auth.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });
            if (!session || !session.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }
            const betterAuthUserId = session.user.id;
            const dbUser = yield User.findOne({
                $or: [
                    { _id: betterAuthUserId },
                    { betterAuthUserId: betterAuthUserId }
                ]
            });
            if (!dbUser) {
                return res.status(403).json({
                    error: 'User not found in database',
                    code: 'USER_NOT_FOUND'
                });
            }
            if (dbUser.status === 'suspended') {
                return res.status(403).json({
                    error: 'Account suspended',
                    suspended: true,
                    message: 'Your account has been suspended by an administrator.',
                    code: 'ACCOUNT_SUSPENDED'
                });
            }
            if (dbUser.role !== 'admin') {
                return res.status(403).json({
                    error: 'Admin access required',
                    code: 'ADMIN_ACCESS_REQUIRED'
                });
            }
            // Attach user data to request
            req.user = {
                id: betterAuthUserId,
                email: session.user.email,
                name: session.user.name,
            };
            req.dbUser = dbUser;
            req.userId = dbUser._id;
            req.user.sub = dbUser._id;
            next();
        }
        catch (err) {
            console.error('❌ Admin authentication error:', err.message);
            return res.status(401).json({
                error: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }
    });
}
