import React from "react";
import "./login.css"
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Navbar } from "../Navbar/Navbar";
import apiClient from "../../utils/axiosConfig";
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from "../../contexts/AuthContext";


function Signup() {
    const navigate = useNavigate();
    const { setAuthData } = useAuth();

    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                const response = await apiClient.post('/auth/google-verify', {
                    token: tokenResponse.access_token
                });
                
                const data = response.data;

                if (data.is_existing_user) {
                    // CASE 1: EXISTING USER -> Log in directly
                    setAuthData(data.user, data.auth_token);
                    
                    if (data.user.onboarding_completed) {
                        navigate("/search");
                    } else {
                        navigate("/onboarding-preferences");
                    }
                    toast.success("Welcome back!");
                } else {
                    // CASE 2: NEW USER -> Go to complete profile
                    navigate("/complete-profile", { 
                        state: { 
                            email: data.email, 
                            full_name: data.full_name,
                            isGoogleUser: true 
                        } 
                    });
                }
            } catch (error) {
                console.error("Google verification failed:", error);
                toast.error("Google signup failed. Please try again.");
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => toast.error("Google Signup Failed")
    });

    function passwordError() {
        toast.error('Password must be at least 8 characters', {
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

    const passwordToggle = () => {
        setShow(!show);
    };

    const handleNext = async (e) => {
        e.preventDefault();

        if (password.length < 8) {
            passwordError();
            return;
        }
        if (!email.trim() || !password.trim()) {
            toast.error('Please fill in all fields', { position: "top-center", autoClose: 3000 });
            return;
        }

        setIsLoading(true);
        try {
            // Artificial delay for better UX (so 'Verifying...' is actually seen)
            await new Promise(resolve => setTimeout(resolve, 800));

            // Early email availability check
            const response = await apiClient.get(`/check-email?email=${encodeURIComponent(email.trim())}`);
            
            if (response.data.available === false) {
                toast.error(response.data.error || 'This email is already registered', {
                    position: "top-center",
                    autoClose: 4000
                });
                setIsLoading(false);
                return;
            }

            // Store credentials temporarily
            sessionStorage.setItem('signup_email', email.trim());
            sessionStorage.setItem('signup_password', password);

            navigate('/complete-profile');
        } catch (error) {
            console.error('Email check failed:', error);
            // If the check fails for some reason (e.g. server down), we still let them proceed
            // but we store the credentials. The final signup will still catch the error.
            sessionStorage.setItem('signup_email', email.trim());
            sessionStorage.setItem('signup_password', password);
            navigate('/complete-profile');
        } finally {
            setIsLoading(false);
        }
    };

    const allFieldsFill = () => password.trim() !== "" && email.trim() !== "";

    return (
        <div id="signup-page-root">
            <style>
                {`
                #signup-page-root .btn-form {
                    width: 100% !important;
                    display: block !important;
                    margin-top: 1rem !important;
                }

                #signup-page-root .btn {
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

                .inp:focus {
                    border-color: var(--primary-dark) !important;
                    box-shadow: 0 0 0 3px rgba(37, 34, 74, 0.1) !important;
                    outline: none !important;
                }

                /* Password toggle wrapper */
                .pas {
                    position: relative;
                    width: 100%;
                    display: flex;
                    align-items: center;
                }

                .pas .inp {
                    width: 100% !important;
                    padding-right: 3.5rem !important;
                }

                .pas p {
                    position: absolute;
                    right: 1rem;
                    color: var(--primary-blue);
                    cursor: pointer;
                    font-size: 0.82rem;
                    font-weight: 500;
                    transition: color 0.2s ease;
                    user-select: none;
                }

                .pas p:hover {
                    color: var(--primary-dark);
                }

                #signup-page-root .btn:hover:not(:disabled) {
                    background: #1a1835 !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 20px rgba(37, 34, 74, 0.3) !important;
                }

                #signup-page-root .btn:disabled {
                    opacity: 0.6 !important;
                    cursor: not-allowed !important;
                }
                `}
            </style>
            <Navbar />
            <div className="main signup-page">

                {/* ── Left side ── */}
                <div className="left">
                    <div className="leftimg"><video src="/bs2.mp4" autoPlay muted loop playsInline><source src="/bs2.mp4" type="video/mp4" /></video></div>
                </div>

                {/* ── Right side ── */}
                <div className="right">
                    <div className="loginbox">

                        <h2 className="welcome-title">Create Your Account</h2>
                        <p className="welcome-subtitle">Join thousands of entrepreneurs worldwide</p>

                        {/* Social buttons */}
                        <div className="social-buttons">
                            <button className="social-btn" type="button" onClick={() => googleLogin()}>
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>

                            {/* <button className="social-btn" type="button" disabled>
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                                Continue with GitHub
                            </button> */}
                        </div>

                        {/* ── Email/password signup commented out — Google only ── */}
                        {/* <div className="divider">
                            <span className="divider-line"></span>
                            <span className="divider-text">or continue with email</span>
                            <span className="divider-line"></span>
                        </div>

                        <div className="field-group">
                            <label htmlFor="signup-email">Email Address</label>
                            <input
                                id="signup-email"
                                type="email"
                                placeholder="name@example.com"
                                className="inp"
                                autoComplete="on"
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="field-group">
                            <label htmlFor="signup-password">Password</label>
                            <div className="pas">
                                <input
                                    id="signup-password"
                                    type={show ? "text" : "password"}
                                    placeholder="Create a strong password (min. 8 characters)"
                                    className="inp"
                                    autoComplete="on"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <p onClick={passwordToggle}>{show ? "hide" : "show"}</p>
                            </div>
                        </div>

                        <div className="btnbox">
                            <form onSubmit={handleNext} className="btn-form">
                                <button
                                    type="submit"
                                    disabled={!allFieldsFill() || isLoading}
                                    className="btn"
                                >
                                    {isLoading ? 'Verifying...' : 'Next →'}
                                </button>
                            </form> */}

                        {/* Sign-in link */}
                        <div className="btnbox">
                            <Link to="/login" className="noaccount">
                                <p className="signupText">Already have an account? <span className="signup-link">Sign in here</span></p>
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
            <ToastContainer />
        </div>
    );
}

export default Signup;
