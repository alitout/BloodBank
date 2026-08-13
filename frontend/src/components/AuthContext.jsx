import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authAPI, getAccessToken } from "../utils/api.js";

const TEST_MODE = false;

const AuthContext =
  createContext(undefined);

const ACCESS_TOKEN_DURATION =
  TEST_MODE
    ? 1 * 60 * 1000
    : 15 * 60 * 1000;

const REFRESH_TOKEN_DURATION =
  TEST_MODE
    ? 3 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

const getJwtExpirationTime = (
  token,
  fallbackDuration
) => {
  try {
    const encodedPayload = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const paddedPayload =
      encodedPayload.padEnd(
        Math.ceil(
          encodedPayload.length / 4
        ) * 4,
        '='
      );

    const payload = JSON.parse(
      decodeURIComponent(
        atob(paddedPayload)
          .split('')
          .map(
            (character) =>
              `%${character
                .charCodeAt(0)
                .toString(16)
                .padStart(2, '0')}`
          )
          .join('')
      )
    );

    return Number(payload.exp) * 1000;
  } catch {
    return (
      Date.now() + fallbackDuration
    );
  }
};

const storeTokenTimestamps = (
  storage,
  accessTokenValue,
  refreshTokenValue
) => {
  const now = Date.now();

  storage.setItem(
    'tokenCreationTime',
    now.toString()
  );

  storage.setItem(
    'tokenExpirationTime',
    getJwtExpirationTime(
      accessTokenValue,
      ACCESS_TOKEN_DURATION
    ).toString()
  );

  storage.setItem(
    'refreshTokenCreationTime',
    now.toString()
  );

  storage.setItem(
    'refreshTokenExpirationTime',
    getJwtExpirationTime(
      refreshTokenValue,
      REFRESH_TOKEN_DURATION
    ).toString()
  );
};

const clearStorage = (storage) => {
  storage.removeItem("accessToken");
  storage.removeItem("refreshToken");
  storage.removeItem("user");
  storage.removeItem("tokenCreationTime");
  storage.removeItem("tokenExpirationTime");
  storage.removeItem("refreshTokenCreationTime");
  storage.removeItem("refreshTokenExpirationTime");
};

