import { Schema, model, Document } from 'mongoose';

export type GenderOption = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

export interface IStyleProfile extends Document {
  userId: string;
  gender?: GenderOption;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  locale?: string;
  preferredUnits?: 'metric' | 'imperial';
  profileImageUrl?: string;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const styleProfileSchema = new Schema<IStyleProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    gender: {
      type: String,
      enum: ['male', 'female', 'non_binary', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    age: { type: Number, min: 10, max: 100 },
    heightCm: { type: Number, min: 50, max: 250 },
    weightKg: { type: Number, min: 20, max: 250 },
    locale: { type: String, default: 'en-US' },
    preferredUnits: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    profileImageUrl: { type: String },
    completedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const StyleProfile = model<IStyleProfile>('StyleProfile', styleProfileSchema);

