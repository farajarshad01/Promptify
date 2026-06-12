/**
 * SettingsPage.jsx — App Settings
 * ==============================
 * Manage API keys, notifications, and theme.
 */
import { useState, useEffect } from 'react';
import { Key, Bell, Palette, Server } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './SettingsPage.css';

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('promptify_notifs') ?? 'true'); }
    catch { return true; }
  });
  const { theme, setTheme } = useTheme();

  const handleToggleNotifications = (val) => {
    setNotificationsEnabled(val);
    try { localStorage.setItem('promptify_notifs', JSON.stringify(val)); } catch {}
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your application preferences and service integrations</p>
        </div>
      </div>

      {/* API Configuration */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Key size={18} />
          <h3>API Configuration</h3>
        </div>
        <p className="settings-section-desc">These keys are used to connect with AI and Shopify services. Configuration is managed in the backend environment.</p>

        <div className="settings-fields">
          <div className="settings-field">
            <label>Gemini AI API Status</label>
            <div className="settings-key-display">
              <Server size={16} />
              <span>Connected to Google Generative AI</span>
              <span className="settings-badge live">Live</span>
            </div>
          </div>
          <div className="settings-field">
            <label>Shopify Integration</label>
            <div className="settings-key-display">
              <Server size={16} />
              <span>Promptify-Dev Store</span>
              <span className="settings-badge demo">Demo Mode</span>
            </div>
          </div>
          <div className="settings-field">
            <label>Database Connection</label>
            <div className="settings-key-display">
              <Server size={16} />
              <span>Supabase Project: promptify-db</span>
              <span className="settings-badge live">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Bell size={18} />
          <h3>Notifications</h3>
        </div>
        <div className="settings-toggle-row">
          <div>
            <span className="settings-toggle-label">Deployment Notifications</span>
            <span className="settings-toggle-desc">Receive real-time alerts when your store blueprints are ready or deployed.</span>
          </div>
          <button
            className={`settings-toggle ${notificationsEnabled ? 'on' : ''}`}
            onClick={() => handleToggleNotifications(!notificationsEnabled)}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Palette size={18} />
          <h3>Appearance</h3>
        </div>
        <div className="settings-theme-row">
          <div 
            className={`settings-theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <div className="settings-theme-preview light">
              <div className="preview-sidebar" />
              <div className="preview-content" />
            </div>
            <span>Light Mode</span>
          </div>
          <div 
            className={`settings-theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <div className="settings-theme-preview dark">
              <div className="preview-sidebar" />
              <div className="preview-content" />
            </div>
            <span>Dark Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
