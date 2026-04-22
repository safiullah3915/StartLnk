import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./login.css";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../contexts/AuthContext";
import { Navbar } from "../Navbar/Navbar";


function Login({ leftimg, logo, line1, line2, paragraph }) {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    //javascript-------------------------------------------------------------
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/dashboard");
        }
    }, [isAuthenticated, navigate]);

    // Pre-fill email from URL params if available
    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const forgetPasswords = () => {
        navigate("/auth/forget-password")
    }

    const passwordToggle = () => {
        setShow(!show)
    }

    //Notifications

    function passwordError() {
        toast.error('Password must be greater than 8 characters', {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    }
    function wrongCredentials() {
        toast.error('Wrong credentials', {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    }
    function emailNotVerified() {
        toast.error('Email not verified. Please check your email for verification code.', {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    }

    function serverError() {
        toast.error('Internal Server Error', {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    }


    function success() {
        toast.success('Login Succesfully', {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    };





    const loginCredentials = async (e) => {
        e.preventDefault();

        if (!email.trim() || !password.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                success();
                navigate("/dashboard");
            } else {
                if (result.error === "Wrong credentials") {
                    wrongCredentials();
                } else if (result.needsVerification || result.error === "Email not verified" || result.error.includes("not verified")) {
                    emailNotVerified();
                    // Store email for verification and redirect
                    localStorage.setItem('pendingLoginEmail', email);
                    setTimeout(() => {
                        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
                    }, 2000);
                } else {
                    serverError();
                }
            }
        } catch (error) {
            console.error("Login failed:", error);
            serverError();
        } finally {
            setLoading(false);
        }
    }


    // Remove old cookie-based authentication code




    let allFieldsFill = (e) => {
        return password.trim() !== "" && email.trim() !== "";
    }
    //-----------------------------------------------------------------------------------




    return (
        <div id="login-page-root">
            <style>
                {`
                #login-page-root .btn-form {
                    width: 100% !important;
                    display: block !important;
                    margin-top: 1rem !important;
                }

                #login-page-root .btn {
                    margin: 0 0 0 0;
                    width: 100% !important;
                    height: 3.2rem !important;
                    background: #25224A !important;
                    color: #ffffff !important;
                    border: none !important;
                    border-radius: 12px !important;
                    font-size: 1.1rem !important;
                    font-weight: 700 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.75rem !important;
                    box-shadow: 0 4px 12px rgba(37, 34, 74, 0.2) !important;
                }

                #login-page-root .btn:hover:not(:disabled) {
                    background: #1a1835 !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 20px rgba(37, 34, 74, 0.3) !important;
                }

                #login-page-root .btn:disabled {
                    opacity: 0.6 !important;
                    cursor: not-allowed !important;
                }

                #login-page-root .btn-arrow {
                    font-size: 1.2rem !important;
                    transition: transform 0.2s ease !important;
                }

                #login-page-root .btn:hover .btn-arrow {
                    transform: translateX(4px) !important;
                }
                `}
            </style>
            <Navbar />
            {loading && (
                <div className="progress-overlay">
                    <div className="progress-modal">
                        <div className="progress-spinner-large"></div>
                        <p className="progress-text">Signing In...</p>
                    </div>
                </div>
            )}
            <div className="main signin-page">

                {/* ── Left side — untouched ── */}
                <div className="left">
                    <div className="leftimg"><img src="./login-banner.png" alt="Login Banner" /></div>
                </div>

                {/* ── Right side — redesigned ── */}
                <div className="right">
                    <div className="loginbox">

                        {/* Title */}
                        <h2 className="welcome-title">Welcome back</h2>
                        <p className="welcome-subtitle">Enter your details to access your account</p>

                        {/* Social buttons */}
                        <div className="social-buttons">
                            <button className="social-btn" type="button" disabled>
                                {/* Google icon */}
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>

                            <button className="social-btn" type="button" disabled>
                                {/* GitHub icon */}
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                                Continue with GitHub
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="divider">
                            <span className="divider-line"></span>
                            <span className="divider-text">or continue with email</span>
                            <span className="divider-line"></span>
                        </div>

                        {/* Email field */}
                        <div className="field-group">
                            <label htmlFor="login-email">Email address</label>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                placeholder="name@example.com"
                                className="inp"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value) }}
                            />
                        </div>

                        {/* Password field */}
                        <div className="field-group">
                            <label htmlFor="login-password">Password</label>
                            <div className="pas">
                                <input
                                    id="login-password"
                                    type={show ? "text" : "password"}
                                    name="password"
                                    placeholder="••••••••"
                                    className="inp"
                                    onChange={(e) => { setPassword(e.target.value) }}
                                />
                                <p onClick={passwordToggle}>{show ? "hide" : "show"}</p>
                            </div>
                        </div>

                        {/* Forgot password */}
                        <p className="forgot" onClick={forgetPasswords}>Forgot Password?</p>

                        {/* Submit */}
                        <form method="POST" className="btn-form">
                            <button
                                type="submit"
                                disabled={!allFieldsFill() || loading}
                                onClick={loginCredentials}
                                className="btn"
                            >
                                Sign In <span className="btn-arrow">→</span>
                            </button>
                        </form>

                        {/* Signup link */}
                        <Link to="/signup" className="noaccount">
                            <p className="signupText">Don't have an account? <span className="signup-link">Sign up</span></p>
                        </Link>

                    </div>
                </div>

            </div>
            <ToastContainer />
        </div>
    );
}

export { Login }
