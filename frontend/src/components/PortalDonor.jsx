import React, { useEffect, useMemo } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDB } from "./DBContext.jsx";
import { AlertCircle, Heart, Droplet, Calendar, CheckCircle } from "lucide-react";

export const PortalDonor = ({
  user: suppliedUser,
}) => {
  const { t, language } = useLanguage();

  const { appointments = [] } = useDB();

  const { user: authenticatedUser, refreshUserProfile } = useAuth();

  const user = authenticatedUser || suppliedUser;

  const userAppointments = appointments.filter(apt => apt.donorId === user?.uid);

  const getStatusBadgeColor = (status) => {
    switch (status) {
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

  const cooldownInformation =
    React.useMemo(() => {
      if (
        user?.status !==
        "cool-down" ||
        !user?.nextEligibleDate
      ) {
        return {
          isInCoolDown: false,
          nextEligibleDate: null,
          formattedDate: null,
          remainingDays: 0,
        };
      }

      const nextEligibleDate =
        new Date(
          user.nextEligibleDate
        );

      if (
        Number.isNaN(
          nextEligibleDate.getTime()
        )
      ) {
        return {
          isInCoolDown: false,
          nextEligibleDate: null,
          formattedDate: null,
          remainingDays: 0,
        };
      }

      const difference =
        nextEligibleDate.getTime() -
        Date.now();

      if (difference <= 0) {
        return {
          isInCoolDown: false,
          formattedDate: null,
          remainingDays: 0,
        };
      }
      return {
        isInCoolDown: true,

        formattedDate:
          nextEligibleDate.toLocaleDateString(
            language === "ar"
              ? "ar-LB"
              : "en-GB",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          ),

        remainingDays: Math.max(
          1,
          Math.ceil(
            difference /
            (24 *
              60 *
              60 *
              1000)
          )
        ),
      };
    }, [
      user?.status,
      user?.nextEligibleDate,
      language,
    ]);


  const {
    isInCoolDown,
    formattedDate: formattedNextEligibleDate,
    remainingDays,
  } = cooldownInformation;

  useEffect(() => {
    if (
      typeof refreshUserProfile !==
      "function"
    ) {
      return undefined;
    }

    refreshUserProfile();

    const intervalId =
      window.setInterval(() => {
        refreshUserProfile();
      }, 15000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [refreshUserProfile]);

  return (
    <div className="space-y-6">
      {isInCoolDown && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-orange-600" />

            <div>
              <h3 className="font-bold text-orange-900">
                {language === "ar"
                  ? "فترة انتظار التبرع نشطة"
                  : "Donation Waiting Period Active"}
              </h3>

              <p className="mt-1 text-sm text-orange-800">
                {language === "ar"
                  ? "تم اعتماد تبرعك بنجاح. لا يمكنك التسجيل في طلب تبرع جديد خلال فترة الانتظار."
                  : "Your donation was approved successfully. You cannot join another donation request during the waiting period."}
              </p>

              {formattedNextEligibleDate && (
                <p className="mt-2 text-sm font-semibold text-orange-900">
                  {language === "ar"
                    ? `يمكنك التبرع مجدداً ابتداءً من: ${formattedNextEligibleDate}`
                    : `You can donate again starting: ${formattedNextEligibleDate}`}
                </p>
              )}

              {remainingDays !== null && (
                <p className="mt-1 text-xs text-orange-700">
                  {language === "ar"
                    ? `المدة المتبقية: ${remainingDays} يوم`
                    : `${remainingDays} day${remainingDays === 1
                      ? ""
                      : "s"
                    } remaining`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
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
