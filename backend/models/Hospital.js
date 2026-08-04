import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  id: { 
    type: String, 
    unique: true, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  phoneNumber: { 
    type: String, 
    required: true 
  },
  // latitude: { 
  //   type: Number, 
  //   required: true 
  // },
  // longitude: { 
  //   type: Number, 
  //   required: true 
  // },
  address: { 
    type: String 
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  verifiedBy: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { collection: 'hospitals' });

export default mongoose.model('Hospital', hospitalSchema);
