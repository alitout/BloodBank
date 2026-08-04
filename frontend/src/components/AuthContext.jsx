import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react"; import { authAPI } from "../utils/api.js";

/**
 * @typedef {Object} AuthContextProps
 * @property {import('../types').UserSession | null} user
 * @property {boolean} isLoading
 * @property {string | null} error
 * @property {string | null} accessToken
 * @property {string | null} refreshToken
 * @property {Function} register
 * @property {Function} login
 * @property {Function} logout
 * @property {Function} fetchAllAccounts
 * @property {Function} refreshTokens
 */

// 🔧 TEST MODE - Set to true for testing with shorter timings
const TEST_MODE = false;

const AuthContext = createContext(undefined);

// Helper function to store token timestamps
const storeTokenTimestamps = (storage) => {
  const now = Date.now();
  // Use test timings if TEST_MODE is enabled
  const ACCESS_TOKEN_DURATION = TEST_MODE ? 1 * 60 * 1000 : 60 * 60 * 1000; // 1 min (test) / 1 hour (prod)
  const REFRESH_TOKEN_DURATION = TEST_MODE ? 3 * 60 * 1000 : 20 * 24 * 60 * 60 * 1000;
  storage.setItem('tokenCreationTime', now.toString());
  storage.setItem('tokenExpirationTime', (now + ACCESS_TOKEN_DURATION).toString());
  storage.setItem('refreshTokenCreationTime', now.toString());
  storage.setItem('refreshTokenExpirationTime', (now + REFRESH_TOKEN_DURATION).toString());

  if (TEST_MODE) {
    console.log('🧪 [TEST MODE] Token timings:');
    console.log(`   Access Token expires in: ${ACCESS_TOKEN_DURATION / 1000}s`);
    console.log(`   Refresh Token expires in: ${REFRESH_TOKEN_DURATION / 1000}s`);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize - restore tokens from sessionStorage or localStorage
  useEffect(() => {
    try {
      //console.log('🔐 [AUTH] Initializing AuthContext...');
      // Check sessionStorage first, then localStorage
      let savedAccessToken = sessionStorage.getItem('accessToken');
      let savedRefreshToken = sessionStorage.getItem('refreshToken');
      let savedUser = sessionStorage.getItem('user');

      // If not in sessionStorage, check localStorage (for "stay logged in")
      if (!savedAccessToken) {
        savedAccessToken = localStorage.getItem('accessToken');
        savedRefreshToken = localStorage.getItem('refreshToken');
        savedUser = localStorage.getItem('user');
      }

      if (savedAccessToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setAccessToken(savedAccessToken);
          setRefreshToken(savedRefreshToken);
          setUser(parsedUser);
          //console.log('✅ [AUTH] Session restored from storage');
        } catch (parseError) {
          console.warn('⚠️ [AUTH] Corrupted user data in storage, clearing...');
          // Clear corrupted data
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('❌ [AUTH] Error during initialization:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all accounts from backend
  const fetchAllAccounts = async () => {
    try {
      //console.log('📥 [AUTH] Fetching all accounts from backend...');
      const result = await authAPI.getAllAccounts();

      if (result.success && result.data) {
        //console.log(`✅ [AUTH] Fetched ${result.data.length} accounts`);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch accounts');
      }
    } catch (e) {
      const errorMsg = `Failed to fetch accounts: ${e.message}`;
      console.error('❌ [AUTH]', errorMsg);
      setError(errorMsg);
      throw e;
    }
  };

  // Register new donor
  const register = async (email, fname, lname, phone, password, passwordConfirmation, bloodType) => {
    try {
      setError(null);

      if (!email || !fname || !lname || !phone || !password || !passwordConfirmation) {
        const msg = "All fields are required";
        setError(msg);
        return { success: false, message: msg };
      }

      //console.log('\n🚀 [AUTH] Registering new donor:', email);

      const result = await authAPI.registerDonor(
        email.trim().toLowerCase(),
        fname.trim(),
        lname.trim(),
        phone.trim(),
        password,
        passwordConfirmation,
        bloodType
      );

      if (result.success && result.data) {
        //console.log('✅ [AUTH] Registration successful');

        // Store tokens
        setAccessToken(result.data.accessToken);
        setRefreshToken(result.data.refreshToken);
        sessionStorage.setItem('accessToken', result.data.accessToken);
        sessionStorage.setItem('refreshToken', result.data.refreshToken);
        storeTokenTimestamps(sessionStorage);

        // Store user data
        setUser(result.data.user);
        sessionStorage.setItem('user', JSON.stringify(result.data.user));

        return { success: true, message: "Account created successfully!" };
      } else {
        const msg = result.error || 'Registration failed';
        setError(msg);
        console.error('❌ [AUTH] Registration failed:', msg);
        return { success: false, message: msg };
      }
    } catch (e) {
      const msg = `Registration error: ${e.message}`;
      setError(msg);
      console.error('❌ [AUTH]', msg);
      return { success: false, message: msg };
    }
  };

  // Login user (email or phone + password)
  const login = async (loginData) => {
    try {
      setError(null);

      const { email, phone, password, stayLoggedIn } = loginData;

      if (!password || (!email && !phone)) {
        const msg = "Email/phone and password are required";
        setError(msg);
        return { success: false, message: msg };
      }

      //console.log('\n🔑 [AUTH] Attempting login...');

      const result = await authAPI.loginUser(email, phone, password);

      if (result.success && result.data) {
        //console.log('✅ [AUTH] Login successful');

        // Determine storage based on stayLoggedIn
        const storage = stayLoggedIn ? localStorage : sessionStorage;

        // Store tokens
        setAccessToken(result.data.accessToken);
        setRefreshToken(result.data.refreshToken);
        storage.setItem('accessToken', result.data.accessToken);
        storage.setItem('refreshToken', result.data.refreshToken);
        storeTokenTimestamps(storage);

        // Store user data
        setUser(result.data.user);
        storage.setItem('user', JSON.stringify(result.data.user));

        return { success: true, message: "Successfully logged in!" };
      } else {
        const msg = result.error || 'Login failed';
        setError(msg);
        console.error('❌ [AUTH] Login failed:', msg);
        return { success: false, message: msg };
      }
    } catch (e) {
      const msg = `Login error: ${e.message}`;
      setError(msg);
      console.error('❌ [AUTH]', msg);
      return { success: false, message: msg };
    }
  };

  // Refresh tokens
  const refreshTokens = useCallback(async () => {
    try {
      if (!refreshToken) {
        console.warn('⚠️  [AUTH] No refresh token available');
        return false;
      }

      //console.log('🔄 [AUTH] Refreshing access token...');

      const result = await authAPI.refreshAccessToken(refreshToken);

      if (result.success && result.data) {
        //console.log('✅ [AUTH] Token refreshed successfully');
        setAccessToken(result.data.accessToken);

        // Update in both storages (in case user has it saved)
        const storage = localStorage.getItem("refreshToken")
          ? localStorage
          : sessionStorage;

        storage.setItem(
          "accessToken",
          result.data.accessToken
        );

        // Only update the ACCESS token expiration.
        // Do NOT reset the 20-day refresh token lifetime.
        const now = Date.now();

        const ACCESS_TOKEN_DURATION = TEST_MODE
          ? 1 * 60 * 1000
          : 60 * 60 * 1000;

        storage.setItem(
          "tokenCreationTime",
          now.toString()
        );

        storage.setItem(
          "tokenExpirationTime",
          (
            now +
            ACCESS_TOKEN_DURATION
          ).toString()
        );

        return true;
      } else {
        console.error('❌ [AUTH] Token refresh failed');
        logout();
        return false;
      }
    } catch (e) {
      console.error('❌ [AUTH] Token refresh error:', e.message);
      logout();
      return false;
    }
  }, [refreshToken, logout]);

  // Logout user
  const logout = useCallback(() => {
    console.log("🚪 [AUTH] User logged out");

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setError(null);

    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("tokenCreationTime");
    sessionStorage.removeItem("tokenExpirationTime");
    sessionStorage.removeItem("refreshTokenCreationTime");
    sessionStorage.removeItem("refreshTokenExpirationTime");

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("tokenCreationTime");
    localStorage.removeItem("tokenExpirationTime");
    localStorage.removeItem("refreshTokenCreationTime");
    localStorage.removeItem("refreshTokenExpirationTime");
  }, []);

  // Enable "keep me signed in" - moves tokens from sessionStorage to localStorage
  const enableKeepMeSignedIn = () => {
    if (TEST_MODE) console.log('🧪 [TEST] Enabling "Keep me signed in" - moving tokens to localStorage');

    const accessTokenValue = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    const refreshTokenValue = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
    const userValue = sessionStorage.getItem('user') || localStorage.getItem('user');
    const tokenCreationTime = sessionStorage.getItem('tokenCreationTime') || localStorage.getItem('tokenCreationTime');
    const tokenExpirationTime = sessionStorage.getItem('tokenExpirationTime') || localStorage.getItem('tokenExpirationTime');
    const refreshTokenCreationTime = sessionStorage.getItem('refreshTokenCreationTime') || localStorage.getItem('refreshTokenCreationTime');
    const refreshTokenExpirationTime = sessionStorage.getItem('refreshTokenExpirationTime') || localStorage.getItem('refreshTokenExpirationTime');

    // Move to localStorage
    if (accessTokenValue) localStorage.setItem('accessToken', accessTokenValue);
    if (refreshTokenValue) localStorage.setItem('refreshToken', refreshTokenValue);
    if (userValue) localStorage.setItem('user', userValue);
    if (tokenCreationTime) localStorage.setItem('tokenCreationTime', tokenCreationTime);
    if (tokenExpirationTime) localStorage.setItem('tokenExpirationTime', tokenExpirationTime);
    if (refreshTokenCreationTime) localStorage.setItem('refreshTokenCreationTime', refreshTokenCreationTime);
    if (refreshTokenExpirationTime) localStorage.setItem('refreshTokenExpirationTime', refreshTokenExpirationTime);

    // Clear from sessionStorage
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  };

  // Force logout - automatically logout when refresh token expires
  const forceLogout = useCallback(() => {
    console.log("🚨 [AUTH] Force logout triggered");
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
        enableKeepMeSignedIn,
        forceLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
