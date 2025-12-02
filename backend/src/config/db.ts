import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dropOldRepostIndexes } from '../models/repost.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser and useUnifiedTopology are default in mongoose >= 6
    });
    console.log('MongoDB connected');
    
    // Drop old repost indexes to fix the unique constraint issue
    await dropOldRepostIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}; 