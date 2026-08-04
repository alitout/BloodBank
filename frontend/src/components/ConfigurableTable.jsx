import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, Eye, EyeOff, X, Filter } from "lucide-react";
import { useLanguage } from "./LanguageContext.jsx";

export const ConfigurableTable = ({
  columns,
  data,
  title,
  actions,
  searchableFields = [],
  filterOptions = {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.visible !== false }), {})
  );
  const { t, language } = useLanguage();
  const [activeFilters, setActiveFilters] = useState({});
  const [filterSearchTerms, setFilterSearchTerms] = useState({}); // Search within each filter dropdown
  const [tempFilters, setTempFilters] = useState({}); // Temporary filters while modal is open
  const [tempFilterSearchTerms, setTempFilterSearchTerms] = useState({}); // Temporary search terms
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showColumnFilterIcons, setShowColumnFilterIcons] = useState(false);
  const [openColumnFilterKey, setOpenColumnFilterKey] = useState(null);

  // Refs for click-outside detection
  const columnMenuRef = useRef(null);
  const columnFilterRefs = useRef({});

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
      // Close column filter dropdowns when clicking outside
      if (openColumnFilterKey) {
        const filterRef = columnFilterRefs.current[openColumnFilterKey];
        if (filterRef && !filterRef.contains(event.target)) {
          setOpenColumnFilterKey(null);
        }
      }
    };

    if (showColumnMenu || openColumnFilterKey) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColumnMenu, openColumnFilterKey]);

  // Generate filter options dynamically from data for all columns
  const dynamicFilterOptions = useMemo(() => {
    const options = {};
    columns.forEach((col) => {
      // Get unique values from this column
      let allValues = data.map((row) => col.filterValue ? col.filterValue(row[col.key], row) : row[col.key]).filter(Boolean);
      // Flatten arrays so individual values appear as separate options
      allValues = allValues.flat();
      const uniqueValues = [...new Set(allValues)].map(v => v.toString());
      
      if (uniqueValues.length > 0 && uniqueValues.length <= 50) {
        // For assignedTo column, keep "not assigned" at the top
        if (col.key === "assignedDonors" || col.key === "assignedTo") {
          const notAssignedStr = t("notAssigned");
          const sorted = uniqueValues
            .filter(v => v !== notAssignedStr)
            .sort();
          if (uniqueValues.includes(notAssignedStr)) {
            options[col.key] = [notAssignedStr, ...sorted];
          } else {
            options[col.key] = sorted;
          }
        } else {
          options[col.key] = uniqueValues.sort();
        }
      }
    });
    return options;
  }, [data, columns, t]);

  // Merge provided filterOptions with dynamic ones
  const finalFilterOptions = useMemo(() => {
    return Object.keys(filterOptions).length > 0 ? filterOptions : dynamicFilterOptions;
  }, [filterOptions, dynamicFilterOptions]);

  // Filter the filter options based on search terms in each filter dropdown
  const filteredFilterOptions = useMemo(() => {
    const filtered = {};
    Object.entries(finalFilterOptions).forEach(([filterKey, options]) => {
      const searchTerm = filterSearchTerms[filterKey]?.toLowerCase() || "";
      if (searchTerm) {
        filtered[filterKey] = options.filter((option) =>
          option.toLowerCase().includes(searchTerm)
        );
      } else {
        filtered[filterKey] = options;
      }
    });
    return filtered;
  }, [finalFilterOptions, filterSearchTerms]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Apply search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchableFields.some((field) => {
          const value = row[field];
          return value && value.toString().toLowerCase().includes(searchLower);
        });
        if (!matchesSearch) return false;
      }

      // Apply filters
      for (const [filterKey, activeFilterValues] of Object.entries(activeFilters)) {
        if (activeFilterValues && activeFilterValues.length > 0) {
          // Find the column definition to check if it has a filterValue function
          const col = columns.find((c) => c.key === filterKey);
          let rowFilterValues = [];
          
          if (col && col.filterValue) {
            // Use the column's filterValue function to get comparable values
            rowFilterValues = col.filterValue(row[filterKey], row);
            // Ensure it's always an array
            if (!Array.isArray(rowFilterValues)) {
              rowFilterValues = [rowFilterValues];
            }
          } else {
            // Fallback to raw value
            const val = row[filterKey];
            rowFilterValues = Array.isArray(val) ? val : [val];
          }
          
          // Check if ANY of the row's values match ANY of the active filters (OR logic)
          const hasMatch = activeFilterValues.some((filterVal) =>
            rowFilterValues.some((rowVal) => rowVal?.toString() === filterVal)
          );
          
          if (!hasMatch) return false;
        }
      }

      return true;
    });
  }, [data, searchTerm, activeFilters, searchableFields, columns]);

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const handleFilterChange = (filterKey, value, isChecked) => {
    setActiveFilters((prev) => {
      const current = prev[filterKey] || [];
      if (isChecked) {
        return { ...prev, [filterKey]: [...current, value] };
      } else {
        return {
          ...prev,
          [filterKey]: current.filter((v) => v !== value),
        };
      }
    });
  };

  const clearFilters = () => {
    setActiveFilters({});
    setFilterSearchTerms({});
    setSearchTerm("");
  };

  const handleModalOpen = (columnKey) => {
    // Initialize temp filters with current active filters for this column
    setTempFilters({
      [columnKey]: activeFilters[columnKey] || [],
    });
    setTempFilterSearchTerms({
      [columnKey]: filterSearchTerms[columnKey] || "",
    });
  };

  const handleTempFilterChange = (filterKey, value, isChecked) => {
    setTempFilters((prev) => {
      const current = prev[filterKey] || [];
      if (isChecked) {
        return { ...prev, [filterKey]: [...current, value] };
      } else {
        return {
          ...prev,
          [filterKey]: current.filter((v) => v !== value),
        };
      }
    });
  };

  const handleApplyFilters = () => {
    // Apply temp filters to active filters
    if (openColumnFilterKey) {
      setActiveFilters((prev) => ({
        ...prev,
        [openColumnFilterKey]: tempFilters[openColumnFilterKey] || [],
      }));
      setFilterSearchTerms((prev) => ({
        ...prev,
        [openColumnFilterKey]: tempFilterSearchTerms[openColumnFilterKey] || "",
      }));
    }
    setOpenColumnFilterKey(null);
  };

  const handleCancelFilters = () => {
    // Discard temp filters and close modal
    setTempFilters({});
    setTempFilterSearchTerms({});
    setOpenColumnFilterKey(null);
  };

  const visibleCols = columns.filter((col) => visibleColumns[col.key]);

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col gap-4 mb-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <div className="flex gap-2">
            {/* Column Visibility Button */}
            <div className="relative" ref={columnMenuRef}>
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="px-2 md:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 text-sm"
                title={t("columns")}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden md:inline">{t("columns")}</span>
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-48">
                  <div className="p-3 border-b border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      {t("showHideColumns")}
                    </p>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {columns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key] || false}
                          onChange={() => handleColumnToggle(col.key)}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Show/Hide Column Filters Button */}
            {Object.keys(finalFilterOptions).length > 0 && (
              <button
                onClick={() => setShowColumnFilterIcons(!showColumnFilterIcons)}
                className={`px-2 md:px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
                  showColumnFilterIcons
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title={t("filters")}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden md:inline">{showColumnFilterIcons ? t("hideFilters") : t("showFilters")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {searchableFields.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>
        )}

        {/* Active Filters Display */}
        {(searchTerm || Object.values(activeFilters).some((arr) => arr.length > 0)) && (
          <div className="text-sm text-slate-600">
            Showing {filteredData.length} of {data.length} records
          </div>
        )}
      </div>

      {/* Column Filter Modal - Rendered as overlay */}
      {showColumnFilterIcons && openColumnFilterKey && finalFilterOptions[openColumnFilterKey] && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 opacity-100 transition-opacity duration-200"
          onClick={() => handleCancelFilters()}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-96 max-h-96 flex flex-col scale-100 transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <span className="text-sm font-semibold text-slate-900">
                {columns.find((c) => c.key === openColumnFilterKey)?.label}
              </span>
              <div className="flex gap-2 items-center">
                {tempFilters[openColumnFilterKey]?.length > 0 && (
                  <button
                    onClick={() => {
                      setTempFilters((prev) => ({
                        ...prev,
                        [openColumnFilterKey]: [],
                      }));
                      setTempFilterSearchTerms((prev) => ({
                        ...prev,
                        [openColumnFilterKey]: "",
                      }));
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                  >
                    {t("clear") || "Clear"}
                  </button>
                )}
                <button
                  onClick={() => handleCancelFilters()}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("search")}
                  value={tempFilterSearchTerms[openColumnFilterKey] || ""}
                  onChange={(e) =>
                    setTempFilterSearchTerms((prev) => ({
                      ...prev,
                      [openColumnFilterKey]: e.target.value,
                    }))
                  }
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Filter Options */}
              <div className="space-y-2">
                {(filteredFilterOptions[openColumnFilterKey] || []).length > 0 ? (
                  (filteredFilterOptions[openColumnFilterKey] || []).map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={tempFilters[openColumnFilterKey]?.includes(option) || false}
                        onChange={(e) =>
                          handleTempFilterChange(openColumnFilterKey, option, e.target.checked)
                        }
                        className="rounded w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">{option}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">
                    {t("noMatchesFound")}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => handleCancelFilters()}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={() => handleApplyFilters()}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                {t("apply") || "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{col.label}</span>
                    {showColumnFilterIcons && finalFilterOptions[col.key] && (
                      <button
                        onClick={() => {
                          if (openColumnFilterKey === col.key) {
                            setOpenColumnFilterKey(null);
                          } else {
                            handleModalOpen(col.key);
                            setOpenColumnFilterKey(col.key);
                          }
                        }}
                        className={`p-1 rounded transition ${
                          activeFilters[col.key]?.length > 0
                            ? "bg-blue-500 text-white"
                            : openColumnFilterKey === col.key
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={`Filter by ${col.label}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                  {t("action")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-200 hover:bg-slate-50">
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-center text-slate-700">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => action.onClick(row)}
                            className={`px-3 py-1 rounded text-sm font-medium transition ${action.className ||
                              "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              }`}
                            title={action.title}
                          >
                            {action.icon ? <action.icon className="w-4 h-4" /> : action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleCols.length + (actions?.length ? 1 : 0)}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  {t("noMatchesFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
