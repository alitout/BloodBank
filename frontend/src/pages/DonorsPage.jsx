import React from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import DonorLayout from "../components/DonorLayout.jsx";
import { PortalDonor } from "../components/PortalDonor.jsx";

export default function DonorsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <DonorLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">{t("donors") || "Donors"}</h2>
        <PortalDonor user={user} />
      </div>
    </DonorLayout>
  );
}
