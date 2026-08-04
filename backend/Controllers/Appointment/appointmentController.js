import Appointment from '../../models/Appointment.js';

// Get all appointments
const getAllAppointments = async (req, res) => {
  try {
    //console.log('[APPOINTMENT] Fetching all appointments...');
    const appointments = await Appointment.find({});
    //console.log(`[APPOINTMENT] Found ${appointments.length} appointments`);
    res.json(appointments);
  } catch (error) {
    console.error('[APPOINTMENT] Error fetching appointments:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Create appointment
const createAppointment = async (req, res) => {
  try {
    const { donorId, requesterId, date, time, location } = req.body;
    //console.log('[APPOINTMENT] Creating appointment:', { donorId, requesterId, date });

    const newAppointment = new Appointment({
      id: `apt-${Date.now()}`,
      donorId,
      requesterId,
      date,
      time,
      location,
      status: 'scheduled'
    });

    await newAppointment.save();
    //console.log('[APPOINTMENT] Appointment created:', newAppointment.id);
    res.status(201).json({ message: 'Appointment created', appointment: newAppointment });
  } catch (error) {
    console.error('[APPOINTMENT] Error creating appointment:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[APPOINTMENT] Updating appointment:', id);

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedAppointment) {
      //console.log('[APPOINTMENT] Update failed: Appointment not found');
      return res.status(404).json({ error: 'Appointment not found' });
    }

    //console.log('[APPOINTMENT] Appointment updated:', id);
    res.json({ message: 'Appointment updated', appointment: updatedAppointment });
  } catch (error) {
    console.error('[APPOINTMENT] Error updating appointment:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[APPOINTMENT] Deleting appointment:', id);

    const deleted = await Appointment.findOneAndDelete({ id });
    if (!deleted) {
      //console.log('[APPOINTMENT] Delete failed: Appointment not found');
      return res.status(404).json({ error: 'Appointment not found' });
    }

    //console.log('[APPOINTMENT] Appointment deleted:', id);
    res.json({ message: 'Appointment deleted', appointment: deleted });
  } catch (error) {
    console.error('[APPOINTMENT] Error deleting appointment:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
