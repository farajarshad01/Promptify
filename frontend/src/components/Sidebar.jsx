/**
 * Sidebar.jsx — Navigation Sidebar
 * ==================================
 * Sage green sidebar matching reference image layout.
 * Shows logo, nav items, and logout button.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Sparkles,
  Store,
  User,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import logoIcon from '../assets/logo-icon.png';
import { useState } from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/generate', label: 'Generate Store', icon: Sparkles },
  { path: '/stores', label: 'My Stores', icon: Store },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('promptify_sidebar_collapsed') ?? 'false'); }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('promptify_sidebar_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Logo ──────────────────────────────── */}
      <div className="sidebar-logo">
        {collapsed ? (
          <div className="sidebar-logo-collapsed-wrapper">
            <img src={logoIcon} alt="Promptify" className="sidebar-logo-img-collapsed" />
          </div>
        ) : (
          <img src={logoImg} alt="Promptify" className="sidebar-logo-img" />
        )}
      </div>

      {/* ── Collapse Toggle ───────────────────── */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => toggleCollapsed()}
        aria-label="Toggle sidebar"
      >
        <ChevronLeft size={18} />
      </button>

      {/* ── Navigation ────────────────────────── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={label}
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer / Logout ───────────────────── */}
      <div className="sidebar-footer">
        <button className="sidebar-link sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
