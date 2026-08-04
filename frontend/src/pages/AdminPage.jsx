import React from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import { PortalAdmin } from "../components/PortalAdmin.jsx";

export default function AdminPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <AdminLayout>
      <div className="space-y-4">
        <PortalAdmin user={user} />
      </div>
    </AdminLayout>
  );
}
