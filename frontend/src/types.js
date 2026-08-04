/**
 * @typedef {"A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"} BloodType
 */

/**
 * @typedef {Object} Requester
 * @property {string} id
 * @property {string} name
 * @property {BloodType} bloodType
 * @property {string} hospital
 * @property {number} unitsNeeded
 * @property {"pending" | "fulfilled" | "cancelled"} status
 * @property {string} date
 * @property {string} [description]
 * @property {string} [relationToPatient]
 */

/**
 * @typedef {Object} Donor
 * @property {string} uid - Unique identifier
 * @property {string} email - Email address
 * @property {string} fname - First name
 * @property {string} lname - Last name
 * @property {string} phone - Phone number
 * @property {BloodType} bloodType - Blood type
 * @property {string} [lastDonationDate] - Last donation date
 * @property {number} donationCount - Number of donations
 * @property {"eligible" | "cool-down" | "deferred"} status - Donation eligibility status
 * @property {boolean} verifiedByAdmin - Admin verification status
 * @property {string} role - Should be "donor"
 * @property {string} createdAt - Account creation date
 * @property {string} updatedAt - Last update date
 */

/**
 * @typedef {Object} Hospital
 * @property {string} id
 * @property {string} name
 * @property {string} location
 * @property {string} contact
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} [address]
 * @property {boolean} verified
 * @property {string} [verifiedBy]
 */

/**
 * @typedef {Object} Appointment
 * @property {string} id
 * @property {string} donorId
 * @property {string} requesterId
 * @property {string} date
 * @property {string} time
 * @property {string} location
 * @property {"scheduled" | "completed" | "cancelled"} status
 */

/**
 * @typedef {Object} UserSession
 * @property {string} uid
 * @property {string} email
 * @property {string} fname - First name (for donor role)
 * @property {string} [lname] - Last name (for donor role)
 * @property {"donor" | "super_admin"} role
 * @property {string} phone
 * @property {boolean} verifiedByAdmin
 * @property {BloodType} [bloodType] - Blood type (for donor role)
 * @property {"eligible" | "cool-down" | "deferred"} [status] - Donation status (for donor role)
 * @property {string} [superAdminFName] - First name (for super_admin role)
 * @property {string} [superAdminLName] - Last name (for super_admin role)
 */

/**
 * @typedef {"donor" | "super_admin"} UserType
 */

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
