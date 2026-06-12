/**
 * DashboardLayout.jsx — Authenticated Layout Wrapper
 * =====================================================
 * Renders the sidebar + topbar + content area.
 * All authenticated pages render inside this layout.
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="layout-loading">
        <div className="layout-loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="layout-content">
        <TopBar />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
