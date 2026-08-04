import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDB } from "./DBContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Trash2, Edit2, UserPlus, X, Users } from "lucide-react";
import { ConfigurableTable } from "./ConfigurableTable.jsx";

export const AdminRequestsTab = () => {
  const { t, language } = useLanguage();
  const { user, accessToken } = useAuth();
  const { requesters, updateRequesterStatus } = useDB();
  const { getCachedData, invalidateCache } = useDataCache();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [matchingRequestId, setMatchingRequestId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Fetch donors list - check cache first
  useEffect(() => {
    if (!accessToken) return;
    fetchDonors();
  }, [accessToken]);

  const fetchDonors = async () => {
    try {
      // Check cache first
      const cachedAccounts = getCachedData(user?.role, 'accounts');
      if (cachedAccounts) {
        const donorsList = cachedAccounts.filter((acc) => acc.role === "donor");
        setDonors(donorsList);
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
      if (response.ok) {
        const data = await response.json();
        const donorsList = data.filter((acc) => acc.role === "donor");
        setDonors(donorsList);
      }
    } catch (err) {
      console.error("Error fetching donors:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async () => {
    if (!selectedDonor || !selectedRequest) return;

    setIsAssigning(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/requesters/${selectedRequest._id}/assign`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ donorId: selectedDonor }),
      });

      if (!response.ok) throw new Error("Failed to assign request");

      // Refresh the data
      setShowAssignModal(false);
      setSelectedRequest(null);
      setSelectedDonor("");
      alert(t("requestAssignedSuccessfully"));

      // Refresh requesters list
      window.location.reload();
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Error assigning request:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMatchDonors = async (requestId) => {
    setMatchingRequestId(requestId);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/requesters/${requestId}/match-donors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to match donors");
      }

      const data = await response.json();
      alert(t("requestMatched", { count: data.newNotificationsSent }));
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Error matching donors:", err);
    } finally {
      setMatchingRequestId(null);
    }
  };

  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setEditFormData({
      fname: request.fname,
      lname: request.lname,
      fatherName: request.fatherName,
      bloodType: request.bloodType,
      bloodGenre: request.bloodGenre,
      hospital: request.hospital,
      unitsNeeded: request.unitsNeeded,
      description: request.description,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/requesters/${selectedRequest._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) throw new Error("Failed to update request");

      alert(t("requestUpdatedSuccessfully"));
      setShowEditModal(false);
      window.location.reload();
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Error updating request:", err);
    }
  };

  const handleDeleteRequest = (request) => {
    if (confirm(t("confirmDeleteRequest"))) {
      deleteRequest(request._id);
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/requesters/${requestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete request");

      alert(t("requestDeletedSuccessfully"));
      window.location.reload();
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Error deleting request:", err);
    }
  };

  const columns = [
    { key: "fname", label: t("firstName"), visible: true },
    { key: "lname", label: t("lastName"), visible: true },
    { key: "fatherName", label: t("fatherName"), visible: true },
    { key: "bloodType", label: t("bloodType"), visible: true },
    { key: "bloodGenre", label: t("bloodGenre"), visible: true },
    { key: "hospital", label: t("hospitalName"), visible: true },
    { key: "unitsNeeded", label: t("unitsNeeded"), visible: true },
    {
      key: "assignedDonors",
      label: t("assignedTo"),
      visible: true,
      filterValue: (_, row) => {
        // For filtering - return array of individual donor names
        if (row.assignedDonors && row.assignedDonors.length > 0) {
          return row.assignedDonors.map((donor) => {
            const donorInfo = donors.find((d) => d.uid === donor.donorUid);
            return donorInfo ? `${donorInfo.fname} ${donorInfo.lname}` : donor.donorUid;
          });
        }
        if (row.assignedTo) {
          const donor = donors.find((d) => d.uid === row.assignedTo);
          return donor ? [`${donor.fname} ${donor.lname}`] : [t("unknown")];
        }
        return [t("notAssigned")];
      },
      render: (assignedDonors, row) => {
        // Handle new assignedDonors array structure
        if (assignedDonors && assignedDonors.length > 0) {
          const donorNames = assignedDonors.map((donor) => {
            const donorInfo = donors.find((d) => d.uid === donor.donorUid);
            return donorInfo ? `${donorInfo.fname} ${donorInfo.lname}` : donor.donorUid;
          });
          return (
            <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {donorNames.map((name, idx) => (
                <span key={idx}>
                  {name}
                  {idx < donorNames.length - 1 && <span className="text-blue-600 font-semibold"> / </span>}
                </span>
              ))}
            </span>
          );
        }
        // Fallback to old assignedTo field for backward compatibility
        if (row.assignedTo) {
          const donor = donors.find((d) => d.uid === row.assignedTo);
          return donor ? `${donor.fname} ${donor.lname}` : t("unknown");
        }
        return <span className="text-red-600 font-semibold">{t("notAssigned")}</span>;
      },
    },
    {
      key: "status",
      label: t("status"),
      visible: true,
      render: (status, row) => (
        <select
          value={status || "pending"}
          onChange={(e) => updateRequesterStatus(row._id || row.id, e.target.value)}
          className={`px-3 py-1 border rounded text-sm font-medium ${status === "pending"
              ? "bg-yellow-50 border-yellow-300 text-yellow-700"
              : status === "fulfilled"
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-red-50 border-red-300 text-red-700"
            }`}
        >
          <option value="pending">{t("pending")}</option>
          <option value="fulfilled">{t("fulfilled")}</option>
          <option value="cancelled">{t("cancelled")}</option>
        </select>
      ),
    },
    { key: "date", label: t("date"), visible: false },
    { key: "description", label: t("description"), visible: false },
  ];

  const searchableFields = ["fname", "lname", "bloodType", "hospital"];

  const actions = [
    {
      label: (request) =>
        matchingRequestId === request._id
          ? t("matchingInProgress")
          : t("matchDonors"),
      icon: Users,
      onClick: (request) => {
        if (matchingRequestId !== request._id) {
          handleMatchDonors(request._id);
        }
      },
      className: (request) =>
        matchingRequestId === request._id
          ? "bg-green-100 text-green-700 opacity-50"
          : "bg-green-100 text-green-700 hover:bg-green-200",
    },
    {
      label: t("edit"),
      icon: Edit2,
      onClick: (request) => handleEditRequest(request),
      className: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    },
    {
      label: t("delete"),
      icon: Trash2,
      onClick: (request) => handleDeleteRequest(request),
      className: "bg-red-100 text-red-700 hover:bg-red-200",
    },
  ];

  return (
    <>
      <ConfigurableTable
        columns={columns}
        data={requesters}
        title={t("allRequests")}
        actions={actions}
        searchableFields={searchableFields}
      />
      
      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-900">
                {t("assignRequestToDonor")}
              </h3>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-600 mb-1">
                {t("request")}:
              </p>
              <p className="font-semibold text-slate-900">
                {selectedRequest?.fname} {selectedRequest?.lname} - {selectedRequest?.bloodType}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t("selectDonor")}
              </label>
              <select
                value={selectedDonor}
                onChange={(e) => setSelectedDonor(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-purple-600"
              >
                <option value="">
                  {t("selectDonorPlaceholder")}
                </option>
                {donors.map((donor) => (
                  <option key={donor.uid} value={donor.uid}>
                    {donor.fname} {donor.lname} ({donor.bloodType}) - {donor.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignRequest}
                disabled={!selectedDonor || isAssigning}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
              >
                {isAssigning ? t("assigning") : t("assign")}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRequest(null);
                  setSelectedDonor("");
                }}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold hover:bg-slate-300"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <Edit2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">
                {t("editRequest")}
              </h3>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("firstName")}
                </label>
                <input
                  type="text"
                  value={editFormData.fname || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, fname: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("lastName")}
                </label>
                <input
                  type="text"
                  value={editFormData.lname || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, lname: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("fatherName")}
                </label>
                <input
                  type="text"
                  value={editFormData.fatherName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("bloodType")}
                </label>
                <select
                  value={editFormData.bloodType || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, bloodType: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                >
                  <option>O+</option>
                  <option>O-</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("hospitalName")}
                </label>
                <input
                  type="text"
                  value={editFormData.hospital || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("unitsNeeded")}
                </label>
                <input
                  type="number"
                  value={editFormData.unitsNeeded || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, unitsNeeded: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t("description")}
                </label>
                <textarea
                  value={editFormData.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows="2"
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                {t("save")}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRequest(null);
                  setEditFormData({});
                }}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold hover:bg-slate-300"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
