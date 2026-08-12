import React, { useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useDB } from "./DBContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { Plus, Users, Building2, Shield, Stethoscope } from "lucide-react";
import { authAPI } from "../utils/api.js";

const EMPTY_DONOR_FORM = {
  email: "",
  fname: "",
  lname: "",
  phone: "",
  password: "",
  bloodType: "O+",
  dateOfBirth: "",
  biologicalSex: "",
};

export const AdminManagement = ({ user }) => {
  const { t, language } = useLanguage();
  const { user: authUser } = useAuth();
  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error

  // Form states
  const [donorForm, setDonorForm,] = useState(EMPTY_DONOR_FORM);
  const [superAdminForm, setSuperAdminForm] = useState({ email: "", phone: "", password: "", superAdminFName: "", superAdminLName: "" });
  const [hospitalForm, setHospitalForm] = useState({ email: "", phone: "", password: "", hospitalName: "", hospitalContactName: "", hospitalContactTitle: "", hospitalAddress: "" });

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const resetMessage = () => {
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4000);
  };

  // Create Donor
  const handleCreateDonor = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result =
        await authAPI.createDonorByAdmin({
          email: donorForm.email,
          fname: donorForm.fname,
          lname: donorForm.lname,
          phone: donorForm.phone,
          password: donorForm.password,
          bloodType: donorForm.bloodType,
          dateOfBirth: donorForm.dateOfBirth,
          biologicalSex: donorForm.biologicalSex,
        });
      if (result.success) {
        setMessageType("success");
        setMessage(t("donorCreatedSuccessfully"));
        setDonorForm(EMPTY_DONOR_FORM);
        resetMessage();
      } else {
        setMessageType("error");
        setMessage(result.error);
        resetMessage();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
      resetMessage();
    } finally {
      setLoading(false);
    }
  };


  // Create Super Admin
  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await authAPI.createSuperAdminByAdmin(
        superAdminForm.email,
        superAdminForm.phone,
        superAdminForm.password,
        superAdminForm.superAdminFName,
        superAdminForm.superAdminLName
      );
      if (result.success) {
        setMessageType("success");
        setMessage(t("superAdminCreatedSuccessfully"));
        setSuperAdminForm({ email: "", phone: "", password: "", superAdminFName: "", superAdminLName: "" });
        resetMessage();
      } else {
        setMessageType("error");
        setMessage(result.error);
        resetMessage();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
      resetMessage();
    } finally {
      setLoading(false);
    }
  };

  // Create Hospital
  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await authAPI.createHospitalByAdmin(
        hospitalForm.email,
        hospitalForm.phone,
        hospitalForm.password,
        hospitalForm.hospitalName,
        hospitalForm.hospitalContactName,
        hospitalForm.hospitalContactTitle,
        hospitalForm.hospitalAddress
      );
      if (result.success) {
        setMessageType("success");
        setMessage(t("hospitalCreatedSuccessfully"));
        setHospitalForm({ email: "", phone: "", password: "", hospitalName: "", hospitalContactName: "", hospitalContactTitle: "", hospitalAddress: "" });
        resetMessage();
      } else {
        setMessageType("error");
        setMessage(result.error);
        resetMessage();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
      resetMessage();
    } finally {
      setLoading(false);
    }
  };

  // Form buttons
  const formButtons = [
    { id: "donor", label: t("addDonor"), icon: Users, color: "blue" },
    { id: "super", label: t("addSuperAdmin"), icon: Shield, color: "purple" },
    { id: "hospital", label: t("addHospital"), icon: Stethoscope, color: "red" }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <Shield className="w-12 h-12 text-purple-200" />
          <div>
            <h3 className="text-xl font-bold">
              {t("systemManagement")}
            </h3>
            <p className="text-sm text-purple-100">
              {t("addAndManageUsers")}
            </p>
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {formButtons.map(btn => {
          const Icon = btn.icon;
          const colorClasses = {
            blue: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
            // green: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
            purple: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
            red: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          };
          return (
            <button
              key={btn.id}
              onClick={() => setActiveForm(activeForm === btn.id ? null : btn.id)}
              className={`p-4 border-2 rounded-lg flex items-center gap-3 transition ${colorClasses[btn.color]}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-semibold text-sm">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message feedback */}
      {message && (
        <div className={`p-4 rounded-lg font-semibold ${messageType === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-800"
          }`}>
          {message}
        </div>
      )}

      {/* Forms */}
      {activeForm === "donor" && (
        <form onSubmit={handleCreateDonor} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h4 className="font-bold text-lg text-slate-900 mb-4">{t("addNewDonor")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder={t("fname")} value={donorForm.fname} onChange={e => setDonorForm({ ...donorForm, fname: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
            <input type="text" placeholder={t("lname")} value={donorForm.lname} onChange={e => setDonorForm({ ...donorForm, lname: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
            <input type="email" placeholder={t("email")} value={donorForm.email} onChange={e => setDonorForm({ ...donorForm, email: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
            <input type="tel" placeholder={t("phone")} value={donorForm.phone} onChange={e => setDonorForm({ ...donorForm, phone: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
            <input type="date" lang="en-GB" value={donorForm.dateOfBirth} onChange={(event) => setDonorForm({ ...donorForm, dateOfBirth: event.target.value, })} className="w-full border border-slate-300 rounded px-3 py-2" required />
            <select value={donorForm.biologicalSex} onChange={(event) => setDonorForm({ ...donorForm, biologicalSex: event.target.value, })} className="w-full border border-slate-300 rounded px-3 py-2" required>
              <option value="">
                {t("selectOption")}
              </option>
              <option value="male">
                {t("male")}
              </option>
              <option value="female">
                {t("female")}
              </option>
            </select>
            <input type="password" placeholder={t("password")} value={donorForm.password} onChange={e => setDonorForm({ ...donorForm, password: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
            <select value={donorForm.bloodType} onChange={e => setDonorForm({ ...donorForm, bloodType: e.target.value })} className="border border-slate-300 rounded px-3 py-2">
              {bloodTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-slate-400">{loading ? "..." : t("create")}</button>
            <button type="button" onClick={() => { setActiveForm(null); setDonorForm(EMPTY_DONOR_FORM); }} className="bg-slate-300 text-slate-700 px-6 py-2 rounded font-semibold hover:bg-slate-400">{t("cancel")}</button>
          </div>
        </form >
      )
      }

      {
        activeForm === "super" && (
          <form onSubmit={handleCreateSuperAdmin} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h4 className="font-bold text-lg text-slate-900 mb-4">{t("addNewSuperAdmin")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder={t("firstName")} value={superAdminForm.superAdminFName} onChange={e => setSuperAdminForm({ ...superAdminForm, superAdminFName: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="text" placeholder={t("lastName")} value={superAdminForm.superAdminLName} onChange={e => setSuperAdminForm({ ...superAdminForm, superAdminLName: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="email" placeholder={t("email")} value={superAdminForm.email} onChange={e => setSuperAdminForm({ ...superAdminForm, email: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="tel" placeholder={t("phone")} value={superAdminForm.phone} onChange={e => setSuperAdminForm({ ...superAdminForm, phone: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="password" placeholder={t("password")} value={superAdminForm.password} onChange={e => setSuperAdminForm({ ...superAdminForm, password: e.target.value })} className="border border-slate-300 rounded px-3 py-2 md:col-span-2" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="bg-purple-600 text-white px-6 py-2 rounded font-semibold hover:bg-purple-700 disabled:bg-slate-400">{loading ? "..." : t("create")}</button>
              <button type="button" onClick={() => { setActiveForm(null); setSuperAdminForm({ email: "", phone: "", password: "", superAdminFName: "", superAdminLName: "" }); }} className="bg-slate-300 text-slate-700 px-6 py-2 rounded font-semibold hover:bg-slate-400">{t("cancel")}</button>
            </div>
          </form>
        )
      }

      {
        activeForm === "hospital" && (
          <form onSubmit={handleCreateHospital} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h4 className="font-bold text-lg text-slate-900 mb-4">{t("addNewHospital")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder={t("hospitalName")} value={hospitalForm.hospitalName} onChange={e => setHospitalForm({ ...hospitalForm, hospitalName: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="text" placeholder={t("contactName")} value={hospitalForm.hospitalContactName} onChange={e => setHospitalForm({ ...hospitalForm, hospitalContactName: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="text" placeholder={t("contactTitle")} value={hospitalForm.hospitalContactTitle} onChange={e => setHospitalForm({ ...hospitalForm, hospitalContactTitle: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="text" placeholder={t("address")} value={hospitalForm.hospitalAddress} onChange={e => setHospitalForm({ ...hospitalForm, hospitalAddress: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="email" placeholder={t("email")} value={hospitalForm.email} onChange={e => setHospitalForm({ ...hospitalForm, email: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="tel" placeholder={t("phone")} value={hospitalForm.phone} onChange={e => setHospitalForm({ ...hospitalForm, phone: e.target.value })} className="border border-slate-300 rounded px-3 py-2" required />
              <input type="password" placeholder={t("password")} value={hospitalForm.password} onChange={e => setHospitalForm({ ...hospitalForm, password: e.target.value })} className="border border-slate-300 rounded px-3 py-2 md:col-span-2" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="bg-red-600 text-white px-6 py-2 rounded font-semibold hover:bg-red-700 disabled:bg-slate-400">{loading ? "..." : t("create")}</button>
              <button type="button" onClick={() => { setActiveForm(null); setHospitalForm({ email: "", phone: "", password: "", hospitalName: "", hospitalContactName: "", hospitalContactTitle: "", hospitalAddress: "" }); }} className="bg-slate-300 text-slate-700 px-6 py-2 rounded font-semibold hover:bg-slate-400">{t("cancel")}</button>
            </div>
          </form>
        )
      }
    </div >
  );
};
