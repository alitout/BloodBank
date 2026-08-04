import React from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useDB } from "./DBContext.jsx";
import { Heart, Droplet, Calendar, CheckCircle } from "lucide-react";

export const PortalDonor = ({ user }) => {
  const { t, language } = useLanguage();
  const { appointments } = useDB();

  const userAppointments = appointments.filter(apt => apt.donorId === user?.uid);

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'eligible':
        return 'bg-green-100 text-green-800';
      case 'cool-down':
        return 'bg-yellow-100 text-yellow-800';
      case 'deferred':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Donor Profile Header */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
        <div className="flex items-center gap-4">
          <Heart className="w-12 h-12 text-red-600" />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-slate-900">
              {user?.fname} {user?.lname}
            </h3>
            <p className="text-slate-600">
              {language === "ar" ? "حساب متبرع الدم" : "Blood Donor Account"}
            </p>
          </div>
        </div>
      </div>

      {/* Donor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Blood Type */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-slate-600">
                {language === "ar" ? "فصيلة الدم" : "Blood Type"}
              </p>
              <p className="text-2xl font-bold text-slate-900">{user?.bloodType}</p>
            </div>
          </div>
        </div>

        {/* Donation Status */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-slate-600">
                {language === "ar" ? "الحالة" : "Status"}
              </p>
              <div className={`text-sm font-bold py-1 px-2 rounded-full inline-block mt-1 ${getStatusBadgeColor(user?.status)}`}>
                {user?.status?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Donation Count */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-slate-600">
                {language === "ar" ? "عدد التبرعات" : "Donations"}
              </p>
              <p className="text-2xl font-bold text-slate-900">{user?.donationCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-3">
          {language === "ar" ? "معلومات الاتصال" : "Contact Information"}
        </h4>
        <div className="space-y-2 text-slate-600">
          <p><strong>{language === "ar" ? "البريد الإلكتروني:" : "Email:"}</strong> {user?.email}</p>
          <p><strong>{language === "ar" ? "الهاتف:" : "Phone:"}</strong> {user?.phone}</p>
        </div>
      </div>

      {/* Scheduled Appointments */}
      {userAppointments.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {language === "ar" ? "مواعيد التبرع المجدولة" : "Scheduled Appointments"}
          </h4>
          <div className="space-y-2">
            {userAppointments.map(apt => (
              <div key={apt.id} className="bg-white p-3 rounded border border-blue-200 text-sm">
                <div className="font-semibold text-slate-900">{apt.date} at {apt.time}</div>
                <div className="text-slate-600">{apt.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userAppointments.length === 0 && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
          <p className="text-slate-600">
            {language === "ar" 
              ? "لا توجد مواعيد محجوزة حالياً" 
              : "No appointments scheduled yet"}
          </p>
        </div>
      )}
    </div>
  );
};
