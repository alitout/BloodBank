import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL } from "../utils/api.js";
import { getAccessToken } from "../utils/api.js";
import { Trash2, Edit2, Plus, X } from "lucide-react";
import { ConfigurableTable } from "./ConfigurableTable.jsx";

export const AdminHospitalsTab = () => {
  const { t, language } = useLanguage();
  const { user, accessToken } = useAuth();
  const { getCachedData, invalidateCache } = useDataCache();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    location: "",
    phoneNumber: "",
    address: "",
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      // Check cache first
      const cachedHospitals = getCachedData(user?.role, 'hospitals');
      if (cachedHospitals) {
        setHospitals(Array.isArray(cachedHospitals) ? cachedHospitals : []);
        setLoading(false);
        return;
      }

      // Fallback to fetch if cache empty
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }
      const response = await fetch(`${API_BASE_URL}/hospitals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch hospitals");
      const data = await response.json();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching hospitals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      id: `HOS-${Date.now()}`,
      name: "",
      location: "",
      phoneNumber: "",
      address: "",
    });
    setShowModal(true);
  };

  const handleEdit = (hospital) => {
    setEditingId(
      hospital._id || hospital.id
    );

    setFormData({
      ...hospital,
      phoneNumber:
        hospital.phoneNumber ||
        hospital.contact ||
        '',
    });

    setShowModal(true);
  };

  const handleDelete = async (hospital) => {
    if (!confirm(t("confirmDeleteHospital"))) return;
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const id = hospital._id || hospital.id;
      const response = await fetch(`${API_BASE_URL}/hospitals/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete hospital");
      setHospitals(hospitals.filter(h => (h._id || h.id) !== id));
      invalidateCache(user?.role, 'hospitals');
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `${API_BASE_URL}/hospitals/${editingId}`
        : `${API_BASE_URL}/hospitals`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save hospital");
      setShowModal(false);
      setError("");
      fetchHospitals();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    { key: "name", label: t("name"), visible: true },
    { key: "location", label: t("location"), visible: true },
    { key: "phoneNumber", label: t("phoneNumber"), visible: true },
    { key: "address", label: t("address"), visible: true },
  ];

  const searchableFields = ["name", "location", "phoneNumber", "address"];

  const actions = [
    {
      label: t("edit"),
      icon: Edit2,
      onClick: handleEdit,
      className: "text-blue-600 hover:text-blue-800 p-1",
    },
    {
      label: t("delete"),
      icon: Trash2,
      onClick: handleDelete,
      className: "text-red-600 hover:text-red-800 p-1",
    },
  ];

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <>
      <div className="mb-4">
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("add")}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      <ConfigurableTable
        columns={columns}
        data={hospitals}
        title={t("hospitals")}
        actions={actions}
        searchableFields={searchableFields}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold">
                {editingId ? t("editHospital") : t("addHospital")}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder={t("hospitalName")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder={t("location")}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder={t("phoneNumber")}
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder={t("address")}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {t("save")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded hover:bg-slate-300"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
