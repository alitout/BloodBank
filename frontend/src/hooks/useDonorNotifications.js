import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../utils/api.js';

export const useDonorNotifications = (accessToken, options = {}) => {
  const {
    autoFetch = true,
    refreshInterval = 30000,
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) {
      hasLoadedRef.current = false;
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);

      return;
    }

    try {
      if (!hasLoadedRef.current) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/requesters/notifications`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to fetch notifications'
        );
      }

      const newNotifications =
        Array.isArray(data.notifications)
          ? data.notifications
          : [];

      const newUnreadCount =
        typeof data.unreadCount === 'number'
          ? data.unreadCount
          : newNotifications.filter(
            notification => !notification.read
          ).length;

      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);

      window.dispatchEvent(
        new CustomEvent(
          "donor-notifications-updated",
          {
            detail: {
              notifications:
                newNotifications,
              unreadCount:
                newUnreadCount,
            },
          }
        )
      );
      window.dispatchEvent(
        new CustomEvent(
          "donor-notifications-updated",
          {
            detail: {
              notifications:
                newNotifications,
              unreadCount:
                newUnreadCount,
            },
          }
        )
      );

      hasLoadedRef.current = true;

    } catch (err) {
      console.error(
        '❌ [NOTIFICATIONS] Fetch error:',
        err
      );

      setError(err.message);

    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!autoFetch || !accessToken) {
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };

  }, [
    autoFetch,
    accessToken,
    refreshInterval,
    fetchNotifications
  ]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!accessToken || !notificationId) {
        return false;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/requesters/notifications/${notificationId}/read`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
            'Failed to mark notification as read'
          );
        }

        // Update local state immediately
        setNotifications(prev =>
          prev.map(notification =>
            notification._id === notificationId
              ? {
                ...notification,
                read: true,
                readAt: new Date().toISOString(),
              }
              : notification
          )
        );

        setUnreadCount(prev =>
          Math.max(0, prev - 1)
        );

        return true;

      } catch (err) {
        console.error(
          '❌ [NOTIFICATIONS] Mark as read error:',
          err
        );

        return false;
      }
    },
    [accessToken]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
  };
};