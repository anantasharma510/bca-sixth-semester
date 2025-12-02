var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Schema, model } from 'mongoose';
const repostSchema = new Schema({
    user: { type: String, ref: 'User', required: true },
    originalPost: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        validate: {
            validator: function (v) {
                return v != null && v.toString().match(/^[0-9a-fA-F]{24}$/);
            },
            message: 'Original post must be a valid ObjectId'
        }
    },
    comment: { type: String, trim: true, maxlength: 280 },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
// Add validation to ensure originalPost is provided
repostSchema.pre('save', function (next) {
    if (!this.originalPost) {
        return next(new Error('Original post must be provided'));
    }
    next();
});
// Create compound index for user and originalPost (removed unique constraint)
repostSchema.index({ user: 1, originalPost: 1 });
repostSchema.index({ originalPost: 1 });
const Repost = model('Repost', repostSchema);
// Function to drop old unique indexes
export function dropOldRepostIndexes() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const collection = Repost.collection;
            // List all indexes
            const indexes = yield collection.listIndexes().toArray();
            console.log('Current repost indexes:', indexes.map(idx => idx.name));
            // Drop the problematic unique indexes if they exist
            for (const index of indexes) {
                if (index.name === 'user_1_post_1' || index.name === 'user_1_originalPost_1') {
                    if (index.unique) {
                        console.log(`Dropping old unique index: ${index.name}`);
                        yield collection.dropIndex(index.name);
                    }
                }
            }
            console.log('Old repost indexes dropped successfully');
        }
        catch (error) {
            console.error('Error dropping old repost indexes:', error);
        }
    });
}
export { Repost };
