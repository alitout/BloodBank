import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, requesterAPI, hospitalAPI, appointmentAPI, alertAPI } from "../utils/api.js";
import { useAuth } from "./AuthContext.jsx";

/**
 * @typedef {Object} DBContextProps
 * @property {import('../types').Donor[]} donors
 * @property {import('../types').Requester[]} requesters
 * @property {import('../types').Hospital[]} hospitals
 * @property {import('../types').Appointment[]} appointments
 * @property {import('../types').Alert[]} alerts
 * @property {boolean} isLoading
 * @property {string | null} error
 * @property {Function} addRequester
 * @property {Function} updateRequesterStatus
 * @property {Function} deleteRequester
 * @property {Function} scheduleAppointment
 * @property {Function} refreshData
 * @property {Function} addHospital
 */

const DBContext = createContext(undefined);

export const DBProvider = ({ children }) => {
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [requesters, setRequesters] = useState([]);
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refresh all data from backend
  const refreshData = useCallback(async () => {
    if (!user || !accessToken) {
      console.warn("⚠️ [DB] Cannot refresh: user or token missing");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("🔄 [DB] Refreshing data for:", {
        uid: user.uid,
        role: user.role,
      });

      const [
        reqResult,
        hospResult,
        aptResult,
        alertResult,
      ] = await Promise.all([
        requesterAPI.getAll(),
        hospitalAPI.getAll(),
        appointmentAPI.getAll(),
        alertAPI.getAll(),
      ]);

      console.log("📦 [DB] API results:", {
        requests: reqResult,
        hospitals: hospResult,
        appointments: aptResult,
        alerts: alertResult,
      });

      if (reqResult.success) {
        setRequesters(reqResult.data || []);
      } else {
        console.error("❌ [DB] Requests failed:", reqResult.error);
      }

      if (hospResult.success) {
        setHospitals(hospResult.data || []);
      } else {
        console.error("❌ [DB] Hospitals failed:", hospResult.error);
      }

      if (aptResult.success) {
        setAppointments(aptResult.data || []);
      } else {
        console.error("❌ [DB] Appointments failed:", aptResult.error);
      }

      if (alertResult.success) {
        setAlerts(alertResult.data || []);
      } else {
        console.error("❌ [DB] Alerts failed:", alertResult.error);
      }

    } catch (error) {
      console.error("❌ [DB] Failed to load DB data:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, accessToken]);

  // Fetch admin data (accounts/donors) - only call this for admin users
  const fetchAdminData = useCallback(async () => {
    if (!user || user.role !== "super_admin") {
      return;
    }

    try {
      const result = await authAPI.getAllAccounts();

      if (result.success && Array.isArray(result.data)) {
        const donorList = result.data.filter(
          account => account.role === "donor"
        );

        setDonors(donorList);

        return donorList;
      }

      setDonors([]);

    } catch (error) {
      console.error("❌ Failed to fetch admin data:", error);
      setDonors([]);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !accessToken) {
      setRequesters([]);
      setDonors([]);
      setHospitals([]);
      setAppointments([]);
      setAlerts([]);
      return;
    }

    const loadData = async () => {
      await refreshData();

      if (user.role === "super_admin") {
        await fetchAdminData();
      }
    };

    loadData();

  }, [
    authLoading,
    user,
    accessToken,
    refreshData,
    fetchAdminData
  ]);

  const loadData = async () => {
    console.log("🔄 [DB] Starting data load...");

    await refreshData();

    if (user.role === "super_admin") {
      console.log("🔐 [DB] Loading admin data...");
      await fetchAdminData();
    }

    console.log("✅ [DB] Data loading completed");
  };

  // Add new blood request
  const addRequester = async (fname, fatherName, lname, bloodGenre, bloodType, hospital, unitsNeeded, date, description, relationToPatient) => {
    try {
      setError(null);
      //console.log('\n🚀 [DB] Creating blood request...');

      const payload = { fname, fatherName, lname, bloodGenre, bloodType, hospital, unitsNeeded, date, description, relationToPatient };
      const result = await requesterAPI.create(payload);

      if (result.success && result.data) {
        //console.log('✅ [DB] Blood request created:', result.data.id);
        setRequesters((prev) => [result.data, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create request');
      }
    } catch (e) {
      const msg = `Error creating request: ${e.message}`;
      console.error('❌ [DB]', msg);
      setError(msg);
      throw e;
    }
  };

  // Update blood request status
  const updateRequesterStatus = async (id, status) => {
    try {
      setError(null);
      //console.log('\n🚀 [DB] Updating request status:', id);

      const result = await requesterAPI.update(id, { status });

      if (result.success && result.data) {
        //console.log('✅ [DB] Request updated:', id);
        setRequesters((prev) => prev.map(r => r.id === id ? result.data : r));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update request');
      }
    } catch (e) {
      const msg = `Error updating request: ${e.message}`;
      console.error('❌ [DB]', msg);
      setError(msg);
      throw e;
    }
  };

  // Delete blood request
  const deleteRequester = async (id) => {
    try {
      setError(null);
      //console.log('\n🚀 [DB] Deleting request:', id);

      const result = await requesterAPI.delete(id);

      if (result.success) {
        //console.log('✅ [DB] Request deleted:', id);
        setRequesters((prev) => prev.filter(r => r.id !== id));
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete request');
      }
    } catch (e) {
      const msg = `Error deleting request: ${e.message}`;
      console.error('❌ [DB]', msg);
      setError(msg);
      throw e;
    }
  };

  // Schedule appointment
  const scheduleAppointment = async (donorId, requesterId, date, time, location) => {
    try {
      setError(null);
      //console.log('\n🚀 [DB] Scheduling appointment...');

      const payload = { donorId, requesterId, date, time, location };
      const result = await appointmentAPI.create(payload);

      if (result.success && result.data) {
        //console.log('✅ [DB] Appointment scheduled:', result.data.id);
        setAppointments((prev) => [...prev, result.data]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to schedule appointment');
      }
    } catch (e) {
      const msg = `Error scheduling appointment: ${e.message}`;
      console.error('❌ [DB]', msg);
      setError(msg);
      throw e;
    }
  };

  // Add hospital
  const addHospital = async (name, location, contact, latitude, longitude, address) => {
    try {
      setError(null);
      //console.log('\n🚀 [DB] Creating hospital...');

      const payload = { name, location, contact, latitude, longitude, address };
      const result = await hospitalAPI.create(payload);

      if (result.success && result.data) {
        //console.log('✅ [DB] Hospital created:', result.data.id);
        setHospitals((prev) => [...prev, result.data]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create hospital');
      }
    } catch (e) {
      const msg = `Error creating hospital: ${e.message}`;
      console.error('❌ [DB]', msg);
      setError(msg);
      throw e;
    }
  };

  return (
    <DBContext.Provider value={{
      requesters,
      donors,
      hospitals,
      appointments,
      alerts,
      isLoading,
      error,
      addRequester,
      updateRequesterStatus,
      deleteRequester,
      scheduleAppointment,
      refreshData,
      fetchAdminData,
      addHospital
    }}>
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => {
  const context = useContext(DBContext);
  if (!context) {
    throw new Error("useDB must be used within a DBProvider");
  }
  return context;
};
