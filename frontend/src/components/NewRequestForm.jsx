import React, { useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDB } from "./DBContext.jsx";
import { Send, AlertCircle } from "lucide-react";
import { Truck01, } from "@untitledui/icons";

const getTodayISO = () => {
  const now =
    new Date();

  const localDate =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() *
      60 *
      1000
    );

  return localDate
    .toISOString()
    .split("T")[0];
};

const createInitialFormData = () => ({
  fname: "",
  fatherName: "",
  lname: "",
  bloodGenre: "whole_blood",
  bloodType: "O+",
  hospitalSelectionType: "registered",
  hospitalId: "",
  customHospitalName: "",
  customHospitalAddress: "",
  transportationAvailable: false,
  transportationAvailable: false,
  unitsNeeded: "",
  date: getTodayISO(),
  description: "",
  relationToPatient: "",
});
export const NewRequestForm = ({ onSuccess }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { hospitals, addRequester } = useDB();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData,] = useState(createInitialFormData);

  const handleChange = (event) => {
    const { name, value, } = event.target;

    setFormData((previous) => ({ ...previous, [name]: value, }));
  };

  const handleHospitalChange =
    (event) => {
      const value =
        event.target.value;

      if (
        value === "__other__"
      ) {
        setFormData(
          (previous) => ({
            ...previous,

            hospitalSelectionType:
              "other",

            hospitalId: "",

            customHospitalName:
              previous
                .customHospitalName ??
              "",

            customHospitalAddress:
              previous
                .customHospitalAddress ??
              "",
          })
        );

        return;
      }

      setFormData(
        (previous) => ({
          ...previous,

          hospitalSelectionType:
            "registered",

          hospitalId: value,

          customHospitalName:
            "",

          customHospitalAddress:
            "",
        })
      );
    };

  const hasText = (value) =>
    typeof value === "string" &&
    value.trim().length > 0;

  const parsedUnits =
    Number(formData.unitsNeeded);

  const hasValidUnits =
    Number.isInteger(parsedUnits) &&
    parsedUnits >= 1 &&
    parsedUnits <= 50;

  const hasValidHospital =
    formData.hospitalSelectionType === "registered" ? hasText(formData.hospitalId) : hasText(formData.customHospitalName) &&
      formData.customHospitalName.trim().length >= 2 &&
      hasText(formData.customHospitalAddress) &&
      formData.customHospitalAddress.trim().length >= 5;

  const isFormComplete =
    Boolean(user?.verifiedByAdmin) &&
    hasText(formData.fname) &&
    hasText(formData.fatherName) &&
    hasText(formData.lname) &&
    hasText(formData.bloodGenre) &&
    hasText(formData.bloodType) &&
    hasValidHospital &&
    hasValidUnits &&
    hasText(formData.date) &&
    hasText(formData.relationToPatient);

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const unitsNeeded =
        Number.parseInt(
          formData.unitsNeeded,
          10
        );

      if (
        !Number.isInteger(
          unitsNeeded
        ) ||
        unitsNeeded < 1 ||
        unitsNeeded > 50
      ) {
        setError(
          t("invalidUnitsNeeded")
        );

        return;
      }

      if (formData.hospitalSelectionType === "registered" && !formData.hospitalId) {
        setError(t("registeredHospitalRequired"));
        return;
      }

      const customHospitalName = (formData.customHospitalName ?? "").trim();
      const customHospitalAddress = (formData.customHospitalAddress ?? "").trim();

      if (formData.hospitalSelectionType === "other" && (!customHospitalName || !customHospitalAddress)) {
        setError(t("customHospitalDetailsRequired"));

        return;
      }

      try {
        setLoading(true);

        const requestPayload = {
          fname: formData.fname.trim(),
          fatherName: formData.fatherName.trim(),
          lname: formData.lname.trim(),
          bloodGenre: formData.bloodGenre,
          bloodType: formData.bloodType,
          hospitalSelectionType: formData.hospitalSelectionType,
          transportationAvailable: formData.transportationAvailable === true,
          unitsNeeded,
          date: formData.date,
          description: formData.description.trim(),
          relationToPatient: formData.relationToPatient.trim(),
        };

        if (formData.hospitalSelectionType === "registered") {
          requestPayload.hospitalId = formData.hospitalId;
        } else {
          requestPayload.customHospital =
          {
            name:
              customHospitalName,

            address:
              customHospitalAddress,
          };
        }

        await addRequester(
          requestPayload
        );

        setSuccess(t("requestSubmittedForApproval"));
        setFormData(createInitialFormData());

        if (onSuccess) {
          window.setTimeout(
            onSuccess,
            1500
          );
        }
      } catch (submitError) {
        setError(
          submitError.message ||
          t("requestSubmissionFailed")
        );
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

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {t("hospitalName")}
            </label>

            <select
              value={
                formData
                  .hospitalSelectionType ===
                  "other"
                  ? "__other__"
                  : formData.hospitalId
              }
              onChange={
                handleHospitalChange
              }
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-600 focus:outline-none"
            >
              <option value="">
                {t("selectHospital")}
              </option>

              {hospitals
                .filter(
                  (hospital) =>
                    hospital?._id ||
                    hospital?.id
                )
                .map(
                  (hospital) => {
                    const hospitalIdentifier =
                      hospital._id ||
                      hospital.id;

                    return (
                      <option
                        key={
                          hospitalIdentifier
                        }
                        value={
                          hospitalIdentifier
                        }
                      >
                        {hospital.name}
                      </option>
                    );
                  }
                )}

              <option value="__other__">
                {t("otherHospital")}
              </option>
            </select>
          </div>

          {formData
            .hospitalSelectionType ===
            "other" && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    {t(
                      "customHospitalName"
                    )}
                  </label>

                  <input
                    type="text"
                    name="customHospitalName"
                    value={formData.customHospitalName ?? ""}
                    onChange={handleChange}
                    placeholder={t("customHospitalNamePlaceholder")}
                    minLength={2}
                    maxLength={150}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    {t(
                      "customHospitalAddress"
                    )}
                  </label>

                  <textarea
                    name="customHospitalAddress"
                    value={formData.customHospitalAddress ?? ""}
                    onChange={handleChange}
                    placeholder={t("customHospitalAddressPlaceholder")}
                    minLength={5}
                    maxLength={300}
                    rows={3}
                    required
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-red-600 focus:outline-none"
                  />

                  <p className="mt-1 text-right text-xs text-slate-500">
                    {(formData.customHospitalAddress ?? "").length}
                    /300
                  </p>
                </div>
              </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t("unitsNeeded")}
            </label>
            <input
              type="number"
              name="unitsNeeded"
              value={
                formData.unitsNeeded
              }
              onChange={handleChange}
              placeholder={t("requiredUnitsPlaceholder")}
              min="1"
              max="50"
              step="1"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-600 focus:outline-none"
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
              min={getTodayISO()}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <p
              className={`text-sm font-semibold ${formData
                .transportationAvailable
                ? "text-red-700"
                : "text-slate-600"
                }`}
            >
              {formData
                .transportationAvailable
                ? t(
                  "transportationAvailable"
                )
                : t(
                  "transportationNotAvailable"
                )}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={formData.transportationAvailable}
              aria-label={t("transportationAvailability")}
              onClick={() =>
                setFormData(
                  (previous) => ({
                    ...previous,

                    transportationAvailable:
                      !previous
                        .transportationAvailable,
                  })
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${formData
                .transportationAvailable
                ? "bg-red-600"
                : "bg-slate-300"
                }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${formData
                  .transportationAvailable
                  ? "translate-x-5"
                  : "translate-x-0.5"
                  }`}
              />
            </button>
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
            required
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
          disabled={loading || !isFormComplete}
          title={!user?.verifiedByAdmin ? t("accountNotVerified") : !isFormComplete ? t("completeRequiredFields") : t("submit")}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />

          {loading
            ? t("submitting")
            : t("submit")}
        </button>
      </form>
    </div>
  );
};
