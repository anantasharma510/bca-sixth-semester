/* 
 * COMMENTED OUT - Live streaming functionality disabled
 * This file contains all live stream routes using Agora.io
 * To re-enable, uncomment this file and restore the route registration in backend/src/index.ts
 */

/*
// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { LiveStream } from '../models/liveStream.model';
import { User } from '../models/user.model';
import { Block } from '../models/block.model';
import { StreamChatMessage } from '../models/streamChat.model';
import { generateAgoraToken, generateChannelName, generateRandomUid } from '../utils/agoraToken';
import { uploadToCloudinary } from '../utils/cloudinary';
import { upload } from '../middleware/multer';
import { io } from '../index';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper function for async route handlers
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return function (req: Request, res: Response, next: NextFunction): void {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ... All routes commented out ...

export default router;
*/

// Return empty router for now
import { Router } from 'express';
const router = Router();
export default router;