export const AuthProvider = ({ children, }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken,] = useState(null);
  const [refreshToken, setRefreshToken,] = useState(null);
  const [isLoading, setIsLoading,] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleTokensRefreshed = (event) => {
      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      } = event.detail || {};

      if (
        !newAccessToken ||
        !newRefreshToken
      ) {
        return;
      }

      const storage =
        localStorage.getItem(
          'refreshToken'
        )
          ? localStorage
          : sessionStorage;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      storeTokenTimestamps(
        storage,
        newAccessToken,
        newRefreshToken
      );
    };

    window.addEventListener(
      'auth:tokens-refreshed',
      handleTokensRefreshed
    );

    return () =>
      window.removeEventListener(
        'auth:tokens-refreshed',
        handleTokensRefreshed
      );
  }, []);

  const logout =
    useCallback(() => {
      console.log(
        "[AUTH] User logged out"
      );

      let storedUser = user;

      if (!storedUser) {
        try {
          storedUser = JSON.parse(
            sessionStorage.getItem("user") ||
            localStorage.getItem("user") ||
            "null"
          );
        } catch {
          storedUser = null;
        }
      }

      if (storedUser?.uid) {
        sessionStorage.removeItem(
          `donorIntent:${storedUser.uid}`
        );
      }

      if (getAccessToken()) {
        authAPI
          .logoutUser()
          .catch(
            (logoutError) => {
              console.warn(
                "[AUTH] Server logout failed:",
                logoutError
              );
            }
          );
      }

      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setError(null);

      clearStorage(
        sessionStorage
      );

      clearStorage(
        localStorage
      );
    }, [user]);

  const refreshUserProfile =
    useCallback(async () => {
      try {
        const token =
          getAccessToken();

        if (!token) {
          console.warn(
            "[AUTH] Cannot refresh profile: no access token"
          );

          return {
            success: false,
            error:
              "No access token",
          };
        }

        console.log(
          "[AUTH] Refreshing current user profile..."
        );

        const result =
          await authAPI.getCurrentUser();

        if (
          !result?.success ||
          !result?.data
        ) {
          console.error(
            "[AUTH] Profile refresh failed:",
            result?.error
          );

          return {
            success: false,
            error:
              result?.error ||
              "Failed to refresh profile",
          };
        }

        const freshUser =
          result.data.user ||
          result.data;

        if (!freshUser?.uid) {
          console.error(
            "[AUTH] Invalid profile response:",
            result.data
          );

          return {
            success: false,
            error:
              "Invalid profile response",
          };
        }

        console.log(
          "[AUTH] Fresh profile received:",
          {
            uid:
              freshUser.uid,
            status:
              freshUser.status,
            donationCount:
              freshUser.donationCount,
            lastDonationDate:
              freshUser.lastDonationDate,
            nextEligibleDate:
              freshUser.nextEligibleDate,
          }
        );

        setUser(freshUser);

        const storage =
          localStorage.getItem(
            "accessToken"
          )
            ? localStorage
            : sessionStorage;

        storage.setItem(
          "user",
          JSON.stringify(
            freshUser
          )
        );

        return {
          success: true,
          user: freshUser,
        };
      } catch (profileError) {
        console.error(
          "[AUTH] refreshUserProfile error:",
          profileError
        );

        return {
          success: false,
          error:
            profileError?.message ||
            "Failed to refresh profile",
        };
      }
    }, []);


  useEffect(() => {
    const initializeAuth =
      async () => {
        try {
          let storage =
            sessionStorage;

          let savedAccessToken =
            sessionStorage.getItem(
              "accessToken"
            );

          let savedRefreshToken =
            sessionStorage.getItem(
              "refreshToken"
            );

          let savedUser =
            sessionStorage.getItem(
              "user"
            );

          if (!savedAccessToken) {
            storage =
              localStorage;

            savedAccessToken =
              localStorage.getItem(
                "accessToken"
              );

            savedRefreshToken =
              localStorage.getItem(
                "refreshToken"
              );

            savedUser =
              localStorage.getItem(
                "user"
              );
          }

          if (
            savedAccessToken &&
            savedUser
          ) {
            try {
              const parsedUser =
                JSON.parse(
                  savedUser
                );

              setAccessToken(
                savedAccessToken
              );

              setRefreshToken(
                savedRefreshToken
              );

              setUser(
                parsedUser
              );

              const profileResult =
                await refreshUserProfile();

              if (
                !profileResult.success
              ) {
                console.warn(
                  "[AUTH] Stored session restored, but profile refresh failed:",
                  profileResult.error
                );
              }
            } catch (
            parseError
            ) {
              console.warn(
                "[AUTH] Invalid stored user data. Clearing session."
              );

              clearStorage(
                storage
              );

              setUser(null);
              setAccessToken(
                null
              );

              setRefreshToken(
                null
              );
            }
          }
        } catch (
        initializationError
        ) {
          console.error(
            "[AUTH] Initialization error:",
            initializationError
          );
        } finally {
          setIsLoading(false);
        }
      };

    initializeAuth();
  }, [refreshUserProfile]);

  const fetchAllAccounts =
    async () => {
      try {
        const result =
          await authAPI.getAllAccounts();

        if (
          result.success &&
          result.data
        ) {
          return result.data;
        }

        throw new Error(
          result.error ||
          "Failed to fetch accounts"
        );
      } catch (fetchError) {
        const message =
          `Failed to fetch accounts: ${fetchError.message}`;

        console.error(
          "[AUTH]",
          message
        );

        setError(message);

        throw fetchError;
      }
    };

  const register = async ({
    email, fname, lname, phone, password, passwordConfirmation, bloodType, dateOfBirth, biologicalSex,
  }) => {
    try {
      setError(null);

      if (!email || !fname || !lname || !phone || !password || !passwordConfirmation || !bloodType || !dateOfBirth || !biologicalSex) {
        const message =
          "All fields are required";

        setError(message);

        return {
          success: false,
          message,
        };
      }

      const result =
        await authAPI.registerDonor({
          email: email.trim().toLowerCase(),
          fname: fname.trim(),
          lname: lname.trim(),
          phone: phone.trim(),
          password,
          passwordConfirmation,
          bloodType,
          dateOfBirth,
          biologicalSex,
        });

      if (
        !result.success ||
        !result.data
      ) {
        const message =
          result.error ||
          "Registration failed";

        setError(message);

        return {
          success: false,
          message,
        };
      }

      /*
       * Registration uses sessionStorage.
       */
      clearStorage(
        localStorage
      );

      const storage =
        sessionStorage;

      storage.setItem(
        "accessToken",
        result.data.accessToken
      );

      storage.setItem(
        "refreshToken",
        result.data.refreshToken
      );

      storage.setItem(
        "user",
        JSON.stringify(
          result.data.user
        )
      );

      storeTokenTimestamps(
        storage,
        result.data.accessToken,
        result.data.refreshToken
      );

      setAccessToken(
        result.data.accessToken
      );

      setRefreshToken(
        result.data.refreshToken
      );

      setUser(
        result.data.user
      );

      const profileResult =
        await refreshUserProfile();

      if (
        !profileResult.success
      ) {
        console.warn(
          "[AUTH] Registration succeeded, but profile refresh failed:",
          profileResult.error
        );
      }

      return {
        success: true,
        message:
          "Account created successfully!",
      };
    } catch (
    registrationError
    ) {
      const message =
        `Registration error: ${registrationError.message}`;

      setError(message);

      console.error(
        "[AUTH]",
        message
      );

      return {
        success: false,
        message,
      };
    }
  };

  const login = async (
    loginData
  ) => {
    try {
      setError(null);

      const {
        email,
        phone,
        password,
        stayLoggedIn,
      } = loginData;

      if (
        !password ||
        (!email && !phone)
      ) {
        const message =
          "Email/phone and password are required";

        setError(message);

        return {
          success: false,
          message,
        };
      }

      const result =
        await authAPI.loginUser(
          email,
          phone,
          password
        );

      if (
        !result.success ||
        !result.data
      ) {
        const message =
          result.error ||
          "Login failed";

        setError(message);

        return {
          success: false,
          message,
        };
      }

      const storage =
        stayLoggedIn
          ? localStorage
          : sessionStorage;

      /*
       * Prevent old tokens existing in both
       * storage locations.
       */
      const otherStorage =
        stayLoggedIn
          ? sessionStorage
          : localStorage;

      clearStorage(
        otherStorage
      );

      /*
       * IMPORTANT:
       * Store access token before calling
       * refreshUserProfile().
       *
       * getAccessToken() reads browser
       * storage.
       */
      storage.setItem(
        "accessToken",
        result.data.accessToken
      );

      storage.setItem(
        "refreshToken",
        result.data.refreshToken
      );

      storage.setItem(
        "user",
        JSON.stringify(
          result.data.user
        )
      );

      storeTokenTimestamps(
        storage,
        result.data.accessToken,
        result.data.refreshToken
      );

      setAccessToken(
        result.data.accessToken
      );

      setRefreshToken(
        result.data.refreshToken
      );

      setUser(
        result.data.user
      );

      /*
       * NOW request /auth/me.
       */
      const profileResult =
        await refreshUserProfile();

      if (
        !profileResult.success
      ) {
        console.warn(
          "[AUTH] Login succeeded, but profile refresh failed:",
          profileResult.error
        );
      }

      return {
        success: true,
        message:
          "Successfully logged in!",
      };
    } catch (loginError) {
      const message =
        `Login error: ${loginError.message}`;

      setError(message);

      console.error(
        "[AUTH]",
        message
      );

      return {
        success: false,
        message,
      };
    }
  };

  /*
   * Rotate both tokens.
   */
  const refreshTokens =
    useCallback(async () => {
      try {
        /*
         * Read latest token from storage first.
         * This prevents stale React closure problems.
         */
        const storedRefreshToken =
          localStorage.getItem(
            "refreshToken"
          ) ||
          sessionStorage.getItem(
            "refreshToken"
          ) ||
          refreshToken;

        if (
          !storedRefreshToken
        ) {
          console.warn(
            "[AUTH] No refresh token available"
          );

          return false;
        }

        const result =
          await authAPI.refreshAccessToken(
            storedRefreshToken
          );

        if (
          !result.success ||
          !result.data
        ) {
          console.error(
            "[AUTH] Token refresh failed:",
            result.error
          );

          logout();

          return false;
        }

        const newAccessToken =
          result.data.accessToken;

        const newRefreshToken =
          result.data.refreshToken;

        if (
          !newAccessToken ||
          !newRefreshToken
        ) {
          console.error(
            "[AUTH] Refresh endpoint did not return both tokens"
          );

          logout();

          return false;
        }

        const storage =
          localStorage.getItem(
            "refreshToken"
          )
            ? localStorage
            : sessionStorage;

        setAccessToken(
          newAccessToken
        );

        setRefreshToken(
          newRefreshToken
        );

        storage.setItem(
          "accessToken",
          newAccessToken
        );

        storage.setItem(
          "refreshToken",
          newRefreshToken
        );

        /*
         * Backend rotated the refresh token,
         * therefore both timestamps restart.
         */
        storeTokenTimestamps(
          storage,
          newAccessToken,
          newRefreshToken
        );

        console.log(
          "[AUTH] Tokens rotated successfully"
        );

        return true;
      } catch (refreshError) {
        console.error(
          "[AUTH] Token refresh error:",
          refreshError
        );

        logout();

        return false;
      }
    }, [
      refreshToken,
      logout,
    ]);

  const enableKeepMeSignedIn =
    () => {
      const accessTokenValue = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
      const refreshTokenValue = sessionStorage.getItem("refreshToken") || localStorage.getItem("refreshToken");
      const userValue = sessionStorage.getItem("user") || localStorage.getItem("user");
      const tokenCreationTime = sessionStorage.getItem("tokenCreationTime") || localStorage.getItem("tokenCreationTime");
      const tokenExpirationTime = sessionStorage.getItem("tokenExpirationTime") || localStorage.getItem("tokenExpirationTime");
      const refreshTokenCreationTime = sessionStorage.getItem("refreshTokenCreationTime") || localStorage.getItem("refreshTokenCreationTime");
      const refreshTokenExpirationTime = sessionStorage.getItem("refreshTokenExpirationTime") || localStorage.getItem("refreshTokenExpirationTime");

      if (accessTokenValue) {
        localStorage.setItem("accessToken", accessTokenValue);
      }

      if (refreshTokenValue) {
        localStorage.setItem("refreshToken", refreshTokenValue);
      }

      if (userValue) {
        localStorage.setItem("user", userValue);
      }

      if (tokenCreationTime) {
        localStorage.setItem("tokenCreationTime", tokenCreationTime);
      }

      if (tokenExpirationTime) {
        localStorage.setItem("tokenExpirationTime", tokenExpirationTime);
      }

      if (refreshTokenCreationTime) {
        localStorage.setItem("refreshTokenCreationTime", refreshTokenCreationTime);
      }

      if (refreshTokenExpirationTime) {
        localStorage.setItem("refreshTokenExpirationTime", refreshTokenExpirationTime);
      }

      clearStorage(
        sessionStorage
      );
    };

  const forceLogout =
    useCallback(() => {
      console.log(
        "[AUTH] Force logout triggered"
      );

      logout();
    }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,

        accessToken,
        refreshToken,

        register,
        login,
        logout,

        fetchAllAccounts,

        refreshTokens,
        refreshUserProfile,

        enableKeepMeSignedIn,
        forceLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};