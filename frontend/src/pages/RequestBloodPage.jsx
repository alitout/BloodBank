import React from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import DonorLayout from "../components/DonorLayout.jsx";
import { NewRequestForm } from "../components/NewRequestForm.jsx";

export default function RequestBloodPage() {
  const { t } = useLanguage();

  return (
    <DonorLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">{t("requestBlood") || "Request Blood"}</h2>
        <NewRequestForm />
      </div>
    </DonorLayout>
  );
}
