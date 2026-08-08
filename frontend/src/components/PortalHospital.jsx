import React, { useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useDB } from "./DBContext.jsx";
import { Building2, Search, MapPin } from "lucide-react";

export const PortalHospital = ({ user }) => {
  const { t, language } = useLanguage();
  const { hospitals, addHospital } = useDB();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center gap-4">
          <Building2 className="w-12 h-12 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {language === "ar" ? "شبكة المستشفيات" : "Hospitals Network"}
            </h3>
            <p className="text-slate-600 text-sm">
              {language === "ar"
                ? "شبكة المستشفيات المعتمدة مع جمعية الإسعاف اللبنانية"
                : "Approved hospital affiliates with Lebanese Succor Association"
              }
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={language === "ar" ? "ابحث عن مستشفى..." : "Search hospitals..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
        />
      </div>

      <div className="grid gap-3">
        {filtered.map(hospital => (
          <div key={hospital.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition">
            <h4 className="font-bold text-slate-900">{hospital.name}</h4>
            <div className="flex items-center gap-2 text-slate-600 text-sm mt-2">
              <MapPin className="w-4 h-4" />
              {hospital.location}
            </div>
            <div className="text-sm text-slate-600 mt-2">
              {language === "ar" ? "الاتصال:" : "Contact:"} {hospital.phoneNumber || hospital.contact}
            </div>
            {hospital.verified && (
              <div className="mt-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                ✓ {language === "ar" ? "موثقة" : "Verified"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
