/**
 * Dashboard.jsx — Store History Dashboard
 * =========================================
 * Displays stat cards (Total, Deployed, Drafts, Failed)
 * and a table of all generated store blueprints.
 *
 * Data is fetched from the backend GET /api/stores endpoint.
 * Each store row has a "View JSON" button that opens
 * the blueprint modal.
 */

import { useState, useEffect } from 'react';
import { getStores } from './api';
import './Dashboard.css';

export default function Dashboard({ stores, onRefresh, onViewBlueprint }) {
  /**
   * Calculate stats from the stores array.
   * Counts total, deployed, draft, and failed stores.
   */
  const stats = {
    total: stores.length,
    deployed: stores.filter((s) => s.status === 'deployed').length,
    draft: stores.filter((s) => s.status === 'draft').length,
    failed: stores.filter((s) => s.status === 'failed').length,
  };

  /**
   * Format a date string into a readable format.
   * e.g., "Apr 17, 2026 · 2:30 PM"
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' · ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-section">
      {/* ── Dashboard Header ──────────────────────── */}
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <button className="refresh-btn" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Stat Cards ────────────────────────────── */}
      <div className="stat-cards">
        <div className="stat-card total">
          <div className="stat-card-header">
            <span className="stat-label">Total Stores</span>
            <div className="stat-icon">📊</div>
          </div>
          <div className="stat-value">{stats.total}</div>
        </div>

        <div className="stat-card deployed">
          <div className="stat-card-header">
            <span className="stat-label">Deployed</span>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-value">{stats.deployed}</div>
        </div>

        <div className="stat-card draft">
          <div className="stat-card-header">
            <span className="stat-label">Drafts</span>
            <div className="stat-icon">📝</div>
          </div>
          <div className="stat-value">{stats.draft}</div>
        </div>

        <div className="stat-card failed">
          <div className="stat-card-header">
            <span className="stat-label">Failed</span>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-value">{stats.failed}</div>
        </div>
      </div>

      {/* ── Stores Table ──────────────────────────── */}
      {stores.length > 0 ? (
        <div className="stores-table-container">
          <table className="stores-table">
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Status</th>
                <th>Template</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="store-name-cell">{store.name}</td>
                  <td>
                    <span className={`status-badge ${store.status}`}>
                      <span className="status-dot" />
                      {store.status}
                    </span>
                  </td>
                  <td>{store.template || 'Custom'}</td>
                  <td>{formatDate(store.created_at)}</td>
                  <td>
                    <button
                      className="btn-table-action"
                      onClick={() => onViewBlueprint(store)}
                    >
                      👁️ View Blueprint
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Empty State ──────────────────────────── */
        <div className="stores-table-container">
          <div className="empty-state">
            <div className="empty-icon">🏗️</div>
            <h3>No stores yet</h3>
            <p>Generate your first store blueprint above and it will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
