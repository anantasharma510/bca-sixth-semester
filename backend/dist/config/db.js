var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dropOldRepostIndexes } from '../models/repost.model';
dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || '';
export const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose.connect(MONGODB_URI, {
        // useNewUrlParser and useUnifiedTopology are default in mongoose >= 6
        });
        console.log('MongoDB connected');
        // Drop old repost indexes to fix the unique constraint issue
        yield dropOldRepostIndexes();
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
});
