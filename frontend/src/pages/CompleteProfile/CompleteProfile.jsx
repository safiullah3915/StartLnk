import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { API_BASE_URL } from "../../utils/api";
import "react-toastify/dist/ReactToastify.css";
import "./CompleteProfile.css";

const ROLES = [
    { value: "entrepreneur", label: "Entrepreneur",        icon: "🚀", desc: "Building or scaling a startup" },
    { value: "student",      label: "Student / Professional", icon: "🎓", desc: "Looking for opportunities to grow" },
    // { value: "investor",     label: "Investor",             icon: "💼", desc: "Seeking startups to fund or advise" },
];

const TOTAL_STEPS = 2;
// Django username: letters, digits, @/./+/-/_
const USERNAME_REGEX = /^[a-zA-Z0-9@.+\-_]+$/;

function CompleteProfile() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const { signup, isAuthenticated } = useAuth();

    const googleData = location.state || {};
    const isGoogleUser = googleData.isGoogleUser || false;

    const [step,       setStep]       = useState(1);
    const [fullName,   setFullName]   = useState(googleData.full_name || "");
    const [name,       setName]       = useState("");
    const [fullNameError, setFullNameError] = useState("");
    const [nameError,  setNameError]  = useState("");
    const [role,       setRole]       = useState("entrepreneur");
    const [loading,    setLoading]    = useState(false);    // step-2 submit spinner
    const [checking,   setChecking]   = useState(false);   // step-1 username check spinner
    const [error,      setError]      = useState("");

    const email    = googleData.email || sessionStorage.getItem("signup_email")    || "";
    const password = sessionStorage.getItem("signup_password") || "";

    // Guard: no credentials → back to signup
    useEffect(() => {
        if (!email || (!password && !isGoogleUser)) {
            navigate("/signup", { replace: true });
        }
    }, [email, password, isGoogleUser, navigate]);

    // Guard: already logged in → dashboard
    useEffect(() => {
        if (isAuthenticated) navigate("/dashboard", { replace: true });
    }, [isAuthenticated]);

    // ── Local username format validation ──────────────────────────────────────
    const localValidate = (value) => {
        if (!value.trim())         return "Username is required.";
        if (value.includes(" "))   return "Username cannot contain spaces.";
        if (!USERNAME_REGEX.test(value))
            return "Only letters, numbers, and @/./+/-/_ characters are allowed.";
        return "";
    };

    // ── Step 1: Continue (format check + backend availability check) ──────────
    const handleContinue = async (e) => {
        e.preventDefault();
        setNameError("");
        setFullNameError("");

        // 0. Full Name check
        if (!fullName.trim()) {
            setFullNameError("Full name is required.");
            return;
        }

        // 1. Local format check
        const formatErr = localValidate(name);
        if (formatErr) { setNameError(formatErr); return; }

        // 2. Backend availability check
        setChecking(true);
        try {
            const res  = await fetch(
                `${API_BASE_URL}/check-username?username=${encodeURIComponent(name.trim())}`
            );
            const data = await res.json();

            if (!data.available) {
                setNameError(data.error || "Username is not available.");
                return;
            }
        } catch {
            // Network error — don't block the user, let the final signup catch it
        } finally {
            setChecking(false);
        }

        setStep(2);
    };

    // ── Step 2: Complete signup ───────────────────────────────────────────────
    const handleComplete = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signup(name.trim(), email, password, role, "", fullName.trim(), isGoogleUser);

            if (result.success) {
                sessionStorage.removeItem("signup_email");
                sessionStorage.removeItem("signup_password");

                toast.success("Account created successfully!", {
                    position: "top-center", autoClose: 2000,
                    theme: "light", transition: Bounce,
                });

                if (result.requiresVerification) {
                    toast.info("Please check your email to verify your account.");
                    setTimeout(() =>
                        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true })
                    , 500);
                } else {
                    setTimeout(() =>
                        navigate("/onboarding-preferences", { replace: true })
                    , 500);
                }
            } else {
                const raw = result.error || "";
                const msg = raw.toLowerCase();

                // Username errors → go back to step 1
                if (msg.includes("username") &&
                    (msg.includes("already exists") || msg.includes("unique") ||
                     msg.includes("taken") || msg.includes("valid") || msg.includes("characters"))) {
                    setStep(1);
                    setNameError(raw.includes("already") || raw.includes("unique")
                        ? "This username is already taken. Please choose a different one."
                        : "Username can only contain letters, numbers, and @/./+/-/_.");
                    return;
                }

                // If it's a specific error we got from the backend, show it directly
                if (raw && !msg.includes("internal server error")) {
                    setError(raw);
                    return;
                }

                // Technical fallback
                setError("Our servers are busy right now. Please try again in a moment.");
            }
        } catch {
            setError("Our servers are busy right now. Please try again in a moment.");
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="cp-page">
                <div className="cp-card">

                    {/* Step header */}
                    <div className="cp-step-header">
                        <span className="cp-step-label">Step {step} of {TOTAL_STEPS}</span>
                        <div className="cp-progress">
                            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                                <div key={i} className={`cp-bar${i < step ? " active" : ""}`} />
                            ))}
                        </div>
                    </div>

                    {/* ── STEP 1 ── */}
                    {step === 1 && (
                        <form onSubmit={handleContinue} className="cp-form">
                            <h2 className="cp-title">Complete your account</h2>
                            <p className="cp-subtitle">Tell us a bit about yourself to get started.</p>

                            {/* Full Name */}
                            <div className="cp-field">
                                <label className="cp-label" htmlFor="cp-fullname">Full Name</label>
                                <input
                                    id="cp-fullname"
                                    type="text"
                                    placeholder="e.g. Ahsan Tariq"
                                    className={`cp-input${fullNameError ? " cp-input-err" : ""}`}
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (fullNameError) setFullNameError("");
                                    }}
                                    autoFocus
                                    autoComplete="name"
                                />
                                {fullNameError && (
                                    <span className="cp-field-error">{fullNameError}</span>
                                )}
                            </div>

                            {/* Username */}
                            <div className="cp-field">
                                <label className="cp-label" htmlFor="cp-username">Username</label>
                                <input
                                    id="cp-username"
                                    type="text"
                                    placeholder="e.g. ahsan_tariq"
                                    className={`cp-input${nameError ? " cp-input-err" : ""}`}
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (nameError) setNameError(localValidate(e.target.value));
                                    }}
                                    autoComplete="username"
                                />
                                {nameError && (
                                    <span className="cp-field-error">{nameError}</span>
                                )}
                            </div>

                            {/* Email — read-only display */}
                            <div className="cp-field">
                                <label className="cp-label">Email</label>
                                <input
                                    type="text"
                                    className="cp-input cp-locked"
                                    value={email}
                                    readOnly
                                    tabIndex={-1}
                                />
                            </div>

                            <button
                                type="submit"
                                className={`cp-btn${checking ? " loading" : ""}`}
                                disabled={!name.trim() || !fullName.trim() || checking}
                            >
                                {checking
                                    ? <><div className="cp-spinner" /> Checking...</>
                                    : "Continue →"}
                            </button>

                            <div className="cp-back">
                                <button
                                    type="button"
                                    onClick={() => {
                                        sessionStorage.removeItem("signup_email");
                                        sessionStorage.removeItem("signup_password");
                                        navigate("/signup");
                                    }}
                                >
                                    ← Back to signup
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── STEP 2 ── */}
                    {step === 2 && (
                        <form onSubmit={handleComplete} className="cp-form">
                            <h2 className="cp-title">What best describes you?</h2>
                            <p className="cp-subtitle">Help us personalize your StartLnk experience.</p>

                            {error && <div className="cp-error">{error}</div>}

                            <div className="cp-roles">
                                {ROLES.map((r) => (
                                    <div
                                        key={r.value}
                                        className={`cp-role-card${role === r.value ? " selected" : ""}`}
                                        onClick={() => setRole(r.value)}
                                    >
                                        <span className="cp-role-icon">{r.icon}</span>
                                        <div className="cp-role-info">
                                            <div className="cp-role-name">{r.label}</div>
                                            <div className="cp-role-desc">{r.desc}</div>
                                        </div>
                                        <div className="cp-role-radio">
                                            <div className="cp-role-dot" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="submit"
                                className={`cp-btn${loading ? " loading" : ""}`}
                                disabled={loading}
                            >
                                {loading
                                    ? <><div className="cp-spinner" /> Creating account...</>
                                    : "Complete Profile →"}
                            </button>

                            <div className="cp-back">
                                <button type="button" onClick={() => { setStep(1); setError(""); }}>
                                    ← Back
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
            <ToastContainer />
        </>
    );
}

export default CompleteProfile;
