/**
 * DashboardPage.jsx — Main Dashboard Overview
 * ==============================================
 * Shows stat cards, generation overview chart,
 * and recent stores table.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStores } from '../api';
import {
  ShoppingBag,
  CheckCircle2,
  FileText,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Eye,
  Activity,
} from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStores = useCallback(async () => {
    try {
      const data = await getStores();
      setStores(data.stores || []);
    } catch (err) {
      console.warn('Could not fetch stores:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // ── Calculate stats ──────────────────────────────────────────
  const stats = {
    total: stores.length,
    deployed: stores.filter((s) => s.status === 'deployed').length,
    draft: stores.filter((s) => s.status === 'draft').length,
    failed: stores.filter((s) => s.status === 'failed').length,
  };

  const successRate = stats.total > 0 
    ? Math.round((stats.deployed / stats.total) * 100) 
    : 0;

  // ── Bar chart data — last 7 days from real stores ────────────
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartBars = (() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dayStr = d.toDateString();
      const dayStores = stores.filter((s) => {
        if (!s.created_at) return false;
        return new Date(s.created_at).toDateString() === dayStr;
      });
      return {
        label: DAY_LABELS[d.getDay()],
        draft: dayStores.filter((s) => s.status === 'draft').length,
        deployed: dayStores.filter((s) => s.status === 'deployed').length,
      };
    });
  })();
  const maxBarValue = Math.max(...chartBars.map((b) => b.draft + b.deployed), 1);
  const hasChartData = chartBars.some((b) => b.draft + b.deployed > 0);

  // ── Format date ──────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const recentStores = stores.slice(0, 5);

  return (
    <div className="dash-page">
      {/* ── Page Title ──────────────────────────── */}
      <div className="dash-page-header">
        <div>
          <h1>Overview</h1>
          <p>Welcome back! Here's your store generation summary.</p>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────── */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-top">
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats.total}</span>
              <span className="dash-stat-label">Total Stores</span>
            </div>
            <div className="dash-stat-icon total">
              <ShoppingBag size={22} />
            </div>
          </div>
          <div className="dash-stat-trend up">
            <TrendingUp size={14} />
            <span>Lifetime total</span>
          </div>
        </div>

        <div className="dash-stat-card highlight">
          <div className="dash-stat-top">
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats.deployed}</span>
              <span className="dash-stat-label">Deployed</span>
            </div>
            <div className="dash-stat-icon deployed">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="dash-stat-trend up">
            <ArrowUpRight size={14} />
            <span>Active on Shopify</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-top">
            <div className="dash-stat-info">
              <span className="dash-stat-value">{successRate}%</span>
              <span className="dash-stat-label">Success Rate</span>
            </div>
            <div className="dash-stat-icon rate">
              <Activity size={22} />
            </div>
          </div>
          <div className="dash-stat-trend up">
            <TrendingUp size={14} />
            <span>Deployment health</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-top">
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats.failed}</span>
              <span className="dash-stat-label">Failed</span>
            </div>
            <div className="dash-stat-icon failed">
              <AlertTriangle size={22} />
            </div>
          </div>
          <div className="dash-stat-trend neutral">
            <span>Needs attention</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────── */}
      <div className="dash-charts-row">
        {/* Bar Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <h3>Generation Overview</h3>
            <span className="dash-chart-period">Last 7 Days</span>
          </div>
          <div className="dash-chart-legend">
            <span className="dash-legend-item">
              <span className="dash-legend-dot draft" />
              Drafts
            </span>
            <span className="dash-legend-item">
              <span className="dash-legend-dot deployed" />
              Deployed
            </span>
          </div>
          {hasChartData ? (
            <div className="dash-bar-chart">
              {chartBars.map((bar, i) => (
                <div key={i} className="dash-bar-group">
                  <div className="dash-bar-stack">
                    <div
                      className="dash-bar deployed"
                      style={{ height: `${(bar.deployed / maxBarValue) * 100}%` }}
                    />
                    <div
                      className="dash-bar draft"
                      style={{ height: `${(bar.draft / maxBarValue) * 100}%` }}
                    />
                  </div>
                  <span className="dash-bar-label">{bar.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-chart-empty">
              <Activity size={28} strokeWidth={1.5} />
              <p>Generate stores to see activity here</p>
            </div>
          )}
        </div>

        {/* Status Summary (Donut-style) */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <h3>Store Distribution</h3>
            <span className="dash-chart-period">All Time</span>
          </div>
          <div className="dash-donut-container">
            <div className="dash-donut">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e8ede3" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="#9DC183" strokeWidth="12"
                  strokeDasharray={`${(stats.deployed / Math.max(stats.total, 1)) * 314} 314`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="dash-donut-segment"
                />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="#fbbf24" strokeWidth="12"
                  strokeDasharray={`${(stats.draft / Math.max(stats.total, 1)) * 314} 314`}
                  strokeDashoffset={`-${(stats.deployed / Math.max(stats.total, 1)) * 314}`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="dash-donut-segment"
                />
              </svg>
              <div className="dash-donut-center">
                <span className="dash-donut-total">{stats.total}</span>
                <span className="dash-donut-label">Total</span>
              </div>
            </div>
            <div className="dash-donut-legend">
              <div className="dash-donut-legend-item">
                <span className="dash-legend-dot deployed" />
                <span>{stats.deployed} Deployed</span>
              </div>
              <div className="dash-donut-legend-item">
                <span className="dash-legend-dot draft" />
                <span>{stats.draft} Drafts</span>
              </div>
              <div className="dash-donut-legend-item">
                <span className="dash-legend-dot failed" />
                <span>{stats.failed} Failed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Stores Table ─────────────────── */}
      <div className="dash-table-card">
        <div className="dash-table-header">
          <h3>Recent Stores</h3>
          <button className="dash-view-all" onClick={() => navigate('/stores')}>
            View All
            <ArrowUpRight size={14} />
          </button>
        </div>
        {loading ? (
          <div className="dash-table-loading">Loading stores...</div>
        ) : recentStores.length > 0 ? (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Template</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentStores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <div className="dash-store-name">
                      <div className="dash-store-avatar">
                        {store.name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <span>{store.name}</span>
                    </div>
                  </td>
                  <td className="dash-td-muted">{store.template || 'Custom'}</td>
                  <td>
                    <span className={`dash-status-badge ${store.status}`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="dash-td-muted">{formatDate(store.created_at)}</td>
                  <td>
                    <button
                      className="dash-action-btn"
                      onClick={() => navigate('/stores')}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="dash-empty">
            <ShoppingBag size={40} strokeWidth={1.5} />
            <h4>No stores yet</h4>
            <p>Generate your first store to see it here.</p>
            <button className="dash-empty-btn" onClick={() => navigate('/generate')}>
              Generate Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
