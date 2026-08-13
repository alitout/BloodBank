import React from "react";
import { Navigate, useRoutes, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import { getDonorIntent, getDonorIntentDestination, } from "../utils/donorIntent.js";
import LoginPage from "../pages/LoginPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import DonorIntentPage from "../pages/DonorIntentPage.jsx";
import { RequestDetailPage, } from "../pages/RequestDetailPage.jsx";
import { ShieldAlert, ArrowLeft, } from "lucide-react";
import { SignOutButton, } from "../components/SignOutButton.jsx";
import { useLanguage, } from "../components/LanguageContext.jsx";


const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    Loading...
  </div>
);

const AccessDenied = () => {
  const {
    t,
  } = useLanguage();

  const navigate =
    useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {t("accessDenied")}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {t(
              "accessDeniedDescription"
            )}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard",
                  {
                    replace: true,
                  }
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />

              {t("backToDashboard")}
            </button>

            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
};

const getAuthenticatedDestination = (user) => {
  if (!user) {
    return "/login";
  }

  if (user.role === "super_admin") {
    return "/admin";
  }

  if (user.role === "donor") {
    const intent =
      getDonorIntent(user.uid);

    return intent
      ? getDonorIntentDestination(intent)
      : "/donor-intent";
  }

  return "/dashboard?tab=seek-blood";
};

const ProtectedRoute = ({ element, requiredRole = null, isAdminOnly = false, }) => {
  const { user, isLoading, } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.role === "super_admin" && !isAdminOnly) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <AccessDenied />;
  }

  return element;
};

const PublicRoute = ({ element, }) => {
  const { user, isLoading, } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (user) {
    return (
      <Navigate
        to={getAuthenticatedDestination(user)}
        replace
      />
    );
  }

  return element;
};

const Routes = () => {
  return useRoutes([
    {
      path: "/login",
      element: (
        <PublicRoute
          element={<LoginPage />}
        />
      ),
    },
    {
      path: "/",
      element: (
        <PublicRoute
          element={<LoginPage />}
        />
      ),
    },

    {
      path: "/dashboard",
      element: (
        <ProtectedRoute
          element={<DashboardPage />}
        />
      ),
    },
    {
      path: "/donor-intent",
      element: (
        <ProtectedRoute
          element={<DonorIntentPage />}
          requiredRole={["donor"]}
        />
      ),
    },
    {
      path: "/request-detail/:requestId",
      element: (
        <ProtectedRoute
          element={<RequestDetailPage />}
          requiredRole={["donor"]}
        />
      ),
    },
    {
      path: "/admin",
      element: (
        <ProtectedRoute
          element={<AdminPage />}
          requiredRole={["super_admin"]}
          isAdminOnly
        />
      ),
    },

    // Legacy routes
    {
      path: "/donor-dashboard",
      element: (
        <Navigate
          to="/dashboard?tab=requests"
          replace
        />
      ),
    },
    {
      path: "/available-requests",
      element: (
        <Navigate
          to="/dashboard?tab=requests"
          replace
        />
      ),
    },
    {
      path: "/requests",
      element: (
        <Navigate
          to="/dashboard?tab=requests"
          replace
        />
      ),
    },
    {
      path: "/donors",
      element: (
        <Navigate
          to="/dashboard?tab=requests"
          replace
        />
      ),
    },
    {
      path: "/requestBlood",
      element: (
        <Navigate
          to="/dashboard?tab=seek-blood"
          replace
        />
      ),
    },
    {
      path: "/hospitals",
      element: (
        <Navigate
          to="/dashboard?tab=hospitals"
          replace
        />
      ),
    },
    {
      path: "/profile",
      element: (
        <Navigate
          to="/dashboard?tab=profile"
          replace
        />
      ),
    },

    {
      path: "*",
      element: (
        <Navigate
          to="/"
          replace
        />
      ),
    },
  ]);
};

export default Routes;