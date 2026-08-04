import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { Clock, CheckCircle, Trash2 } from "lucide-react";
import { authAPI } from "../utils/api.js";

export const PendingVerification = ({ user }) => {
  const { t, language } = useLanguage();
  const { user: authUser } = useAuth();
  const { getCachedData, invalidateCache } = useDataCache();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      // Check cache first
      const cachedPending = getCachedData(authUser?.role, 'pendingUsers');
      if (cachedPending) {
        setPendingUsers(Array.isArray(cachedPending) ? cachedPending : []);
        setLoading(false);
        return;
      }

      // Fallback to fetch if cache empty
      setLoading(true);
      const result = await authAPI.getPendingUsers();
      if (result.success) {
        setPendingUsers(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching pending users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (uid) => {
    try {
      const result = await authAPI.verifyUser(uid);
      if (result.success) {
        setMessageType("success");
        setMessage(t("verificationSuccess"));
        setPendingUsers(pendingUsers.filter(u => u.uid !== uid));
        invalidateCache(authUser?.role, 'pendingUsers');
        setTimeout(() => {
          setMessage("");
          setMessageType("");
        }, 3000);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(t("verificationError"));
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <Clock className="w-12 h-12 text-amber-200" />
          <div>
            <h3 className="text-xl font-bold">
              {t("pendingTab")}
            </h3>
            <p className="text-sm text-amber-100">
              {t("accountsPendingVerification")}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg font-semibold ${
          messageType === "success"
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">{t("loading")}</div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <p className="text-blue-900 font-semibold">
            {t("noPendingAccounts")}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 ">
                <tr>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("name")}</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("email")}</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("type")}</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("registrationDate")}</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingUsers.map(pUser => (
                  <tr key={pUser.uid} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-center">
                      <p className="font-semibold text-slate-900">
                        {pUser.role === "donor"
                          ? `${pUser.fname} ${pUser.lname}`
                          : pUser.role === "hospital"
                          ? pUser.hospitalName
                          : `${pUser.superAdminFName} ${pUser.superAdminLName}`}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">{pUser.email}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        pUser.role === "donor" ? "bg-blue-100 text-blue-800" :
                        pUser.role === "hospital" ? "bg-red-100 text-red-800" :
                        "bg-purple-100 text-purple-800"
                      }`}>
                        {t(`role_${pUser.role}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {new Date(pUser.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <button
                        onClick={() => handleVerify(pUser.uid)}
                        className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition text-xs"
                      >
                        {t("verify")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
