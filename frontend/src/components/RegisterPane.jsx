import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { useLanguage } from "./LanguageContext.jsx";
import { UserCheck, KeyRound, Mail, User, ShieldAlert, CheckCircle, Smartphone, Eye, EyeOff } from "lucide-react";

export const RegisterPane = ({ onSuccess }) => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { t } = useLanguage();

    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [bloodType, setBloodType] = useState("O+");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [biologicalSex, setBiologicalSex] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");
        setIsSubmitting(true);

        try {
            // Validations
            if (!fname.trim() || !lname.trim()) {
                setErrorMsg(t("fullNameRequired"));
                setIsSubmitting(false);
                return;
            }

            if (!email.includes("@")) {
                setErrorMsg(t("invalidEmail"));
                setIsSubmitting(false);
                return;
            }

            const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/;

            if (
                !strongPasswordPattern.test(
                    password
                )
            ) {
                setErrorMsg(
                    t("passwordTooShort")
                );

                setIsSubmitting(false);
                return;
            }

            if (password !== passwordConfirmation) {
                setErrorMsg(t("passwordsDoNotMatch"));
                setIsSubmitting(false);
                return;
            }

            if (!dateOfBirth || !biologicalSex) {
                setErrorMsg(
                    t("eligibilityInformationRequired")
                );
                setIsSubmitting(false);
                return;
            }

            const result = await register({
                email,
                fname,
                lname,
                phone,
                password,
                passwordConfirmation,
                bloodType,
                dateOfBirth,
                biologicalSex,
            });

            if (result.success) {
                setSuccessMsg(t("registrationSuccessful"));
                if (onSuccess) {
                    onSuccess();
                }
                navigate("/donor-intent", { replace: true, });

                return;
            } else {
                setErrorMsg(result.message);
            }
        } catch (err) {
            setErrorMsg(err.message || t("anErrorOccurred"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 max-w-2xl mx-auto my-4 transition-all overflow-hidden animate-fade-in text-slate-800">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
                    {t("registerAsDonor")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    {t("completeFormToCreateAccount")}
                </p>
            </div>

            {errorMsg && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 font-bold p-3 rounded-lg text-xs flex items-center gap-2 animate-pulse">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {successMsg && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold p-3 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("firstName")}
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={fname}
                                onChange={(e) => setFname(e.target.value)}
                                placeholder={t("firstNamePlaceholder")}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("lastName")}
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={lname}
                                onChange={(e) => setLname(e.target.value)}
                                placeholder={t("lastNamePlaceholder")}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("email")}
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t("emailPlaceholder")}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("phone")}
                        </label>
                        <div className="relative">
                            <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder={t("phoneNumberPlaceholder")}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("dateOfBirth")}
                        </label>

                        <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(event) =>
                                setDateOfBirth(event.target.value)
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 px-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("biologicalSex")}
                        </label>

                        <select
                            value={biologicalSex}
                            onChange={(event) =>
                                setBiologicalSex(event.target.value)
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 px-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                            required
                        >
                            <option value="">
                                {t("selectBiologicalSex")}
                            </option>

                            <option value="male">
                                {t("male")}
                            </option>

                            <option value="female">
                                {t("female")}
                            </option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-4">
                    {/* Blood Type */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                            {t("bloodType")}
                        </label>
                        <select
                            value={bloodType}
                            onChange={(e) => setBloodType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 px-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                        >
                            {bloodTypes.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                        {t("password")}
                    </label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("passwordPlaceholder")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-9 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Password Confirmation */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
                        {t("confirmPassword")}
                    </label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            placeholder={t("confirmPasswordPlaceholder")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-9 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                        >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition shadow-sm hover:shadow-md disabled:opacity-50 select-none mt-4"
                >
                    {isSubmitting
                        ? t("registering")
                        : t("createAccount")
                    }
                </button>
            </form>
        </div>
    );
};
