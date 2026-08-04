import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  requestId: { type: String, required: true },
  patientName: { type: String, required: true },
  bloodType: { type: String, required: true },
  hospital: { type: String, required: true },
  timestamp: { type: String, required: true },
  emailCount: { type: Number, default: 0 },
  pushCount: { type: Number, default: 0 },
  smsDispatched: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['dispatched', 'delivered'],
    default: 'dispatched'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'alerts' });

export default mongoose.model('Alert', alertSchema);
