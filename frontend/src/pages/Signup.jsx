/**
 * Signup.jsx — Minimalist Signup Page
 * ==================================
 * Ultra-minimalist design featuring a floating card and line-art illustration.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import illustrationImg from '../assets/auth_illustration.png';
import './Login.css'; // Shares styles with Login

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, socialLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page split-screen">
      <div className="auth-container">
        {/* Left Side: White Panel with Logo at Top-Left */}
        <div className="auth-hero">
          <div className="auth-logo top-left">
            <img src={logoImg} alt="Promptify" className="auth-logo-img" />
          </div>
          
          <div className="auth-hero-content">
            <img 
              src={illustrationImg} 
              alt="AI Store Illustration" 
              className="auth-hero-illustration" 
            />
          </div>
        </div>

        {/* Right Side: Professional Form Panel */}
        <div className="auth-content">
          <div className="auth-form-container">
            <div className="auth-header">
              <h1>Get started</h1>
            </div>

            {error && (
              <div className="auth-error">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="signup-name">Full Name</label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="signup-email">Email Address</label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="signup-password">Password</label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="signup-confirm">Confirm Password</label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || !name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <div className="auth-divider">
                <span>OR CONTINUE WITH</span>
              </div>

              <div className="auth-social-grid">
                <button 
                  type="button" 
                  className="social-btn" 
                  onClick={() => socialLogin('google')}
                  title="Continue with Google"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>
              </div>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
