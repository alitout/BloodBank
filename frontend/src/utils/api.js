// Log styles for console
const logStyles = {
  request: '%c[REQUEST]',
  success: '%c[SUCCESS]',
  error: '%c[ERROR]'
};

const styleColors = {
  request: 'color: #1e90ff; font-weight: bold;',
  success: 'color: #32cd32; font-weight: bold;',
  error: 'color: #ff1493; font-weight: bold;'
};

export const API_BASE_URL =
  __API_BASE_URL__;

/**
 * Get access token from storage
 */
export const getAccessToken = () => {
  return (
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('accessToken')
  );
};

/**
 * Get refresh token from storage
 */
const getRefreshToken = () => {
  return (
    sessionStorage.getItem('refreshToken') ||
    localStorage.getItem('refreshToken')
  );
};

/**
 * Return the storage object currently holding auth tokens
 */
const getTokenStorage = () => {
  if (
    localStorage.getItem('refreshToken') ||
    localStorage.getItem('accessToken')
  ) {
    return localStorage;
  }

  return sessionStorage;
};

/**
 * Save access token to whichever storage currently holds auth tokens
 */
const saveTokens = (
  accessToken,
  refreshToken
) => {
  const storage = getTokenStorage();

  storage.setItem(
    'accessToken',
    accessToken
  );

  if (refreshToken) {
    storage.setItem(
      'refreshToken',
      refreshToken
    );
  }

  window.dispatchEvent(
    new CustomEvent(
      'auth:tokens-refreshed',
      {
        detail: {
          accessToken,
          refreshToken
        }
      }
    )
  );
};

const clearTokens = () => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
let refreshPromise = null;

const refreshAccessTokenDirect = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/refresh-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

      if (!response.ok) {
        clearTokens();
        return null;
      }

      const data = await response.json();

      if (
        data.accessToken &&
        data.refreshToken
      ) {
        saveTokens(
          data.accessToken,
          data.refreshToken
        );

        return data.accessToken;
      }

      clearTokens();
      return null;
    } catch (error) {
      console.error(
        'Token refresh failed:',
        error
      );

      clearTokens();
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const fetchAPI = async (
  endpoint,
  options = {}
) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const makeRequest = async (token) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  try {
    let accessToken =
      getAccessToken();

    let response =
      await makeRequest(accessToken);

    let data;

    const contentType =
      response.headers.get(
        'content-type'
      );

    if (
      contentType &&
      contentType.includes(
        'application/json'
      )
    ) {
      data = await response.json();
    } else {
      data = {
        error: await response.text(),
      };
    }

    // Access token expired
    if (
      response.status === 401 &&
      data.code === 'TOKEN_EXPIRED'
    ) {
      const newAccessToken =
        await refreshAccessTokenDirect();

      if (!newAccessToken) {
        return {
          success: false,
          status: 401,
          error:
            'Session expired. Please login again.',
          code:
            'SESSION_EXPIRED',
        };
      }

      accessToken =
        newAccessToken;

      // Retry original request
      response =
        await makeRequest(
          accessToken
        );

      const retryContentType =
        response.headers.get(
          'content-type'
        );

      if (
        retryContentType &&
        retryContentType.includes(
          'application/json'
        )
      ) {
        data =
          await response.json();
      } else {
        data = {
          error:
            await response.text(),
        };
      }
    }

    if (response.ok) {
      return {
        success: true,
        status: response.status,
        data,
      };
    }

    return {
      success: false,
      status: response.status,
      error:
        data.error ||
        'Unknown error',
      code:
        data.code,
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
/**
 * Auth API calls
 */
export const authAPI = {
  // Register new donor
  registerDonor: (email, fname, lname, phone, password, passwordConfirmation, bloodType) =>
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, fname, lname, phone, password, passwordConfirmation, bloodType })
    }),

  // Login user (email or phone + password)
  loginUser: (email, phone, password) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password })
    }),

  // Refresh access token
  refreshAccessToken: (refreshToken) =>
    fetchAPI('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }),

  getCurrentUser: () =>
    fetchAPI("/auth/me", {
      method: "GET",
    }),

  // Logout user
  logoutUser: () =>
    fetchAPI('/auth/logout', {
      method: 'POST'
    }),

  // Get all accounts (admin only)
  getAllAccounts: () => fetchAPI('/auth/admin/accounts'),

  // Admin: Create donor
  createDonorByAdmin: (email, fname, lname, phone, password, bloodType) =>
    fetchAPI('/auth/admin/create-donor', {
      method: 'POST',
      body: JSON.stringify({ email, fname, lname, phone, password, bloodType })
    }),

  // Admin: Create super admin
  createSuperAdminByAdmin: (email, phone, password, superAdminFName, superAdminLName) =>
    fetchAPI('/auth/admin/create-super-admin', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password, superAdminFName, superAdminLName })
    }),

  // Admin: Create hospital user
  createHospitalByAdmin: (email, phone, password, hospitalName, hospitalContactName, hospitalContactTitle, hospitalAddress) =>
    fetchAPI('/auth/admin/create-hospital', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password, hospitalName, hospitalContactName, hospitalContactTitle, hospitalAddress })
    }),

  // Admin: Verify user
  verifyUser: (uid) =>
    fetchAPI(`/auth/admin/verify/${uid}`, {
      method: 'PATCH'
    }),

  // Admin: Get pending users
  getPendingUsers: () =>
    fetchAPI('/auth/admin/pending')
};

/**
 * Requester (Blood Requests) API calls
 */
export const requesterAPI = {
  getAll: () => fetchAPI('/requesters'),

  create: (data) =>
    fetchAPI('/requesters', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) =>
    fetchAPI(`/requesters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  delete: (id) =>
    fetchAPI(`/requesters/${id}`, {
      method: 'DELETE'
    })
};

/**
 * Hospital API calls
 */
export const hospitalAPI = {
  getAll: () => fetchAPI('/hospitals'),

  create: (data) =>
    fetchAPI('/hospitals', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) =>
    fetchAPI(`/hospitals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  delete: (id) =>
    fetchAPI(`/hospitals/${id}`, {
      method: 'DELETE'
    })
};


/**
 * Appointment API calls
 */
export const appointmentAPI = {
  getAll: () => fetchAPI('/appointments'),

  create: (data) =>
    fetchAPI('/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) =>
    fetchAPI(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  delete: (id) =>
    fetchAPI(`/appointments/${id}`, {
      method: 'DELETE'
    })
};

/**
 * Alert API calls
 */
export const alertAPI = {
  getAll: () => fetchAPI('/alerts'),

  create: (data) =>
    fetchAPI('/alerts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) =>
    fetchAPI(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  delete: (id) =>
    fetchAPI(`/alerts/${id}`, {
      method: 'DELETE'
    })
};

export const donationAPI = {
  getMyDonations: () =>
    fetchAPI('/donations/my'),

  completeDonation: (donationId) =>
    fetchAPI(`/donations/${donationId}/complete`, {
      method: 'PATCH',
    }),

  getPendingDonations: () =>
    fetchAPI('/donations/admin/pending'),

  getAllDonations: () =>
    fetchAPI('/donations/admin/all'),

  approveDonation: (donationId) =>
    fetchAPI(`/donations/admin/${donationId}/approve`, {
      method: 'PATCH',
    }),

  rejectDonation: (donationId, rejectionReason) =>
    fetchAPI(`/donations/admin/${donationId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({
        rejectionReason,
      }),
    }),
};

export default {
  fetchAPI,
  authAPI,
  requesterAPI,
  hospitalAPI,
  appointmentAPI,
  alertAPI,
  donationAPI
};
