import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { CheckCircle, XCircle, Clock, Edit2, Trash2, X } from "lucide-react";
import { ConfigurableTable } from "./ConfigurableTable.jsx";

export const AdminAccountsTab = () => {
  const { t, language } = useLanguage();
  const { accessToken, user } = useAuth();
  const { getCachedData, invalidateCache } = useDataCache();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (!accessToken) return;
    fetchAccounts();
  }, [accessToken]);

  const fetchAccounts = async () => {
    try {
      // Check cache first
      const cachedAccounts = getCachedData(user?.role, 'accounts');
      if (cachedAccounts) {
        setAccounts(Array.isArray(cachedAccounts) ? cachedAccounts : []);
        setLoading(false);
        return;
      }

      // Fallback to fetch if cache empty
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      const response = await fetch(`${API_BASE_URL}/auth/admin/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (uid) => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/auth/admin/verify/${uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verifiedByAdmin: true }),
      });
      if (!response.ok) throw new Error("Failed to verify account");
      invalidateCache(user?.role, 'accounts');
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account.uid);
    setEditForm({
      email: account.email,
      phone: account.phone,
      role: account.role,
      fname: account.fname || "",
      lname: account.lname || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/auth/admin/users/${editingAccount}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) throw new Error("Failed to update account");
      setEditingAccount(null);
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (uid) => {
    if (!confirm(t("confirmDeleteAccount"))) return;
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/auth/admin/delete/${uid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminEmail: user?.email }),
      });
      if (!response.ok) throw new Error("Failed to delete account");
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      donor: t("role_donor"),
      hospital: t("role_hospital"),
      super_admin: t("role_super_admin"),
    };
    return roleMap[role] || role;
  };

  const getStatusDisplay = (account) => {
    if (account.verifiedByAdmin) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-600 text-xs font-semibold">
            {t("verified")}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-yellow-600 text-xs font-semibold">
            {t("pending")}
          </span>
        </div>
      );
    }
  };

  const columns = [
    { key: "email", label: t("email"), visible: true },
    { key: "phone", label: t("phone"), visible: true },
    {
      key: "fname",
      label: t("fname"),
      visible: true,
      render: (fname, row) => `${fname || ""} ${row.lname || ""}`.trim(),
    },
    {
      key: "role",
      label: t("role"),
      visible: true,
      render: (role) => getRoleDisplay(role),
    },
    {
      key: "verifiedByAdmin",
      label: t("status"),
      visible: true,
      render: (_, row) => getStatusDisplay(row),
    },
  ];

  const searchableFields = ["email", "phone", "fname", "lname"];
  const filterOptions = {
    role: ["donor", "hospital", "super_admin"],
  };

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
      onClick: (account) => handleDelete(account.uid),
      className: "text-red-600 hover:text-red-800 p-1",
    },
  ];

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      <ConfigurableTable
        columns={columns}
        data={accounts}
        title={t("accountsTab")}
        actions={actions}
        searchableFields={searchableFields}
        filterOptions={filterOptions}
      />

      {/* Edit Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {t("editAccount")}
              </h3>
              <button
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  readOnly
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {t("fname")}
                  </label>
                  <input
                    type="text"
                    value={editForm.fname}
                    onChange={(e) => setEditForm({ ...editForm, fname: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {t("lname")}
                  </label>
                  <input
                    type="text"
                    value={editForm.lname}
                    onChange={(e) => setEditForm({ ...editForm, lname: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("phone")}
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
                >
                  {t("save")}
                </button>
                <button
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded font-semibold hover:bg-slate-300"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
