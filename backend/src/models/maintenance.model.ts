import { Schema, model, Document } from 'mongoose';

export interface IMaintenance extends Document {
  enabled: boolean;
  message: string;
  data?: Record<string, any>;
}

const maintenanceSchema = new Schema<IMaintenance>({
  enabled: { type: Boolean, default: false },
  message: { type: String, default: 'The website is under maintenance.' },
  data: { type: Schema.Types.Mixed },
}, {
  timestamps: true
});

export const Maintenance = model<IMaintenance>('Maintenance', maintenanceSchema); 