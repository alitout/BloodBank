import Alert from '../../models/Alert.js';

// Get all alerts
const getAllAlerts = async (req, res) => {
  try {
    //console.log('[ALERT] Fetching all alerts...');
    const alerts = await Alert.find({});
    //console.log(`[ALERT] Found ${alerts.length} alerts`);
    res.json(alerts);
  } catch (error) {
    console.error('[ALERT] Error fetching alerts:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Create alert
const createAlert = async (req, res) => {
  try {
    const { requestId, patientName, bloodType, hospital, smsDispatched } = req.body;
    //console.log('[ALERT] Creating alert:', { requestId, patientName, bloodType, hospital });

    const newAlert = new Alert({
      id: `alert-${Date.now()}`,
      requestId,
      patientName,
      bloodType,
      hospital,
      timestamp: new Date(),
      emailCount: 0,
      pushCount: 0,
      smsDispatched: smsDispatched || false,
      status: 'dispatched'
    });

    await newAlert.save();
    //console.log('[ALERT] Alert created:', newAlert.id);
    res.status(201).json({ message: 'Alert created', alert: newAlert });
  } catch (error) {
    console.error('[ALERT] Error creating alert:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update alert
const updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[ALERT] Updating alert:', id);

    const updatedAlert = await Alert.findOneAndUpdate(
      { id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedAlert) {
      //console.log('[ALERT] Update failed: Alert not found');
      return res.status(404).json({ error: 'Alert not found' });
    }

    //console.log('[ALERT] Alert updated:', id);
    res.json({ message: 'Alert updated', alert: updatedAlert });
  } catch (error) {
    console.error('[ALERT] Error updating alert:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete alert
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log('[ALERT] Deleting alert:', id);

    const deleted = await Alert.findOneAndDelete({ id });
    if (!deleted) {
      //console.log('[ALERT] Delete failed: Alert not found');
      return res.status(404).json({ error: 'Alert not found' });
    }

    //console.log('[ALERT] Alert deleted:', id);
    res.json({ message: 'Alert deleted', alert: deleted });
  } catch (error) {
    console.error('[ALERT] Error deleting alert:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllAlerts,
  createAlert,
  updateAlert,
  deleteAlert
};
