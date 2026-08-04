// API Base URL - for production, use environment variable
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';


// Header
export const HEADER = {
  'Content-Type': 'application/json',
};

// Register new donor
export const AUTH_REGISTER_DONOR = `${BASE_URL}/auth/register`;

// Login user
export const AUTH_LOGIN = `${BASE_URL}/auth/login`;

// Refresh access token
export const AUTH_REFRESH_TOKEN = `${BASE_URL}/auth/refresh-token`;

// Logout user
export const AUTH_LOGOUT = `${BASE_URL}/auth/logout`;

// Get all accounts
export const AUTH_GET_ALL_ACCOUNTS = `${BASE_URL}/auth/admin/accounts`;

// Admin: Create donor
export const AUTH_ADMIN_CREATE_DONOR = `${BASE_URL}/auth/admin/create-donor`;

// Admin: Create super admin
export const AUTH_ADMIN_CREATE_SUPER_ADMIN = `${BASE_URL}/auth/admin/create-super-admin`;

// Admin: Create hospital
export const AUTH_ADMIN_CREATE_HOSPITAL = `${BASE_URL}/auth/admin/create-hospital`;

// Admin: Verify user
export const AUTH_ADMIN_VERIFY_USER = (uid) => `${BASE_URL}/auth/admin/verify/${uid}`;

// Admin: Get pending users
export const AUTH_ADMIN_GET_PENDING = `${BASE_URL}/auth/admin/pending`;

// Donor: Record donation
export const AUTH_DONOR_RECORD_DONATION = (uid) => `${BASE_URL}/auth/donor/${uid}/record-donation`;


// Get all blood requests
export const REQUESTER_GET_ALL = `${BASE_URL}/requesters`;

// Create blood request
export const REQUESTER_CREATE = `${BASE_URL}/requesters`;

// Update blood request
export const REQUESTER_UPDATE = (id) => `${BASE_URL}/requesters/${id}`;

// Delete blood request
export const REQUESTER_DELETE = (id) => `${BASE_URL}/requesters/${id}`;

// Get all hospitals
export const HOSPITAL_GET_ALL = `${BASE_URL}/hospitals`;

// Create hospital
export const HOSPITAL_CREATE = `${BASE_URL}/hospitals`;

// Update hospital
export const HOSPITAL_UPDATE = (id) => `${BASE_URL}/hospitals/${id}`;

// Delete hospital
export const HOSPITAL_DELETE = (id) => `${BASE_URL}/hospitals/${id}`;

// Get all appointments
export const APPOINTMENT_GET_ALL = `${BASE_URL}/appointments`;

// Create appointment
export const APPOINTMENT_CREATE = `${BASE_URL}/appointments`;

// Update appointment
export const APPOINTMENT_UPDATE = (id) => `${BASE_URL}/appointments/${id}`;

// Delete appointment
export const APPOINTMENT_DELETE = (id) => `${BASE_URL}/appointments/${id}`;

// Get all alerts
export const ALERT_GET_ALL = `${BASE_URL}/alerts`;

// Create alert
export const ALERT_CREATE = `${BASE_URL}/alerts`;

// Update alert
export const ALERT_UPDATE = (id) => `${BASE_URL}/alerts/${id}`;

// Delete alert
export const ALERT_DELETE = (id) => `${BASE_URL}/alerts/${id}`;
