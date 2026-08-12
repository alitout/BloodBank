import React from "react";
import { LanguageProvider } from "./components/LanguageContext.jsx";
import { DBProvider } from "./components/DBContext.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";
import { DataCacheProvider } from "./components/DataCacheContext.jsx";
import { InstallPrompt } from "./components/InstallPrompt.jsx";
import { NotificationPermissionPrompt } from "./components/NotificationPermissionPrompt.jsx";
import { SessionExpirationModal } from "./components/SessionExpirationModal.jsx";
import Routes from "./Routes/Routes.jsx";
import { useSessionExpiration } from "./hooks/useSessionExpiration.js";
import { ProfileCompletionModal } from "./components/ProfileCompletionModal.jsx";

// Inner component that uses the useSessionExpiration hook
function AppContent() {
  useSessionExpiration();

  return (
    <>
      <SessionExpirationModal />
      <ProfileCompletionModal />
      <Routes />
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DataCacheProvider>
          <DBProvider>
            <InstallPrompt />
            <NotificationPermissionPrompt />
            <AppContent />
          </DBProvider>
        </DataCacheProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
