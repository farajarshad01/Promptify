/**
 * AuthContext.jsx — Authentication Context Provider
 * ===================================================
 * Provides auth state (user, token) to the entire app.
 * Handles login, signup, logout, and token persistence.
 * Includes ProtectedRoute for guarding authenticated pages.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, authSignup, authSocial, authGetMe } from '../api';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

const TOKEN_KEY = 'promptify_token';
const USER_KEY = 'promptify_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on mount ──────────────
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      // Verify the token is still valid
      authGetMe(savedToken)
        .then((userData) => {
          setUser(userData);
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        })
        .catch(() => {
          // Token expired or invalid — clear session
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // ── Handle social login redirects ─────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          // Sync with our backend to get custom JWT and ensure user exists
          const result = await authSocial(
            session.user.email,
            session.user.user_metadata.full_name || session.user.email.split('@')[0],
            session.user.user_metadata.avatar_url
          );
          
          setUser(result.user);
          setToken(result.token);
          localStorage.setItem(TOKEN_KEY, result.token);
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
          
          // Clear Supabase session from storage if we only want our custom JWT
          // await supabase.auth.signOut(); 
        } catch (err) {
          console.error('[Social Auth Error]', err);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    const result = await authLogin(email, password);
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  };

  const handleSignup = async (email, password, name) => {
    const result = await authSignup(email, password, name);
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  };

  const handleSocialLogin = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    
    if (error) throw error;
    return data;
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const handleUpdateUser = (updatedUserData) => {
    const newUser = { ...user, ...updatedUserData };
    setUser(newUser);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        signup: handleSignup,
        login: handleLogin,
        socialLogin: handleSocialLogin,
        logout: handleLogout,
        updateUser: handleUpdateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the auth context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
