import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  donorId: { type: String, required: true },
  requesterId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'appointments' });

export default mongoose.model('Appointment', appointmentSchema);
