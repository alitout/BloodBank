import Hospital from '../../models/Hospital.js';

// Get all hospitals
const getAllHospitals = async (req, res) => {
  try {
    //console.log('[HOSPITAL] Fetching all hospitals...');
    const hospitals = await Hospital.find({});
    //console.log(`[HOSPITAL] Found ${hospitals.length} hospitals`);
    res.json(hospitals);
  } catch (error) {
    console.error('[HOSPITAL] Error fetching hospitals:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Create hospital
const createHospital = async (req, res) => {
  try {
    const { name, location, contact, latitude, longitude, address } = req.body;
    //console.log('[HOSPITAL] Creating hospital:', { name, location });

    const newHospital = new Hospital({
      id: `hosp-${Date.now()}`,
      name,
      location,
      contact,
      latitude,
      longitude,
      address,
      verified: true
    });

    await newHospital.save();
    //console.log('[HOSPITAL] Hospital created:', newHospital.id);
    res.status(201).json({ message: 'Hospital created', hospital: newHospital });
  } catch (error) {
    console.error('[HOSPITAL] Error creating hospital:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update hospital
const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[HOSPITAL] Updating hospital:', id);

    const updatedHospital = await Hospital.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedHospital) {
      //console.log('[HOSPITAL] Update failed: Hospital not found');
      return res.status(404).json({ error: 'Hospital not found' });
    }

    //console.log('[HOSPITAL] Hospital updated:', id);
    res.json({ message: 'Hospital updated', hospital: updatedHospital });
  } catch (error) {
    console.error('[HOSPITAL] Error updating hospital:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete hospital
const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[HOSPITAL] Deleting hospital:', id);

    const deleted = await Hospital.findByIdAndDelete(id);
    if (!deleted) {
      //console.log('[HOSPITAL] Delete failed: Hospital not found');
      return res.status(404).json({ error: 'Hospital not found' });
    }

    //console.log('[HOSPITAL] Hospital deleted:', id);
    res.json({ message: 'Hospital deleted', hospital: deleted });
  } catch (error) {
    console.error('[HOSPITAL] Error deleting hospital:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllHospitals,
  createHospital,
  updateHospital,
  deleteHospital
};
