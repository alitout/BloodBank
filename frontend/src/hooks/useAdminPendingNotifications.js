import { useCallback, useEffect, useState, } from "react";
import { API_BASE_URL, getAccessToken, } from "../utils/api.js";

export const useAdminPendingNotifications = (
    accessToken,
    {
        autoFetch = true,
        refreshInterval = 10000,
    } = {}
) => {
    const [
        pendingAccounts,
        setPendingAccounts,
    ] = useState([]);

    const [
        pendingDonations,
        setPendingDonations,
    ] = useState([]);

    const [
        pendingProfileRequests,
        setPendingProfileRequests,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    const fetchPendingData =
        useCallback(
            async ({
                showLoader = false,
            } = {}) => {
                const token =
                    getAccessToken() ||
                    accessToken;

                if (!token) {
                    setPendingAccounts([]);
                    setPendingDonations([]);
                    setPendingProfileRequests([]);
                    setLoading(false);

                    return;
                }

                try {
                    if (showLoader) {
                        setLoading(true);
                    }

                    setError("");

                    const [
                        accountsResponse,
                        donationsResponse,
                        profileResponse,
                    ] = await Promise.all([
                        fetch(
                            `${API_BASE_URL}/auth/admin/accounts`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    Accept:
                                        "application/json",
                                },
                            }
                        ),

                        fetch(
                            `${API_BASE_URL}/donations/admin/pending`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    Accept:
                                        "application/json",
                                },
                            }
                        ),

                        fetch(
                            `${API_BASE_URL}/auth/profile-requests`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    Accept:
                                        "application/json",
                                },
                            }
                        ),
                    ]);

                    const [
                        accountsData,
                        donationsData,
                        profileData,
                    ] = await Promise.all([
                        accountsResponse.json(),
                        donationsResponse.json(),
                        profileResponse.json(),
                    ]);

                    if (!accountsResponse.ok) {
                        throw new Error(
                            accountsData?.error ||
                            accountsData?.message ||
                            "Failed to load pending accounts"
                        );
                    }

                    if (!donationsResponse.ok) {
                        throw new Error(
                            donationsData?.error ||
                            donationsData?.message ||
                            "Failed to load pending donations"
                        );
                    }

                    if (!profileResponse.ok) {
                        throw new Error(
                            profileData?.error ||
                            profileData?.message ||
                            "Failed to load profile requests"
                        );
                    }

                    const accounts =
                        Array.isArray(
                            accountsData
                        )
                            ? accountsData
                            : [];

                    const donations =
                        Array.isArray(
                            donationsData
                        )
                            ? donationsData
                            : Array.isArray(
                                donationsData?.donations
                            )
                                ? donationsData.donations
                                : [];

                    const profileRequests =
                        Array.isArray(
                            profileData
                        )
                            ? profileData
                            : Array.isArray(
                                profileData?.requests
                            )
                                ? profileData.requests
                                : [];

                    setPendingAccounts(
                        accounts.filter(
                            (account) =>
                                account.verifiedByAdmin !==
                                true
                        )
                    );

                    setPendingDonations(
                        donations
                    );

                    setPendingProfileRequests(
                        profileRequests.filter(
                            (request) =>
                                request.status ===
                                "pending"
                        )
                    );
                } catch (fetchError) {
                    console.error(
                        "[ADMIN NOTIFICATIONS] Fetch error:",
                        fetchError
                    );

                    setError(
                        fetchError.message
                    );
                } finally {
                    setLoading(false);
                }
            },
            [accessToken]
        );

    useEffect(() => {
        if (
            !autoFetch ||
            !accessToken
        ) {
            setLoading(false);

            return undefined;
        }

        fetchPendingData({
            showLoader: true,
        });

        const intervalId =
            window.setInterval(
                () => {
                    fetchPendingData();
                },
                refreshInterval
            );

        const handleUpdate =
            () => {
                fetchPendingData();
            };

        window.addEventListener(
            "admin-pending-updated",
            handleUpdate
        );

        window.addEventListener(
            "pending-donations-updated",
            handleUpdate
        );

        return () => {
            window.clearInterval(
                intervalId
            );

            window.removeEventListener(
                "admin-pending-updated",
                handleUpdate
            );

            window.removeEventListener(
                "pending-donations-updated",
                handleUpdate
            );
        };
    }, [
        autoFetch,
        accessToken,
        refreshInterval,
        fetchPendingData,
    ]);

    const removePendingAccount =
        useCallback(
            (uid) => {
                setPendingAccounts(
                    (currentAccounts) =>
                        currentAccounts.filter(
                            (account) =>
                                account.uid !== uid
                        )
                );
            },
            []
        );

    const removePendingDonation =
        useCallback(
            (donationId) => {
                setPendingDonations(
                    (currentDonations) =>
                        currentDonations.filter(
                            (donation) =>
                                donation.donationId !==
                                donationId
                        )
                );
            },
            []
        );

    const pendingCount =
        pendingAccounts.length +
        pendingDonations.length +
        pendingProfileRequests.length;

    return {
        pendingAccounts,
        pendingDonations,
        pendingProfileRequests,
        pendingCount,
        loading,
        error,

        refetch:
            fetchPendingData,

        removePendingAccount,
        removePendingDonation,
    };
};