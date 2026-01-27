
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthHero from '../assets/auth-hero.png';
import '../AuthStyles.css';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState(""); // Keeping username for logic, but maybe use email in UI
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";

        // For this demo, if signing up, we'll combine First/Last or just use one as username
        // The backend expects 'username'. We will map the UI "Email" or "Name" to 'username'.
        // Let's assume the user enters a username in the "Email address" field for simplicity matching current backend,
        // OR we just use the UI fields shown.
        // Image shows: First Name, Last Name, Email.
        // Backend User model: username, password.
        // We will adapt:
        // Login: Username (labeled "Email/Username"), Password.
        // Signup: First Name (ignored or part of meta), Last Name (ignored), Username (labeled Email), Password.

        const payload = {
            username: username,
            password: password
        };







        // Use dynamic hostname with fallback to relative path (for local proxy)
        const baseUrl = import.meta.env.VITE_SERVER_URL || "";

        try {
            const res = await fetch(`${baseUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            login(data.token, data.user);

            // Redirect to intended page or home
            const from = location.state?.from || "/";
            navigate(from);

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <img src={AuthHero} alt="CoLink Conference" className="auth-character-img" style={{ borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }} />

                <div className="auth-right">
                    <h1 className="auth-title">{isLogin ? "Welcome Back" : "Annual Conference"}</h1>
                    <p className="auth-subtitle">
                        {isLogin ? "Please sign in to continue." : "To reserve your seat, please fill in the form below."}
                    </p>

                    {error && <div style={{ color: '#ff4d4f', marginBottom: '15px', padding: '10px', background: 'rgba(255,0,0,0.1)', borderRadius: '4px', border: '1px solid #ff4d4f' }}>{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {!isLogin && (
                            <div className="form-group">
                                <label className="form-label">Your full name *</label>
                                <div className="form-row">
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                    // Not required for backend currently, but visually present
                                    />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Username / Email address *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ex. yourname@company.com"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-auth">
                            {isLogin ? "Sign In" : "Register"}
                        </button>

                        <div className="toggle-auth">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <span className="toggle-link" onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? "Register here" : "Sign In here"}
                            </span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Auth;
