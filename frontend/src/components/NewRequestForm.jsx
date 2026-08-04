import React, { useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDB } from "./DBContext.jsx";
import { Send, AlertCircle } from "lucide-react";

export const NewRequestForm = ({ onSuccess }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { hospitals, addRequester } = useDB();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    fname: "",
    fatherName: "",
    lname: "",
    bloodGenre: "whole_blood",
    bloodType: "O+",
    hospital: "",
    unitsNeeded: 1,
    date: new Date().toISOString().split('T')[0],
    description: "",
    relationToPatient: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await addRequester(
        formData.fname,
        formData.fatherName,
        formData.lname,
        formData.bloodGenre,
        formData.bloodType,
        formData.hospital,
        parseInt(formData.unitsNeeded),
        formData.date,
        formData.description,
        formData.relationToPatient
      );
      
      setSuccess(t("successMsg"));
      setFormData({
        fname: "",
        fatherName: "",
        lname: "",
        bloodGenre: "whole_blood",
        bloodType: "O+",
        hospital: "",
        unitsNeeded: 1,
        date: new Date().toISOString().split('T')[0],
        description: "",
        relationToPatient: ""
      });
      
      if (onSuccess) setTimeout(onSuccess, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        {t("createNewRequest")}
      </h3>

      {!user?.verifiedByAdmin && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">
              {t("accountNotVerified")}
            </p>
            <p className="text-xs">
                  {t("accountNotVerifiedDescription")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" disabled={!user?.verifiedByAdmin}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("firstName")}
            </label>
            <input
              type="text"
              name="fname"
              placeholder={t("placeholderFirstName")}
              value={formData.fname}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("lastName")}
            </label>
            <input
              type="text"
              name="lname"
              placeholder={t("placeholderLastName")}
              value={formData.lname}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            {t("fatherName")}
          </label>
          <input
            type="text"
            name="fatherName"
            placeholder={t("placeholderFatherName")}
            value={formData.fatherName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("bloodType")}
            </label>
            <select
              name="bloodType"
              value={formData.bloodType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            >
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("bloodGenre")}
            </label>
            <select
              name="bloodGenre"
              value={formData.bloodGenre}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            >
              <option value="whole_blood">{t("wholeBlood")}</option>
              <option value="plasma">{t("plasma")}</option>
              <option value="platelets">{t("platelets")}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            {t("hospitalName")}
          </label>
          <select
            name="hospital"
            value={formData.hospital}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          >
            <option value="">{t("selectHospital")}</option>
            {hospitals.map(h => (
              <option key={h._id || h.id} value={h.name}>{h.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("unitsNeeded")}
            </label>
            <input
              type="number"
              name="unitsNeeded"
              value={formData.unitsNeeded}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("date")}
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            {t("relationToPatient")}
          </label>
          <input
            type="text"
            name="relationToPatient"
            value={formData.relationToPatient}
            onChange={handleChange}
            placeholder={t("placeholderRelationToPatient")}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            {t("description")}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={t("placeholderDescription")}
            rows="3"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !user?.verifiedByAdmin}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title={!user?.verifiedByAdmin ? t("accountNotVerified") : ""}
        >
          <Send className="w-4 h-4" />
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
};
