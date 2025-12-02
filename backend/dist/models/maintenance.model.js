import { Schema, model } from 'mongoose';
const maintenanceSchema = new Schema({
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'The website is under maintenance.' },
    data: { type: Schema.Types.Mixed },
}, {
    timestamps: true
});
export const Maintenance = model('Maintenance', maintenanceSchema);
