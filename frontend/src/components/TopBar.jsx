/**
 * TopBar.jsx — Top Navigation Bar
 * =================================
 * Horizontal bar with search input, notification icon,
 * and user avatar/name, matching the reference image.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, X } from 'lucide-react';
import './TopBar.css';

export default function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState(() => {
    try {
      const cleared = JSON.parse(localStorage.getItem('promptify_notifs_cleared') ?? 'false');
      if (cleared) return [];
    } catch {}
    return [
      { id: 1, text: 'Store blueprint "EcoVibe" generated successfully!', time: '2m ago' },
      { id: 2, text: 'Deployment to Shopify completed.', time: '1h ago' },
    ];
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleClearNotifications = () => {
    setNotifications([]);
    try { localStorage.setItem('promptify_notifs_cleared', 'true'); } catch {}
  };

  // Generate initials for the avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search">
        <Search size={18} className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Search for stores, blueprints..."
          className="topbar-search-input"
        />
      </div>

      {/* Right Section */}
      <div className="topbar-right">
        {/* Notifications */}
        <div className="topbar-notification-wrapper" ref={notifRef}>
          <button 
            className={`topbar-icon-btn ${showNotifications ? 'active' : ''}`} 
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {notifications.length > 0 && <span className="topbar-notification-dot" />}
          </button>

          {showNotifications && (
            <div className="topbar-notification-dropdown glass-effect">
              <div className="notification-header">
                <h3>Notifications</h3>
                <button onClick={handleClearNotifications} className="clear-btn">Clear all</button>
              </div>
              <div className="notification-list">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="notification-item">
                      <p className="notification-text">{n.text}</p>
                      <span className="notification-time">{n.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info (Clickable) */}
        <div className="topbar-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{user?.name || 'User'}</span>
            <span className="topbar-user-role">Store Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
