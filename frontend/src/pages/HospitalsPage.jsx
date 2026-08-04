import React from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import DonorLayout from "../components/DonorLayout.jsx";
import { PortalHospital } from "../components/PortalHospital.jsx";

export default function HospitalsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <DonorLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">{t("hospitals") || "Hospitals"}</h2>
        <PortalHospital user={user} />
      </div>
    </DonorLayout>
  );
}
