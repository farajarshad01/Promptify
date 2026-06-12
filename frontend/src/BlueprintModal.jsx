/**
 * BlueprintModal.jsx — Store Blueprint Preview Modal
 * ====================================================
 * This modal appears after Gemini generates a blueprint.
 * It shows two views:
 *   1. Visual Summary — formatted cards for store name, products, etc.
 *   2. Raw JSON — the raw blueprint JSON for technical review.
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Store, 
  Palette, 
  Navigation, 
  Target, 
  Package, 
  Layers, 
  FileText, 
  Share2, 
  Search, 
  Rocket,
  Monitor,
  Smartphone,
  Eye,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Link2
} from 'lucide-react';
import { shopifyConnect, shopifyStatus, shopifyDisconnect } from './api';
import './BlueprintModal.css';

export default function BlueprintModal({ blueprint, storeId, onDeploy, onClose, isDeploying }) {
  const [activeTab, setActiveTab] = useState('visual');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showDeployWizard, setShowDeployWizard] = useState(false);
  const [shopifyUrl, setShopifyUrl] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [connectedShop, setConnectedShop] = useState('');
  const [oauthConfigured, setOauthConfigured] = useState(false);

  // Check Shopify connection status on mount
  useEffect(() => {
    shopifyStatus().then(data => {
      setShopifyConnected(data.connected);
      setConnectedShop(data.shop || '');
      setOauthConfigured(data.oauth_configured);
      if (data.connected && data.shop) setShopifyUrl(data.shop);
    }).catch(() => {});
  }, []);

  if (!blueprint) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-container ${activeTab === 'preview' ? 'preview-open' : ''}`}>
        {/* ── Header ────────────────────────────────── */}
        <div className="modal-header">
          <div className="modal-title">
            <Store size={22} color="#9DC183" />
            <h2>Store Blueprint</h2>
            <span className="badge">Preview</span>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────── */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            Visual Summary
          </button>
          <button
            className={`tab-btn tab-btn-preview ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={13} />
            Store Preview
          </button>
          <button
            className={`tab-btn ${activeTab === 'shopify' ? 'active' : ''}`}
            onClick={() => setActiveTab('shopify')}
          >
            Shopify Setup
          </button>
          <button
            className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            Raw JSON
          </button>
        </div>

        {/* ── Body ──────────────────────────────────── */}
        <div className={`modal-body ${activeTab === 'preview' ? 'modal-body-preview' : ''}`}>
          {activeTab === 'visual' ? (
            <VisualSummary blueprint={blueprint} />
          ) : activeTab === 'preview' ? (
            <StorePreview blueprint={blueprint} device={previewDevice} setDevice={setPreviewDevice} />
          ) : activeTab === 'shopify' ? (
            <ShopifySetup 
              url={shopifyUrl} 
              setUrl={setShopifyUrl} 
              token={shopifyToken} 
              setToken={setShopifyToken}
              connected={shopifyConnected}
              setConnected={setShopifyConnected}
              connectedShop={connectedShop}
              setConnectedShop={setConnectedShop}
              oauthConfigured={oauthConfigured}
            />
          ) : (
            <div className="json-viewer">
              <pre>{JSON.stringify(blueprint, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────── */}
        <div className="modal-footer">
          <span className="modal-footer-info">
            {activeTab === 'preview'
              ? `Previewing: ${blueprint.store_name || 'Your Store'}`
              : `${blueprint.products?.length || 0} products · ${blueprint.collections?.length || 0} collections`
            }
          </span>
          <div className="modal-footer-actions">
            <button className="btn-ghost" onClick={onClose}>
              Close
            </button>
            <button
              className="btn-deploy"
              onClick={() => setShowDeployWizard(true)}
            >
              <Rocket size={16} />
              Approve &amp; Deploy
            </button>
          </div>
        </div>

        {/* ── Deploy Wizard Overlay ── */}
        {showDeployWizard && (
          <DeployWizard
            blueprint={blueprint}
            storeId={storeId}
            onDeploy={onDeploy}
            onClose={() => setShowDeployWizard(false)}
            isDeploying={isDeploying}
            shopifyUrl={shopifyUrl}
            setShopifyUrl={setShopifyUrl}
            shopifyToken={shopifyToken}
            setShopifyToken={setShopifyToken}
            shopifyConnected={shopifyConnected}
            connectedShop={connectedShop}
            oauthConfigured={oauthConfigured}
          />
        )}
      </div>
    </div>
  );
}

function VisualSummary({ blueprint }) {
  const {
    store_name, tagline, description, theme,
    navbar, hero, products, collections,
    pages, social_media, footer, seo
  } = blueprint;

  return (
    <div className="summary-grid">
      {/* Store Identity */}
      <div className="summary-card">
        <div className="summary-card-title">
          <Store size={16} /> Store Identity
        </div>
        <div className="store-identity">
          <h3>{store_name || 'Untitled Store'}</h3>
          {tagline && <p className="tagline">"{tagline}"</p>}
          {description && <p className="description">{description}</p>}
        </div>
      </div>

      {/* Theme & Design */}
      {theme && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Palette size={16} /> Theme & Design
          </div>
          <div className="theme-colors">
            {['primary_color', 'secondary_color', 'accent_color'].map(key => theme[key] && (
              <div key={key} className="color-swatch">
                <div className="swatch" style={{ background: theme[key] }} />
                <span>{key.split('_')[0]}</span>
              </div>
            ))}
          </div>
          <div className="theme-fonts">
            {theme.font_heading && <span>Heading: <strong>{theme.font_heading}</strong></span>}
            {theme.font_body && <span>Body: <strong>{theme.font_body}</strong></span>}
          </div>
        </div>
      )}

      {/* Navigation */}
      {navbar && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Navigation size={16} /> Navigation
          </div>
          <p className="summary-meta-text">Logo: <strong>{navbar.logo_text}</strong></p>
          <div className="nav-links">
            {navbar.links?.map((link, i) => (
              <span key={i} className="nav-link-item">{link}</span>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      {hero && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Target size={16} /> Hero Section
          </div>
          <h3 className="summary-hero-title">{hero.headline}</h3>
          <p className="summary-hero-subtitle">{hero.subheadline}</p>
          <span className="summary-cta-pill">{hero.cta_text}</span>
        </div>
      )}

      {/* Products */}
      {products && products.length > 0 && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Package size={16} /> Products ({products.length})
          </div>
          <div className="products-grid">
            {products.map((product, i) => (
              <div key={i} className="product-item">
                <h4>{product.title}</h4>
                <div className="price">${product.price}</div>
                <div className="category">{product.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections */}
      {collections && collections.length > 0 && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Layers size={16} /> Collections ({collections.length})
          </div>
          <div className="collections-list">
            {collections.map((col, i) => (
              <div key={i} className="collection-item">
                <div>
                  <h4>{col.title}</h4>
                  <p>{col.description}</p>
                </div>
                <span className="collection-count">{col.product_count} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pages */}
      {pages && (
        <div className="summary-card">
          <div className="summary-card-title">
            <FileText size={16} /> Pages
          </div>
          <div className="collections-list">
            {['about', 'contact'].map(key => pages[key] && (
              <div key={key} className="collection-item">
                <div>
                  <h4>{pages[key].title || key}</h4>
                  <p>{key === 'contact' ? `${pages[key].email} · ${pages[key].phone}` : pages[key].content?.substring(0, 80) + '...'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Media */}
      {social_media && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Share2 size={16} /> Social Media
          </div>
          <div className="socials-grid">
            {Object.entries(social_media).map(([platform, handle]) => handle && (
              <span key={platform} className="social-item">{platform}: {handle}</span>
            ))}
          </div>
        </div>
      )}

      {/* SEO */}
      {seo && (
        <div className="summary-card">
          <div className="summary-card-title">
            <Search size={16} /> SEO
          </div>
          <p className="summary-meta-text"><strong>Title:</strong> {seo.meta_title}</p>
          <p className="summary-meta-text"><strong>Desc:</strong> {seo.meta_description}</p>
        </div>
      )}
    </div>
  );
}

function ShopifySetup({ url, setUrl, token, setToken, connected, setConnected, connectedShop, setConnectedShop, oauthConfigured }) {
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [storeInput, setStoreInput] = useState('');

  const handleConnect = async () => {
    const shop = storeInput.trim();
    if (!shop) return;
    setConnectLoading(true);
    setConnectError('');
    try {
      const data = await shopifyConnect(shop);
      if (data.auth_url) {
        // Open Shopify auth in a popup
        const w = 600, h = 700;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top = window.screenY + (window.outerHeight - h) / 2;
        const popup = window.open(data.auth_url, 'shopify_oauth', `width=${w},height=${h},left=${left},top=${top}`);

        // Poll for popup close (callback redirects & closes it)
        const poll = setInterval(async () => {
          if (!popup || popup.closed) {
            clearInterval(poll);
            setConnectLoading(false);
            // Re-check connection status
            try {
              const status = await shopifyStatus();
              setConnected(status.connected);
              setConnectedShop(status.shop || '');
              if (status.connected && status.shop) setUrl(status.shop);
            } catch {}
          }
        }, 500);
      }
    } catch (err) {
      setConnectError(err.message || 'Failed to connect');
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await shopifyDisconnect();
      setConnected(false);
      setConnectedShop('');
      setUrl('');
      setToken('');
    } catch {}
  };

  return (
    <div className="shopify-setup">
      <div className="setup-header">
        <Rocket size={32} color="#9DC183" />
        <h3>Shopify Connection</h3>
        <p>Connect your Shopify store to deploy blueprints with one click.</p>
      </div>

      {connected ? (
        /* ── Connected State ── */
        <div className="setup-connected">
          <div className="setup-connected-badge">
            <CheckCircle size={24} color="#10b981" />
            <div>
              <strong>Store Connected</strong>
              <span className="setup-connected-shop">{connectedShop}</span>
            </div>
          </div>
          <p className="setup-connected-info">
            Your store is linked — you can deploy blueprints directly from the Deploy wizard without entering any credentials.
          </p>
          <button className="setup-disconnect-btn" onClick={handleDisconnect}>
            Disconnect Store
          </button>
        </div>
      ) : oauthConfigured ? (
        /* ── OAuth Connect Form ── */
        <div className="setup-form">
          <div className="setup-field">
            <label>Your Shopify Store Name</label>
            <div className="setup-input-wrap">
              <Store size={18} />
              <input
                type="text"
                placeholder="my-store-name"
                value={storeInput}
                onChange={(e) => setStoreInput(e.target.value)}
              />
              <span className="setup-domain-suffix">.myshopify.com</span>
            </div>
            <small>Enter just the store name — we'll handle the rest.</small>
          </div>

          {connectError && (
            <div className="setup-error">
              <AlertCircle size={14} /> {connectError}
            </div>
          )}

          <button
            className="setup-connect-btn"
            onClick={handleConnect}
            disabled={!storeInput.trim() || connectLoading}
          >
            {connectLoading ? (
              <><span className="spinner" /> Connecting…</>
            ) : (
              <><ExternalLink size={15} /> Connect with Shopify</>
            )}
          </button>

          <div className="setup-info-box">
            <ShieldCheck size={14} color="#10b981" />
            <span>You'll be redirected to Shopify to authorize Promptify. Your credentials are never stored by us — Shopify handles authentication securely.</span>
          </div>
        </div>
      ) : (
        /* ── Fallback: Manual Token Entry (when OAuth not configured) ── */
        <div className="setup-form">
          <div className="setup-warning">
            <p><strong>OAuth not configured.</strong> Ask your admin to add Shopify API credentials. Meanwhile, you can enter credentials manually:</p>
          </div>
          <div className="setup-field">
            <label>Shopify Store URL</label>
            <div className="setup-input-wrap">
              <Store size={18} />
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="setup-field">
            <label>Admin Access Token</label>
            <div className="setup-input-wrap">
              <Link2 size={18} />
              <input
                type="password"
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Deploy Wizard ──────────────────────────────────────────────

function DeployWizard({ blueprint, storeId, onDeploy, onClose, isDeploying,
  shopifyUrl, setShopifyUrl, shopifyToken, setShopifyToken,
  shopifyConnected, connectedShop, oauthConfigured }) {

  const [showToken, setShowToken]   = useState(false);
  const [status, setStatus]         = useState('idle'); // idle | deploying | success | error
  const [errorMsg, setErrorMsg]     = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [step, setStep]             = useState(0); // progress step index

  const STEPS = [
    'Connecting to Shopify…',
    'Uploading theme settings…',
    'Creating products…',
    'Building collections…',
    'Finalising store…',
  ];

  // Determine the effective store URL for deploy
  const effectiveUrl = shopifyConnected ? connectedShop : shopifyUrl;

  const handleDeploy = async () => {
    if (!effectiveUrl.trim()) return;
    setStatus('deploying');
    setStep(0);

    // Animate steps while waiting for actual deploy
    const interval = setInterval(() => {
      setStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 900);

    try {
      // When OAuth is connected, don't send token — backend uses stored one
      const config = shopifyConnected
        ? { url: effectiveUrl, token: null }
        : { url: shopifyUrl, token: shopifyToken };
      const result = await onDeploy(blueprint, storeId, config);
      clearInterval(interval);
      setStep(STEPS.length - 1);
      if (result?.success === false) {
        setStatus('error');
        setErrorMsg(result.message || 'Deployment failed.');
      } else {
        setDeployedUrl(`https://${effectiveUrl.replace(/^https?:\/\//, '')}`);
        setStatus('success');
      }
    } catch (err) {
      clearInterval(interval);
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="dw-overlay">
      <div className="dw-panel">

        {/* ── Header ── */}
        <div className="dw-header">
          {status === 'idle' && (
            <button className="dw-back" onClick={onClose} title="Back">
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div className="dw-header-center">
            {status === 'success' ? (
              <CheckCircle size={28} color="#10b981" />
            ) : status === 'error' ? (
              <AlertCircle size={28} color="#ef4444" />
            ) : (
              <div className="dw-rocket-icon"><Rocket size={22} /></div>
            )}
            <div>
              <h3 className="dw-title">
                {status === 'success' ? 'Store Deployed!' : status === 'error' ? 'Deployment Failed' : 'Deploy to Shopify'}
              </h3>
              <p className="dw-subtitle">
                {status === 'success'
                  ? `${blueprint.store_name} is live on Shopify`
                  : status === 'error'
                  ? 'Something went wrong — check details below'
                  : shopifyConnected
                  ? `Deploying to ${connectedShop}`
                  : 'Enter your Shopify store details to go live'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body: idle ── */}
        {status === 'idle' && (
          <div className="dw-body">
            {shopifyConnected ? (
              /* OAuth connected — streamlined deploy */
              <>
                <div className="dw-info-row dw-connected-row">
                  <CheckCircle size={14} color="#10b981" />
                  <span>Connected to <strong>{connectedShop}</strong> — ready to deploy.</span>
                </div>

                <div className="dw-steps-preview">
                  {STEPS.map((s, i) => (
                    <div key={i} className="dw-step-item">
                      <span className="dw-step-dot" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : oauthConfigured ? (
              /* OAuth configured but not connected */
              <>
                <div className="dw-info-row">
                  <ShieldCheck size={14} color="#10b981" />
                  <span>Please connect your Shopify store first. Close this wizard and go to the <strong>Shopify Setup</strong> tab to connect seamlessly via OAuth.</span>
                </div>
              </>
            ) : (
              /* Manual fallback — show URL + token fields */
              <>
                <div className="dw-info-row">
                  <ShieldCheck size={14} color="#10b981" />
                  <span>Your credentials are sent directly to Shopify and never stored by Promptify.</span>
                </div>

                <div className="dw-field">
                  <label className="dw-label">
                    <Store size={13} />  Shopify Store URL
                  </label>
                  <div className={`dw-input-wrap ${shopifyUrl ? 'has-value' : ''}`}>
                    <span className="dw-input-prefix">https://</span>
                    <input
                      type="text"
                      placeholder="your-store.myshopify.com"
                      value={shopifyUrl}
                      onChange={e => setShopifyUrl(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <small className="dw-hint">Find this in Shopify Admin → Settings → Domains</small>
                </div>

                <div className="dw-field">
                  <label className="dw-label">
                    <Link2 size={13} /> Admin API Access Token
                  </label>
                  <div className={`dw-input-wrap ${shopifyToken ? 'has-value' : ''}`}>
                    <input
                      type={showToken ? 'text' : 'password'}
                      placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={shopifyToken}
                      onChange={e => setShopifyToken(e.target.value)}
                    />
                    <button className="dw-show-token" onClick={() => setShowToken(v => !v)}>
                      {showToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <small className="dw-hint">
                    Shopify Admin → Settings → Apps and sales channels → Develop apps
                  </small>
                </div>

                <div className="dw-steps-preview">
                  {STEPS.map((s, i) => (
                    <div key={i} className="dw-step-item">
                      <span className="dw-step-dot" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Body: deploying ── */}
        {status === 'deploying' && (
          <div className="dw-body dw-body-deploying">
            <div className="dw-deploy-animation">
              <div className="dw-rocket-fly">🚀</div>
            </div>
            <div className="dw-progress-steps">
              {STEPS.map((s, i) => (
                <div key={i} className={`dw-prog-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  <div className="dw-prog-dot">
                    {i < step ? <CheckCircle size={14} color="#10b981" /> : null}
                  </div>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Body: success ── */}
        {status === 'success' && (
          <div className="dw-body dw-body-result">
            <div className="dw-success-badge">🎉</div>
            <p className="dw-result-text">Your store is live and ready to sell.</p>
            {deployedUrl && (
              <a className="dw-store-link" href={deployedUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                {deployedUrl}
              </a>
            )}
          </div>
        )}

        {/* ── Body: error ── */}
        {status === 'error' && (
          <div className="dw-body dw-body-result">
            <div className="dw-error-badge">⚠️</div>
            <p className="dw-result-text">{errorMsg}</p>
            <button className="dw-retry-btn" onClick={() => setStatus('idle')}>
              <ArrowLeft size={14} /> Try Again
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="dw-footer">
          {status === 'idle' && (
            <>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn-deploy dw-cta"
                disabled={!effectiveUrl.trim()}
                onClick={handleDeploy}
              >
                <Rocket size={15} />
                {shopifyConnected ? 'Deploy Now' : 'Connect & Deploy'}
              </button>
            </>
          )}
          {status === 'deploying' && (
            <span className="dw-deploying-label">
              <span className="spinner" /> Deploying — please wait…
            </span>
          )}
          {(status === 'success' || status === 'error') && (
            <button className="btn-deploy" onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Store Preview Component ────────────────────────────────────

const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Outfit',
  'Open Sans',
  'Lato',
  'Raleway',
  'Playfair Display',
  'Cormorant Garamond',
  'Lora',
  'Merriweather',
  'Oswald',
  'Pacifico',
  'Fredoka',
  'Caveat'
];

function StorePreview({ blueprint, device, setDevice }) {
  const initTheme = blueprint.theme || {};
  const [colors, setColors] = useState({
    primary:   initTheme.primary_color   || '#6EA451',
    secondary: initTheme.secondary_color || '#ffffff',
    accent:    initTheme.accent_color    || '#f8faf7',
  });

  const [fonts, setFonts] = useState({
    heading: initTheme.font_heading || 'Inter',
    body:    initTheme.font_body    || 'Inter',
  });

  const doc = useMemo(
    () => buildStoreHTML(blueprint, colors, fonts),
    [blueprint, colors, fonts]
  );

  const setColor = (key) => (e) =>
    setColors(prev => ({ ...prev, [key]: e.target.value }));

  const handleReset = () => {
    setColors({
      primary:   initTheme.primary_color   || '#6EA451',
      secondary: initTheme.secondary_color || '#ffffff',
      accent:    initTheme.accent_color    || '#f8faf7',
    });
    setFonts({
      heading: initTheme.font_heading || 'Inter',
      body:    initTheme.font_body    || 'Inter',
    });
  };

  return (
    <div className="preview-pane">
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="preview-controls-group">
          {/* Color pickers */}
          <div className="preview-color-row">
            <span className="preview-toolbar-label">Colors</span>
            {[
              { key: 'primary',   label: 'Primary'   },
              { key: 'secondary', label: 'Secondary' },
              { key: 'accent',    label: 'Accent'    },
            ].map(({ key, label }) => (
              <label key={key} className="preview-color-picker" title={`Change ${label} color`}>
                <span className="preview-color-swatch" style={{ background: colors[key] }} />
                <span className="preview-color-label">{label}</span>
                <input
                  type="color"
                  value={colors[key]}
                  onChange={setColor(key)}
                  className="preview-color-input"
                />
              </label>
            ))}
          </div>

          {/* Font selectors */}
          <div className="preview-font-row">
            <span className="preview-toolbar-label">Fonts</span>
            <div className="preview-font-selectors">
              <div className="preview-font-select-wrap">
                <span className="preview-font-field-label">Heading</span>
                <select
                  value={fonts.heading}
                  onChange={(e) => setFonts(prev => ({ ...prev, heading: e.target.value }))}
                  className="preview-font-select"
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="preview-font-select-wrap">
                <span className="preview-font-field-label">Body</span>
                <select
                  value={fonts.body}
                  onChange={(e) => setFonts(prev => ({ ...prev, body: e.target.value }))}
                  className="preview-font-select"
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            className="preview-reset-btn"
            onClick={handleReset}
            title="Reset to AI-generated colors &amp; fonts"
          >
            Reset
          </button>
        </div>

        {/* Device toggle */}
        <div className="preview-device-toggle">
          <button
            className={`preview-device-btn ${device === 'desktop' ? 'active' : ''}`}
            onClick={() => setDevice('desktop')}
            title="Desktop view"
          >
            <Monitor size={15} />
            Desktop
          </button>
          <button
            className={`preview-device-btn ${device === 'mobile' ? 'active' : ''}`}
            onClick={() => setDevice('mobile')}
            title="Mobile view"
          >
            <Smartphone size={15} />
            Mobile
          </button>
        </div>
      </div>

      {/* Frame wrapper */}
      <div className={`preview-frame-wrap ${device}`}>
        <div className="preview-browser-chrome">
          <div className="preview-chrome-dots">
            <span /><span /><span />
          </div>
          <div className="preview-chrome-url">
            {blueprint.store_name?.toLowerCase().replace(/\s+/g, '-') || 'your-store'}.myshopify.com
          </div>
        </div>
        <iframe
          className="preview-iframe"
          srcDoc={doc}
          sandbox="allow-same-origin"
          title="Store Preview"
        />
      </div>
    </div>
  );
}

function buildStoreHTML(bp, colors = {}, fonts = {}) {
  const theme = bp.theme || {};
  const primary   = colors.primary   || theme.primary_color   || '#6EA451';
  const secondary = colors.secondary || theme.secondary_color || '#ffffff';
  const accent    = colors.accent    || theme.accent_color    || '#f8faf7';
  const fontHead  = fonts.heading    || theme.font_heading    || 'Inter';
  const fontBody  = fonts.body       || theme.font_body       || 'Inter';

  const navbar  = bp.navbar  || {};
  const hero    = bp.hero    || {};
  const footer  = bp.footer  || {};
  const products   = bp.products    || [];
  const collections = bp.collections || [];

  const navLinks = (navbar.links || ['Shop', 'About', 'Contact'])
    .map(l => `<a href="#">${l}</a>`).join('');

  const productCards = products.slice(0, 4).map(p => `
    <div class="prod-card">
      <div class="prod-img" style="background:${accent}">
        <div class="prod-img-icon">🛍</div>
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.title || 'Product'}</div>
        <div class="prod-cat">${p.category || ''}</div>
        <div class="prod-price">$${p.price || '0.00'}</div>
        <button class="prod-btn">Add to Cart</button>
      </div>
    </div>`).join('');

  const collectionPills = collections.map(c => `
    <div class="col-pill">
      <div class="col-pill-name">${c.title}</div>
      <div class="col-pill-count">${c.product_count || 0} items</div>
    </div>`).join('');

  const footerLinks = (footer.links || []).map(l => `<a href="#">${l}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontHead)}:wght@400;700;800&family=${encodeURIComponent(fontBody)}:wght@400;500&display=swap" rel="stylesheet"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: '${fontBody}', sans-serif; background: #fff; color: #111; }
  a { text-decoration: none; color: inherit; }

  /* NAVBAR */
  nav { display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 62px; background: ${secondary}; border-bottom: 1px solid #e5e7eb;
    position: sticky; top: 0; z-index: 100; }
  .nav-logo { font-family: '${fontHead}', sans-serif; font-size: 1.2rem; font-weight: 800;
    color: ${primary}; letter-spacing: -0.02em; }
  .nav-links { display: flex; gap: 28px; font-size: 0.875rem; font-weight: 500; color: #374151; }
  .nav-links a:hover { color: ${primary}; }
  .nav-cta { padding: 8px 20px; background: ${primary}; color: #fff; border-radius: 8px;
    font-size: 0.8125rem; font-weight: 700; cursor: pointer; border: none; }

  /* HERO */
  .hero { padding: 80px 40px; background: ${accent}; text-align: center; }
  .hero h1 { font-family: '${fontHead}', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800; color: #111; line-height: 1.15; margin-bottom: 16px; }
  .hero p { font-size: 1.0625rem; color: #6b7280; max-width: 560px; margin: 0 auto 32px; line-height: 1.6; }
  .hero-btn { display: inline-block; padding: 14px 36px; background: ${primary};
    color: #fff; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer;
    border: none; transition: opacity 0.15s; }
  .hero-btn:hover { opacity: 0.88; }

  /* COLLECTIONS */
  .section { padding: 56px 40px; }
  .section-title { font-family: '${fontHead}', sans-serif; font-size: 1.5rem; font-weight: 800;
    margin-bottom: 24px; color: #111; }
  .collections-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .col-pill { flex: 1; min-width: 160px; padding: 20px; background: ${accent};
    border: 1.5px solid #e5e7eb; border-radius: 14px; cursor: pointer; transition: border-color 0.15s; }
  .col-pill:hover { border-color: ${primary}; }
  .col-pill-name { font-weight: 700; font-size: 0.9375rem; color: #111; margin-bottom: 4px; }
  .col-pill-count { font-size: 0.75rem; color: #6b7280; }

  /* PRODUCTS */
  .products-section { padding: 0 40px 56px; }
  .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
  .prod-card { border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;
    transition: box-shadow 0.2s, transform 0.2s; }
  .prod-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.08); transform: translateY(-3px); }
  .prod-img { height: 160px; display: flex; align-items: center; justify-content: center; }
  .prod-img-icon { font-size: 3rem; opacity: 0.6; }
  .prod-info { padding: 16px; }
  .prod-name { font-weight: 700; font-size: 0.9375rem; color: #111; margin-bottom: 4px; }
  .prod-cat { font-size: 0.75rem; color: #9ca3af; margin-bottom: 8px; }
  .prod-price { font-size: 1.125rem; font-weight: 800; color: ${primary}; margin-bottom: 12px; }
  .prod-btn { width: 100%; padding: 9px; background: ${primary}; color: #fff;
    border: none; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; }

  /* FOOTER */
  footer { background: #111; color: #e5e7eb; padding: 48px 40px; }
  .footer-inner { display: flex; justify-content: space-between; align-items: flex-start;
    gap: 32px; flex-wrap: wrap; margin-bottom: 32px; }
  .footer-brand { font-family: '${fontHead}', sans-serif; font-size: 1.25rem;
    font-weight: 800; color: ${primary}; margin-bottom: 8px; }
  .footer-tagline { font-size: 0.8125rem; color: #9ca3af; max-width: 260px; line-height: 1.6; }
  .footer-newsletter h4 { font-size: 0.875rem; font-weight: 700; color: #f9fafb; margin-bottom: 12px; }
  .footer-newsletter-row { display: flex; gap: 8px; }
  .footer-newsletter input { flex: 1; padding: 9px 14px; border-radius: 8px; border: none;
    background: #1f2937; color: #f9fafb; font-size: 0.8125rem; outline: none; }
  .footer-newsletter button { padding: 9px 18px; background: ${primary}; color: #fff;
    border: none; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; }
  .footer-links { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
  .footer-links a { font-size: 0.75rem; color: #6b7280; }
  .footer-links a:hover { color: ${primary}; }
  .footer-copy { font-size: 0.75rem; color: #4b5563; border-top: 1px solid #1f2937; padding-top: 24px; }
</style>
</head>
<body>

<nav>
  <div class="nav-logo">${navbar.logo_text || bp.store_name || 'Store'}</div>
  <div class="nav-links">${navLinks}</div>
  <button class="nav-cta">${hero.cta_text || 'Shop Now'}</button>
</nav>

<section class="hero">
  <h1>${hero.headline || bp.store_name || 'Welcome'}</h1>
  <p>${hero.subheadline || bp.tagline || ''}</p>
  <button class="hero-btn">${hero.cta_text || 'Shop Now'}</button>
</section>

${collections.length > 0 ? `
<section class="section">
  <div class="section-title">Collections</div>
  <div class="collections-row">${collectionPills}</div>
</section>` : ''}

${products.length > 0 ? `
<section class="products-section">
  <div class="section-title" style="padding-bottom:0">Featured Products</div>
  <div style="height:24px"></div>
  <div class="products-grid">${productCards}</div>
</section>` : ''}

<footer>
  <div class="footer-inner">
    <div>
      <div class="footer-brand">${navbar.logo_text || bp.store_name || 'Store'}</div>
      <div class="footer-tagline">${bp.tagline || ''}</div>
    </div>
    ${footer.newsletter_cta ? `
    <div class="footer-newsletter">
      <h4>${footer.newsletter_cta}</h4>
      <div class="footer-newsletter-row">
        <input type="email" placeholder="your@email.com" />
        <button>Subscribe</button>
      </div>
    </div>` : ''}
  </div>
  <div class="footer-links">${footerLinks}</div>
  <div class="footer-copy">${footer.copyright || ''}</div>
</footer>

</body>
</html>`;
}
