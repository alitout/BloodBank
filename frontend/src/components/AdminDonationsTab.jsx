import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { useAuth, AuthProvider } from './AuthContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { useDataCache } from './DataCacheContext';
import { BarChart3, Loader } from 'lucide-react';
import { API_BASE_URL, getAccessToken } from '../utils/api.js';
import AdminDonationApprovals from './AdminDonationApprovals.jsx';

export default function AdminDonationsTab() {
  const { accessToken, user } = useAuth();
  const { language } = useLanguage();
  const { getCachedData } = useDataCache();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, donor, patient, hospital

  useEffect(() => {
    if (!accessToken) return;

    // Try to use cached data first
    const cachedData = getCachedData(user?.role, 'donations');

    if (cachedData && Array.isArray(cachedData)) {
      setDonations(cachedData);
      setLoading(false);
    } else {
      // If no cached data, fetch it
      fetchAllDonations();
    }
  }, [user?.role, getCachedData, accessToken]);

  const fetchAllDonations = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      const response = await fetch(`${API_BASE_URL}/requesters/all-donations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch donations');
      }

      const data = await response.json();
      setDonations(data);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching donations');
      console.error('Error fetching donations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonations = donations.filter(donation => {
    const searchLower = search.toLowerCase();

    if (filterBy === 'donor') {
      return donation.donorName.toLowerCase().includes(searchLower);
    } else if (filterBy === 'patient') {
      return donation.patientName.toLowerCase().includes(searchLower);
    } else if (filterBy === 'hospital') {
      return donation.hospital.toLowerCase().includes(searchLower);
    } else {
      return (
        donation.donorName.toLowerCase().includes(searchLower) ||
        donation.patientName.toLowerCase().includes(searchLower) ||
        donation.hospital.toLowerCase().includes(searchLower)
      );
    }
  });

  const totalUnits = filteredDonations.reduce((sum, d) => sum + d.unitsCompleted, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <AdminDonationApprovals /> */}
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-slate-900">
            {language === 'ar' ? 'سجل التبرعات' : 'Donations Record'}
          </h2>
        </div>
        <p className="text-slate-600 text-sm">
          {language === 'ar'
            ? `إجمالي الوحدات المتبرع بها: ${totalUnits} وحدة من ${filteredDonations.length} تبرع`
            : `Total Units Donated: ${totalUnits} units from ${filteredDonations.length} donations`
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {language === 'ar' ? 'بحث' : 'Search'}
          </label>
          <input
            type="text"
            placeholder={
              language === 'ar'
                ? 'ابحث عن اسم المتبرع أو المريض أو المستشفى...'
                : 'Search donor, patient, or hospital...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {language === 'ar' ? 'تصفية' : 'Filter By'}
          </label>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="donor">{language === 'ar' ? 'المتبرع' : 'Donor'}</option>
            <option value="patient">{language === 'ar' ? 'المريض' : 'Patient'}</option>
            <option value="hospital">{language === 'ar' ? 'المستشفى' : 'Hospital'}</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      {filteredDonations.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'المتبرع' : 'Donor'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'فصيلة المتبرع' : 'Donor Type'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'المريض' : 'Patient'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'فصيلة مطلوبة' : 'Blood Type'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'النوع' : 'Genre'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'الوحدات' : 'Units'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'المستشفى' : 'Hospital'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'تاريخ الإكمال' : 'Completion Date'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDonations.map((donation, index) => (
                <tr key={donation.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {donation.donorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      {donation.donorBloodType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {donation.patientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {donation.patientBloodType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {donation.bloodGenre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {donation.unitsCompleted} / {donation.unitsRequested}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {donation.hospital}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(donation.completionDate).toLocaleDateString(
                      language === 'ar' ? 'ar-SA' : 'en-US'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${donation.requestStatus === 'fulfilled'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {language === 'ar'
                        ? donation.requestStatus === 'fulfilled'
                          ? 'مكتمل'
                          : 'قيد التنفيذ'
                        : donation.requestStatus === 'fulfilled'
                          ? 'Fulfilled'
                          : 'In Progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg p-12 text-center border border-slate-200">
          <p className="text-slate-600 text-lg">
            {language === 'ar' ? 'لا توجد تبرعات للعرض' : 'No donations to display'}
          </p>
        </div>
      )}
    </div>
  );
}
