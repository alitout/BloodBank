import { useEffect, useRef } from "react";
import { useAuth } from "../components/AuthContext.jsx";

const TEST_MODE = false;

const ACCESS_TOKEN_DURATION = TEST_MODE
  ? 1 * 60 * 1000
  : 60 * 60 * 1000;

const REFRESH_TOKEN_DURATION = TEST_MODE
  ? 3 * 60 * 1000
  : 20 * 24 * 60 * 60 * 1000;

const AUTO_REFRESH_BEFORE_EXPIRY = TEST_MODE
  ? 10 * 1000
  : 10 * 60 * 1000;

// Check refresh token expiration every minute
const REFRESH_TOKEN_CHECK_INTERVAL = 60 * 1000;


export const useSessionExpiration = () => {
  const {
    accessToken,
    refreshToken,
    refreshTokens,
    forceLogout,
  } = useAuth();

  // Timer for refreshing the access token
  const autoRefreshTimerRef = useRef(null);

  // Interval for checking refresh token expiration
  const refreshTokenCheckIntervalRef = useRef(null);

  // Prevent multiple refresh requests at the same time
  const isRefreshingRef = useRef(false);


  useEffect(() => {

    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (refreshTokenCheckIntervalRef.current) {
      clearInterval(
        refreshTokenCheckIntervalRef.current
      );

      refreshTokenCheckIntervalRef.current = null;
    }

    if (!accessToken || !refreshToken) {
      console.log(
        "🔐 [SESSION] No active authentication tokens."
      );

      return;
    }

    // If accessToken exists in localStorage,
    // the user selected "Stay Logged In".
    //
    // Otherwise use sessionStorage.

    const storage = localStorage.getItem("accessToken")
      ? localStorage
      : sessionStorage;


    const storageName =
      storage === localStorage
        ? "localStorage"
        : "sessionStorage";


    const tokenExpirationTime = parseInt(
      storage.getItem("tokenExpirationTime") || "0",
      10
    );

    const refreshTokenExpirationTime = parseInt(
      storage.getItem("refreshTokenExpirationTime") || "0",
      10
    );

    console.log(
      "🔐 [SESSION] Session expiration check:",
      {
        storage: storageName,

        now: new Date().toISOString(),

        accessToken: {
          expiresAt: tokenExpirationTime
            ? new Date(
                tokenExpirationTime
              ).toISOString()
            : "missing",

          remainingMinutes:
            tokenExpirationTime
              ? Math.round(
                  (
                    tokenExpirationTime -
                    Date.now()
                  ) /
                    1000 /
                    60
                )
              : "unknown",
        },

        refreshToken: {
          expiresAt:
            refreshTokenExpirationTime
              ? new Date(
                  refreshTokenExpirationTime
                ).toISOString()
              : "missing",

          remainingDays:
            refreshTokenExpirationTime
              ? Math.round(
                  (
                    refreshTokenExpirationTime -
                    Date.now()
                  ) /
                    1000 /
                    60 /
                    60 /
                    24
                )
              : "unknown",
        },
      }
    );

    if (!refreshTokenExpirationTime) {
      console.warn(
        "⚠️ [SESSION] Missing refresh token expiration timestamp."
      );

      console.warn(
        "⚠️ [SESSION] Session expiration monitoring will not start."
      );

      return;
    }

    const checkRefreshTokenExpiration = () => {

      // Re-read from storage every time.
      //
      // This is important because refreshTokens()
      // may update token timestamps.

      const currentRefreshExpirationTime =
        parseInt(
          storage.getItem(
            "refreshTokenExpirationTime"
          ) || "0",
          10
        );


      if (!currentRefreshExpirationTime) {
        console.warn(
          "⚠️ [SESSION] Refresh token expiration timestamp disappeared."
        );

        return;
      }


      const remainingTime =
        currentRefreshExpirationTime -
        Date.now();


      // Debug
      if (TEST_MODE) {
        console.log(
          "🧪 [SESSION] Refresh token remaining:",
          Math.max(
            0,
            Math.round(
              remainingTime /
                1000
            )
          ),
          "seconds"
        );
      }

      if (remainingTime <= 0) {

        console.warn(
          "🚨 [SESSION] Refresh token expired. Logging out."
        );


        // Stop checking
        if (
          refreshTokenCheckIntervalRef.current
        ) {

          clearInterval(
            refreshTokenCheckIntervalRef.current
          );

          refreshTokenCheckIntervalRef.current =
            null;
        }


        // Stop access-token refresh
        if (
          autoRefreshTimerRef.current
        ) {

          clearTimeout(
            autoRefreshTimerRef.current
          );

          autoRefreshTimerRef.current = null;
        }


        // Logout
        forceLogout();
      }
    };


    checkRefreshTokenExpiration();

    refreshTokenCheckIntervalRef.current =
      setInterval(
        checkRefreshTokenExpiration,
        REFRESH_TOKEN_CHECK_INTERVAL
      );

    if (tokenExpirationTime) {

      const now = Date.now();

      const timeUntilAccessTokenExpiry =
        tokenExpirationTime - now;


      const timeUntilAutoRefresh =
        timeUntilAccessTokenExpiry -
        AUTO_REFRESH_BEFORE_EXPIRY;

      if (
        timeUntilAutoRefresh > 0
      ) {

        console.log(
          "⏱️ [SESSION] Access token refresh scheduled in:",
          Math.round(
            timeUntilAutoRefresh /
              1000 /
              60
          ),
          "minutes"
        );


        autoRefreshTimerRef.current =
          setTimeout(
            async () => {

              // Check if refresh token is still valid
              const currentRefreshExpirationTime =
                parseInt(
                  storage.getItem(
                    "refreshTokenExpirationTime"
                  ) || "0",
                  10
                );


              if (
                currentRefreshExpirationTime &&
                Date.now() >=
                  currentRefreshExpirationTime
              ) {

                console.warn(
                  "🚨 [SESSION] Refresh token expired before access token refresh."
                );

                forceLogout();

                return;
              }


              // Prevent duplicate refresh requests
              if (
                isRefreshingRef.current
              ) {

                console.log(
                  "⏳ [SESSION] Token refresh already in progress."
                );

                return;
              }


              isRefreshingRef.current =
                true;


              try {

                console.log(
                  "🔄 [SESSION] Access token approaching expiration. Refreshing..."
                );


                const success =
                  await refreshTokens();


                if (success) {

                  console.log(
                    "✅ [SESSION] Access token refreshed successfully."
                  );

                } else {

                  console.error(
                    "❌ [SESSION] Access token refresh failed."
                  );

                }

              } catch (error) {

                console.error(
                  "❌ [SESSION] Error refreshing access token:",
                  error
                );

              } finally {

                isRefreshingRef.current =
                  false;

              }

            },
            timeUntilAutoRefresh
          );
      }

      else if (
        timeUntilAccessTokenExpiry > 0
      ) {

        console.log(
          "🔄 [SESSION] Access token is close to expiration. Refreshing now..."
        );


        if (
          !isRefreshingRef.current
        ) {

          isRefreshingRef.current =
            true;


          refreshTokens()
            .then(
              (success) => {

                if (success) {

                  console.log(
                    "✅ [SESSION] Access token refreshed successfully."
                  );

                } else {

                  console.error(
                    "❌ [SESSION] Access token refresh failed."
                  );

                }

              }
            )
            .catch(
              (error) => {

                console.error(
                  "❌ [SESSION] Error refreshing access token:",
                  error
                );

              }
            )
            .finally(
              () => {

                isRefreshingRef.current =
                  false;

              }
            );
        }
      }

      else {

        console.warn(
          "⚠️ [SESSION] Access token has already expired."
        );


        // If refresh token is still valid,
        // try to refresh the access token.

        const currentRefreshExpirationTime =
          parseInt(
            storage.getItem(
              "refreshTokenExpirationTime"
            ) || "0",
            10
          );


        if (
          currentRefreshExpirationTime &&
          Date.now() <
            currentRefreshExpirationTime
        ) {

          console.log(
            "🔄 [SESSION] Refresh token is still valid. Refreshing access token..."
          );


          if (
            !isRefreshingRef.current
          ) {

            isRefreshingRef.current =
              true;


            refreshTokens()
              .then(
                (success) => {

                  if (success) {

                    console.log(
                      "✅ [SESSION] Expired access token refreshed successfully."
                    );

                  } else {

                    console.error(
                      "❌ [SESSION] Could not refresh expired access token."
                    );

                  }

                }
              )
              .catch(
                (error) => {

                  console.error(
                    "❌ [SESSION] Error refreshing expired access token:",
                    error
                  );

                }
              )
              .finally(
                () => {

                  isRefreshingRef.current =
                    false;

                }
              );
          }

        } else {

          console.warn(
            "🚨 [SESSION] Both access and refresh tokens are expired."
          );


          forceLogout();
        }
      }


    } else {

      console.warn(
        "⚠️ [SESSION] Missing access token expiration timestamp."
      );

    }

    return () => {

      if (
        autoRefreshTimerRef.current
      ) {

        clearTimeout(
          autoRefreshTimerRef.current
        );

        autoRefreshTimerRef.current =
          null;
      }


      if (
        refreshTokenCheckIntervalRef.current
      ) {

        clearInterval(
          refreshTokenCheckIntervalRef.current
        );

        refreshTokenCheckIntervalRef.current =
          null;
      }

    };

  }, [
    accessToken,
    refreshToken,
    refreshTokens,
    forceLogout,
  ]);


  return {
    autoRefreshTimerRef,
    refreshTokenCheckIntervalRef,
  };
};
