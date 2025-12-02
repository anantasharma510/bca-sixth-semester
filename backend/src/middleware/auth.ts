import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../auth';
import { fromNodeHeaders } from "better-auth/node";
import { User } from '../models/user.model';

// Helper function to generate unique username
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
  let counter = 0;
  
  while (true) {
    try {
      const existingUser = await User.findOne({ username: counter === 0 ? username : `${username}${counter}` });
      if (!existingUser) {
        return counter === 0 ? username : `${username}${counter}`;
      }
      counter++;
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
      return `${username}_${Date.now()}`;
    }
  }
}

// Better Auth session middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get session from Better Auth
    const auth = getAuth();
    const session = await auth.api.getSession({
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
    let dbUser = await User.findOne({ 
      $or: [
        { _id: betterAuthUserId },
        { betterAuthUserId: betterAuthUserId }
      ]
    });

    // If no link exists, try to find by email (for migration from Clerk)
    if (!dbUser && session.user.email) {
      dbUser = await User.findOne({ email: session.user.email.toLowerCase() });
      if (dbUser) {
        // Link Better Auth user to existing user
        dbUser.betterAuthUserId = betterAuthUserId;
        // Update _id if it's different (for migration)
        if (dbUser._id !== betterAuthUserId) {
          // Keep old _id but add betterAuthUserId link
          // We'll handle full migration later
        }
        await dbUser.save();
      }
    }

    // Create user in our DB if doesn't exist
    if (!dbUser) {
      const email = session.user.email || '';
      const name = session.user.name || '';
      const nameParts = name.split(' ');
      
      dbUser = await User.create({
        _id: betterAuthUserId, // Use Better Auth ID as _id
        betterAuthUserId: betterAuthUserId,
        username: await generateUniqueUsername(
          email.split('@')[0] || `user_${betterAuthUserId.slice(0, 8)}`
        ),
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
    await dbUser.save();

    // Attach user data to request
    (req as any).user = {
      id: betterAuthUserId,
      email: session.user.email,
      name: session.user.name,
    };
    
    // Attach database user to request (for backward compatibility)
    (req as any).dbUser = dbUser;
    (req as any).userId = dbUser._id; // Use for backward compatibility with existing routes
    (req as any).user.sub = dbUser._id; // For backward compatibility with Clerk pattern

    next();
  } catch (err: any) {
    console.error('❌ Authentication error:', err?.message || err);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    }
    
    // Handle specific Better Auth errors
    if (err.message?.includes('session') || err.message?.includes('cookie')) {
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
}

// Admin middleware
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // First check authentication
    // We need to manually call requireAuth logic since we can't call it directly
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const betterAuthUserId = session.user.id;
    const dbUser = await User.findOne({ 
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
    (req as any).user = {
      id: betterAuthUserId,
      email: session.user.email,
      name: session.user.name,
    };
    (req as any).dbUser = dbUser;
    (req as any).userId = dbUser._id;
    (req as any).user.sub = dbUser._id;
    
    next();
  } catch (err: any) {
    console.error('❌ Admin authentication error:', err.message);
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
}
