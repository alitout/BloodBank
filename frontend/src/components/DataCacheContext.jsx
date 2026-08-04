import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL, getAccessToken } from '../utils/api.js';

const DataCacheContext = createContext(undefined);

export const DataCacheProvider = ({ children }) => {
  const [cache, setCache] = useState({
    admin: {
      accounts: null,
      donations: null,
      hospitals: null,
      profileRequests: null,
      pendingUsers: null,
      lastFetch: {}
    },
    donor: {
      availableRequests: null,
      assignedRequests: null,
      donationHistory: null,
      hospitals: null,
      lastFetch: {}
    }
  });

  const CACHE_DURATION = 60000; // 1 minute

  const invalidateDonorData = useCallback(
    (keys = []) => {
      setCache((prev) => {
        const newDonor = {
          ...prev.donor,
          lastFetch: {
            ...prev.donor.lastFetch,
          },
        };

        keys.forEach((key) => {
          newDonor[key] = null;
          newDonor.lastFetch[key] = null;
        });

        return {
          ...prev,
          donor: newDonor,
        };
      });
    },
    []
  );

  const isDataStale = (lastFetchTime) => {
    return !lastFetchTime || (Date.now() - lastFetchTime) > CACHE_DURATION;
  };

  // Admin data prefetch
  const prefetchAdminData = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return false;

      const now = Date.now();
      const newCache = { ...cache };

      // Fetch accounts
      if (isDataStale(cache.admin.lastFetch.accounts)) {
        const response = await fetch(`${API_BASE_URL}/auth/admin/accounts`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.admin.accounts = await response.json();
          newCache.admin.lastFetch.accounts = now;
        }
      }

      // Fetch donations
      if (isDataStale(cache.admin.lastFetch.donations)) {
        const response = await fetch(`${API_BASE_URL}/requesters/all-donations`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.admin.donations = await response.json();
          newCache.admin.lastFetch.donations = now;
        }
      }

      // Fetch hospitals
      if (isDataStale(cache.admin.lastFetch.hospitals)) {
        const response = await fetch(`${API_BASE_URL}/hospitals`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.admin.hospitals = await response.json();
          newCache.admin.lastFetch.hospitals = now;
        }
      }

      // Fetch profile requests
      if (isDataStale(cache.admin.lastFetch.profileRequests)) {
        const response = await fetch(`${API_BASE_URL}/auth/profile-requests`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.admin.profileRequests = await response.json();
          newCache.admin.lastFetch.profileRequests = now;
        }
      }

      // Fetch pending users
      if (isDataStale(cache.admin.lastFetch.pendingUsers)) {
        const response = await fetch(`${API_BASE_URL}/auth/admin/pending`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.admin.pendingUsers = await response.json();
          newCache.admin.lastFetch.pendingUsers = now;
        }
      }

      setCache(newCache);
      return true;
    } catch (err) {
      console.error('Error prefetching admin data:', err);
      return false;
    }
  }, [cache]);

  // Donor data prefetch
  const prefetchDonorData = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      if (!accessToken) return false;

      const now = Date.now();
      const newCache = { ...cache };

      // Fetch available requests
      if (isDataStale(cache.donor.lastFetch.availableRequests)) {
        const response = await fetch(`${API_BASE_URL}/requesters/available-requests`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.donor.availableRequests = await response.json();
          newCache.donor.lastFetch.availableRequests = now;
        }
      }

      // Fetch assigned requests
      if (isDataStale(cache.donor.lastFetch.assignedRequests)) {
        const response = await fetch(`${API_BASE_URL}/requesters/assigned-requests`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.donor.assignedRequests = await response.json();
          newCache.donor.lastFetch.assignedRequests = now;
        }
      }

      // Fetch donation history
      if (isDataStale(cache.donor.lastFetch.donationHistory)) {
        const response = await fetch(`${API_BASE_URL}/requesters/donation-history`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.donor.donationHistory = await response.json();
          newCache.donor.lastFetch.donationHistory = now;
        }
      }

      // Fetch hospitals (shared data)
      if (isDataStale(cache.donor.lastFetch.hospitals)) {
        const response = await fetch(`${API_BASE_URL}/hospitals`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          newCache.donor.hospitals = await response.json();
          newCache.donor.lastFetch.hospitals = now;
        }
      }

      setCache(newCache);
      return true;
    } catch (err) {
      console.error('Error prefetching donor data:', err);
      return false;
    }
  }, [cache]);

  // General prefetch based on role
  const prefetchData = useCallback(async (user) => {
    if (!user) return false;

    try {
      if (user.role === 'super_admin') {
        return await prefetchAdminData();
      } else if (user.role === 'donor') {
        return await prefetchDonorData();
      }
    } catch (err) {
      console.error('Error prefetching data:', err);
    }
    return false;
  }, [prefetchAdminData, prefetchDonorData]);

  // Get cached data
  const getCachedData = useCallback((role, dataKey) => {
    if (role === 'super_admin') {
      return cache.admin[dataKey];
    } else if (role === 'donor') {
      return cache.donor[dataKey];
    }
    return null;
  }, [cache]);

  // Invalidate cache
  const invalidateCache = useCallback((role, dataKey) => {
    const newCache = { ...cache };
    if (role === 'super_admin' && dataKey) {
      newCache.admin[dataKey] = null;
      newCache.admin.lastFetch[dataKey] = null;
    } else if (role === 'donor' && dataKey) {
      newCache.donor[dataKey] = null;
      newCache.donor.lastFetch[dataKey] = null;
    }
    setCache(newCache);
  }, [cache]);

  return (
    <DataCacheContext.Provider
      value={{
        cache,
        prefetchData,
        getCachedData,
        invalidateCache,
        invalidateDonorData,
        prefetchAdminData,
        prefetchDonorData
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};
