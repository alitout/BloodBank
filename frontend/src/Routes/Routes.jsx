import React from "react";
import { useRoutes, Navigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";

// Page Components
import LoginPage from "../pages/LoginPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import RequestBloodPage from "../pages/RequestBloodPage.jsx";
import HospitalsPage from "../pages/HospitalsPage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import { DonorProfilePage } from "../pages/DonorProfilePage.jsx";
import { RequestDetailPage } from "../pages/RequestDetailPage.jsx";


export const AccessDenied = () => <div>You can't access this page</div>

// Protected Route Component
const ProtectedRoute = ({ element, requiredRole = null, isAdminOnly = false }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is admin and route is not admin, redirect to /admin
  if (user.role === "super_admin" && !isAdminOnly) {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return element;
};

// Public Route Component (redirects to /dashboard for donors, or /admin for super_admin)
const PublicRoute = ({ element }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user) {
    // Redirect admins to /admin, all authenticated users to /dashboard
    if (user.role === "super_admin") {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return element;
};

const Routes = () => {
  const routes = useRoutes([
    // Public routes
    {
      path: "/login",
      element: <PublicRoute element={<LoginPage />} />
    },
    {
      path: "/",
      element: <PublicRoute element={<LoginPage />} />
    },

    // Protected routes
    {
      path: "/dashboard",
      element: <ProtectedRoute element={<DashboardPage />} />
    },
    {
      path: "/profile",
      element: <ProtectedRoute element={<DonorProfilePage />} requiredRole={["donor"]} />
    },
    {
      path: "/donor-dashboard",
      element: <ProtectedRoute element={<DashboardPage />} requiredRole={["donor"]} />
    },
    {
      path: "/available-requests",
      element: <ProtectedRoute element={<DashboardPage />} requiredRole={["donor"]} />
    },
    {
      path: "/requests",
      element: <ProtectedRoute element={<DashboardPage />} requiredRole={["donor"]} />
    },
    {
      path: "/request-detail/:requestId",
      element: <ProtectedRoute element={<RequestDetailPage />} requiredRole={["donor"]} />
    },
    {
      path: "/donors",
      element: <ProtectedRoute element={<DashboardPage />} requiredRole={["donor"]} />
    },
    {
      path: "/requestBlood",
      element: <ProtectedRoute element={<RequestBloodPage />} />
    },
    {
      path: "/hospitals",
      element: <ProtectedRoute element={<HospitalsPage />} />
    },
    {
      path: "/admin",
      element: <ProtectedRoute element={<AdminPage />} requiredRole={["super_admin"]} isAdminOnly={true} />
    },

    // Catch all - redirect to dashboard or login
    {
      path: "*",
      element: <Navigate to="/" replace />
    }
  ]);

  return routes;
};

export default Routes;
