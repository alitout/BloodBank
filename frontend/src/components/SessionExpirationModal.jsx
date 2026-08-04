import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useLanguage } from './LanguageContext.jsx';
import { AlertCircle, LogOut, LogIn, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 🔧 TEST MODE - Shows console logs for testing
const TEST_MODE = true;
const MODAL_WARNING_TIME = TEST_MODE ? 10 * 1000 : 5 * 60 * 1000; // 10 sec (test) / 5 min (prod)

export const SessionExpirationModal = () => {
  const { logout, accessToken, refreshTokens, enableKeepMeSignedIn, forceLogout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [modalType, setModalType] = useState('expiring'); // 'expiring' or 'expired'
  const [hasKeepMeSignedIn, setHasKeepMeSignedIn] = useState(false);

  // Check token expiration status
  useEffect(() => {
    if (!accessToken) return;

    const checkTokenExpiration = () => {
      const tokenExpirationTime = parseInt(sessionStorage.getItem('tokenExpirationTime') || localStorage.getItem('tokenExpirationTime') || '0');
      const refreshTokenExpirationTime = parseInt(sessionStorage.getItem('refreshTokenExpirationTime') || localStorage.getItem('refreshTokenExpirationTime') || '0');
      const now = Date.now();
      const hasKeepSignedIn = !!localStorage.getItem('accessToken');
      setHasKeepMeSignedIn(hasKeepSignedIn);

      // Check if refresh token has expired (for auto-logout)
      if (refreshTokenExpirationTime && now >= refreshTokenExpirationTime) {
        if (TEST_MODE) console.log('🧪 [TEST] Refresh token expired, forcing logout');
        forceLogout();
        return;
      }

      if (tokenExpirationTime && now >= tokenExpirationTime) {
        // Token has expired
        if (TEST_MODE) console.log('🧪 [TEST] Token expired');
        setIsVisible(true);
        setTimeRemaining(0);
        setModalType('expired');
      } else if (tokenExpirationTime) {
        const remaining = Math.max(0, tokenExpirationTime - now);
        
        // Show modal when within warning time
        if (remaining <= MODAL_WARNING_TIME && remaining > 0) {
          if (TEST_MODE) console.log(`🧪 [TEST] Token expiring in ${Math.floor(remaining / 1000)}s`);
          setIsVisible(true);
          setTimeRemaining(Math.floor(remaining / 1000));
          setModalType('expiring');
        }
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every 5 seconds in test mode, 30 seconds in production
    const checkInterval = TEST_MODE ? 5000 : 30000;
    const interval = setInterval(checkTokenExpiration, checkInterval);

    // Update countdown timer
    let countdownInterval;
    if (isVisible && timeRemaining !== null) {
      countdownInterval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsVisible(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [accessToken, isVisible, timeRemaining, forceLogout]);

  const handleRefreshSession = async () => {
    if (TEST_MODE) console.log('🧪 [TEST] Attempting to refresh session...');
    const refreshSuccess = await refreshTokens();
    if (refreshSuccess) {
      if (TEST_MODE) console.log('🧪 [TEST] Session refreshed successfully');
      setIsVisible(false);
      setTimeRemaining(null);
    }
  };

  const handleKeepMeSignedIn = async () => {
    if (TEST_MODE) console.log('🧪 [TEST] User enabled "Keep me signed in"');
    // Enable keep me signed in and refresh token
    enableKeepMeSignedIn();
    const refreshSuccess = await refreshTokens();
    if (refreshSuccess) {
      if (TEST_MODE) console.log('🧪 [TEST] Keep me signed in enabled, session refreshed');
      setIsVisible(false);
      setTimeRemaining(null);
      setHasKeepMeSignedIn(true);
    }
  };

  const handleSignOut = () => {
    if (TEST_MODE) console.log('🧪 [TEST] Signing out...');
    logout();
    setIsVisible(false);
    navigate('/login');
  };

  if (!isVisible) return null;

  const minutes = Math.floor((timeRemaining || 0) / 60);
  const seconds = (timeRemaining || 0) % 60;
  const timeText = timeRemaining === 0 
    ? t('sessionExpired') 
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border-l-4 border-red-500">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-slate-900">
            {t('sessionAboutToExpire') || 'Session About to Expire'}
          </h2>
        </div>

        {/* Message */}
        <p className="text-slate-600 mb-2">
          {timeRemaining === 0
            ? t('yourSessionHasExpired') || 'Your session has expired. Please sign in again.'
            : t('yourSessionWillExpireIn') || `Your session will expire in:`}
        </p>

        {/* Time remaining */}
        {timeRemaining !== 0 && (
          <div className="bg-red-50 rounded-lg p-4 mb-6 text-center">
            <div className="text-3xl font-bold text-red-600 font-mono">
              {timeText}
            </div>
            <p className="text-xs text-red-600 mt-2">
              {t('remainingTime') || 'remaining'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {hasKeepMeSignedIn || modalType === 'expiring' ? (
            // Show for: users with "Keep me signed in" or when token is about to expire
            <>
              <button
                onClick={hasKeepMeSignedIn ? handleRefreshSession : handleKeepMeSignedIn}
                disabled={timeRemaining === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {hasKeepMeSignedIn ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('refreshSession') || 'Refresh Session'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('keepMeSignedIn') || 'Keep Me Signed In'}
                  </>
                )}
              </button>

              <button
                onClick={handleSignOut}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('signOut') || 'Sign Out'}
              </button>
            </>
          ) : (
            // Show only Sign Out when token expired
            <button
              onClick={handleSignOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {t('signOut') || 'Sign Out'}
            </button>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-slate-500 mt-4 text-center">
          {hasKeepMeSignedIn
            ? t('refreshYourSessionToStayLogged') || 'Click "Refresh Session" to stay logged in'
            : t('enableKeepMeSignedInToStayLogged') || 'Enable "Keep Me Signed In" to stay logged in for 30 days'}
        </p>
      </div>
    </div>
  );
};
