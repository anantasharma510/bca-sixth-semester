import { Schema, model, Document } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';

export interface IRepost extends Document {
  user: IUser['_id'];
  originalPost: IPost['_id'];
  comment?: string;
  createdAt: Date;
}

const repostSchema = new Schema<IRepost>({
  user: { type: String, ref: 'User', required: true },
  originalPost: { 
    type: Schema.Types.ObjectId, 
    ref: 'Post', 
    required: true,
    validate: {
      validator: function(v: any) {
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
repostSchema.pre('save', function(next) {
  if (!this.originalPost) {
    return next(new Error('Original post must be provided'));
  }
  next();
});

// Create compound index for user and originalPost (removed unique constraint)
repostSchema.index({ user: 1, originalPost: 1 });

repostSchema.index({ originalPost: 1 });

const Repost = model<IRepost>('Repost', repostSchema);

// Function to drop old unique indexes
export async function dropOldRepostIndexes() {
  try {
    const collection = Repost.collection;
    
    // List all indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('Current repost indexes:', indexes.map(idx => idx.name));
    
    // Drop the problematic unique indexes if they exist
    for (const index of indexes) {
      if (index.name === 'user_1_post_1' || index.name === 'user_1_originalPost_1') {
        if (index.unique) {
          console.log(`Dropping old unique index: ${index.name}`);
          await collection.dropIndex(index.name);
        }
      }
    }
    
    console.log('Old repost indexes dropped successfully');
  } catch (error) {
    console.error('Error dropping old repost indexes:', error);
  }
}

export { Repost }; 