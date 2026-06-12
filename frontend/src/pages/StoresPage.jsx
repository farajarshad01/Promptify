/**
 * StoresPage.jsx — All Stores List
 * ==================================
 * Full table of all generated stores with blueprint modal.
 */

import { useState, useEffect, useCallback } from 'react';
import { getStores, deployStore } from '../api';
import BlueprintModal from '../BlueprintModal';
import { Store, RefreshCw, Eye, X } from 'lucide-react';
import './StoresPage.css';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notification, setNotification] = useState(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStores();
      setStores(data.stores || []);
    } catch (err) {
      console.warn('Could not fetch stores:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const filtered = filter === 'all' ? stores : stores.filter((s) => s.status === filter);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const handleView = (store) => {
    setBlueprint(store.json_config);
    setStoreId(store.id);
    setIsModalOpen(true);
  };

  const handleDeploy = async (bp, id) => {
    setIsDeploying(true);
    try {
      const result = await deployStore(bp, id);
      if (result.success) {
        setIsModalOpen(false);
        fetchStores();
        setNotification({ type: 'success', text: 'Store deployed to Shopify!' });
      } else {
        setNotification({ type: 'error', text: result.message || 'Deployment failed.' });
      }
    } catch (err) {
      setNotification({ type: 'error', text: `Deployment failed: ${err.message}` });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="stores-page">
      <div className="stores-page-header">
        <div>
          <h1>My Stores</h1>
          <p>All your generated store blueprints</p>
        </div>
        <button className="stores-refresh" onClick={fetchStores}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`stores-notification ${notification.type}`}>
          <span>{notification.type === 'success' ? '✅' : '❌'} {notification.text}</span>
          <button onClick={() => setNotification(null)} className="stores-notif-close"><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="stores-filters">
        {['all', 'draft', 'deployed', 'failed'].map((f) => (
          <button key={f} className={`stores-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="stores-filter-count">
              {f === 'all' ? stores.length : stores.filter((s) => s.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="stores-table-wrap">
        {loading ? (
          <div className="stores-loading">Loading...</div>
        ) : filtered.length > 0 ? (
          <table className="stores-tbl">
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
              {filtered.map((store) => (
                <tr key={store.id}>
                  <td>
                    <div className="stores-name-cell">
                      <div className="stores-avatar">{store.name?.[0]?.toUpperCase() || 'S'}</div>
                      <div>
                        <span className="stores-name">{store.name}</span>
                        <span className="stores-prompt">{store.prompt}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`dash-status-badge ${store.status}`}>{store.status}</span></td>
                  <td className="dash-td-muted">{store.template || 'Custom'}</td>
                  <td className="dash-td-muted">{formatDate(store.created_at)}</td>
                  <td>
                    <button className="dash-action-btn" onClick={() => handleView(store)}>
                      <Eye size={14} /> View Blueprint
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="dash-empty">
            <Store size={40} strokeWidth={1.5} />
            <h4>No stores found</h4>
            <p>{filter !== 'all' ? `No ${filter} stores.` : 'Generate your first store blueprint.'}</p>
            {filter !== 'all' && (
              <button className="dash-empty-btn" onClick={() => setFilter('all')}>
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <BlueprintModal blueprint={blueprint} storeId={storeId} onDeploy={handleDeploy} onClose={() => setIsModalOpen(false)} isDeploying={isDeploying} />
      )}
    </div>
  );
}
