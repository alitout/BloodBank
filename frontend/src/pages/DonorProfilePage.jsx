import React, { useState } from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import { API_BASE_URL } from "../utils/api.js";
import { Heart, Droplet, CheckCircle, Edit2, Trash2, X } from "lucide-react";

export const DonorProfilePage = () => {
  const { t, language } = useLanguage();
  const { user, accessToken } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fname: user?.fname || "",
    lname: user?.lname || "",
    phone: user?.phone || "",
    bloodType: user?.bloodType || "O+",
    email: user?.email || "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "eligible":
        return "bg-green-100 text-green-800";
      case "cool-down":
        return "bg-yellow-100 text-yellow-800";
      case "deferred":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/update`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fname: editForm.fname,
          lname: editForm.lname,
          phone: editForm.phone,
          bloodType: editForm.bloodType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      setSuccess(
        language === "ar"
          ? "✓ تم إرسال طلب التعديل بنجاح. سيقوم المسؤول بالتحقق من التغييرات وتطبيقها."
          : "✓ Profile update request submitted successfully. Admin will verify and apply the changes."
      );
      setIsEditing(false);

      // Refresh profile data and mark as not verified
      // You may want to call a function to refresh user data from context

      setTimeout(() => {
        setSuccess("");
      }, 6000);
    } catch (err) {
      setError(err.message || "An error occurred while submitting your request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/delete-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: deleteReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to request account deletion");
      }

      setSuccess(
        language === "ar"
          ? "تم إرسال طلب الحذف. سيقوم المسؤول بمراجعته."
          : "Deletion request submitted. Admin will review it."
      );
      setShowDeleteModal(false);
      setDeleteReason("");

      setTimeout(() => {
        setSuccess("");
      }, 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="w-12 h-12 text-red-600" />
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {user?.fname} {user?.lname}
                </h1>
                <p className="text-slate-600">
                  {language === "ar" ? "ملف التبرع الشخصي" : "Your Donor Profile"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? (language === "ar" ? "إلغاء" : "Cancel") : (language === "ar" ? "تعديل" : "Edit")}
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Profile Information */}
        {!isEditing ? (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              {/* Status */}
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

              {/* Verification Status */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`w-8 h-8 ${user?.verifiedByAdmin ? "text-green-600" : "text-yellow-600"}`} />
                  <div>
                    <p className="text-sm text-slate-600">
                      {language === "ar" ? "التحقق" : "Verification"}
                    </p>
                    <div className={`text-sm font-bold py-1 px-2 rounded-full inline-block mt-1 ${user?.verifiedByAdmin ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {user?.verifiedByAdmin ? (language === "ar" ? "موثق" : "Verified") : (language === "ar" ? "قيد المراجعة" : "Pending")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Donations */}
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

            {/* Eligibility Info */}
            {user?.status === "cool-down" &&
              user?.nextEligibleDate &&
              new Date(
                user.nextEligibleDate
              ) > new Date() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-semibold mb-2">
                    {language === "ar" ? "فترة الراحة" : "Cool-down Period"}
                  </p>
                  <p className="text-yellow-700 text-sm mb-2">
                    {language === "ar"
                      ? "يجب أن تنتظر 56 يوماً من آخر تبرع قبل التبرع مرة أخرى"
                      : "You must wait 56 days from your last donation before donating again"
                    }
                  </p>
                  <p className="text-yellow-700 text-sm">
                    {language === "ar" ? "آخر تبرع: " : "Last donation: "}
                    <span className="font-semibold">
                      {new Date(user.lastDonationDate).toLocaleDateString(
                        language === "ar" ? "ar-SA" : "en-US"
                      )}
                    </span>
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    {language === "ar" ? "يمكنك التبرع مرة أخرى من: " : "You can donate again on: "}
                    <span className="font-semibold">
                      {new Date(user.nextEligibleDate).toLocaleDateString(
                        language === "ar" ? "ar-SA" : "en-US"
                      )}
                    </span>
                  </p>
                </div>
              )}

            {/* Contact & Profile Info */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {language === "ar" ? "معلومات الملف" : "Profile Information"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    {language === "ar" ? "الاسم الأول" : "First Name"}
                  </label>
                  <p className="text-slate-900">{user?.fname}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    {language === "ar" ? "الاسم الأخير" : "Last Name"}
                  </label>
                  <p className="text-slate-900">{user?.lname}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    {language === "ar" ? "البريد الإلكتروني" : "Email"}
                  </label>
                  <p className="text-slate-900">{user?.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    {language === "ar" ? "الهاتف" : "Phone"}
                  </label>
                  <p className="text-slate-900">{user?.phone}</p>
                </div>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <h3 className="text-xl font-bold text-red-900 mb-2">
                {language === "ar" ? "خطر: حذف الحساب" : "Danger: Delete Account"}
              </h3>
              <p className="text-red-700 mb-4">
                {language === "ar"
                  ? "طلب حذف حسابك. سيقوم المسؤول بمراجعة الطلب."
                  : "Request to delete your account. Admin will review the request."}
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                {language === "ar" ? "طلب حذف الحساب" : "Request Account Deletion"}
              </button>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "تعديل الملف الشخصي" : "Edit Profile"}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {language === "ar" ? "الاسم الأول" : "First Name"}
                  </label>
                  <input
                    type="text"
                    name="fname"
                    value={editForm.fname}
                    onChange={handleEditChange}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {language === "ar" ? "الاسم الأخير" : "Last Name"}
                  </label>
                  <input
                    type="text"
                    name="lname"
                    value={editForm.lname}
                    onChange={handleEditChange}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {language === "ar" ? "الهاتف" : "Phone"}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {language === "ar" ? "فصيلة الدم" : "Blood Type"}
                </label>
                <select
                  name="bloodType"
                  value={editForm.bloodType}
                  onChange={handleEditChange}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                >
                  {bloodTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ التغييرات" : "Save Changes")}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold hover:bg-slate-300"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-bold text-slate-900">
                {language === "ar" ? "حذف الحساب" : "Delete Account"}
              </h3>
            </div>

            <p className="text-slate-600 mb-4">
              {language === "ar"
                ? "هذا الإجراء سيرسل طلب حذف حسابك. سيقوم المسؤول بمراجعة الطلب والتحقق منه."
                : "This will submit a request to delete your account. Admin will review and verify the request."}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {language === "ar" ? "السبب (اختياري)" : "Reason (Optional)"}
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={language === "ar" ? "اكتب السبب..." : "Enter reason..."}
                className="w-full border border-slate-300 rounded px-3 py-2 h-20"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteProfile}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400"
              >
                {isLoading ? (language === "ar" ? "جاري..." : "Loading...") : (language === "ar" ? "تأكيد الحذف" : "Confirm Delete")}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason("");
                }}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold hover:bg-slate-300"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
