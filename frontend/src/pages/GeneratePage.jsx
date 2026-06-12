/**
 * GeneratePage.jsx — Store Generation Page
 * ==========================================
 * Redesigned with a hero-style layout:
 *   1. Eyebrow label + large heading
 *   2. Prominent prompt card with inline Generate CTA
 *   3. Quick-action template chip bar
 *   4. Recent prompts below
 */

import { useState, useRef, useEffect } from 'react';
import { generateBlueprint, deployStore } from '../api';
import BlueprintModal from '../BlueprintModal';
import { Sparkles, Wand2, Zap, Package, Leaf, Gem, Dumbbell } from 'lucide-react';
import './GeneratePage.css';

const TEMPLATES = [
  { name: 'Minimalist Jewelry', icon: Gem, prompt: 'A minimalist jewelry brand focusing on delicate, everyday gold and silver pieces. Target audience is women aged 25-40 who value understated elegance.' },
  { name: 'Fitness Tech', icon: Dumbbell, prompt: 'A fitness technology store selling smart workout equipment, wearable tech, and recovery tools. Target audience is tech-savvy athletes and gym enthusiasts.' },
  { name: 'Organic Tea', icon: Leaf, prompt: 'An organic tea company sourcing single-origin teas from family farms worldwide. Premium loose-leaf teas with eco-friendly packaging.' },
  { name: 'Quick Launch', icon: Zap, prompt: 'A modern e-commerce store with a clean, conversion-focused design. Fast shipping, great customer service, and a curated product selection.' },
  { name: 'Product Bundle', icon: Package, prompt: 'A bundle-focused store offering curated product sets at a discount. Perfect for gifting occasions with premium unboxing experience.' },
];



export default function GeneratePage() {
  const [prompt, setPrompt] = useState('');
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [blueprint, setBlueprint] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(28, ta.scrollHeight) + 'px';
  }, [prompt]);

  const handleTemplateClick = (template) => {
    if (activeTemplate === template.name) {
      setActiveTemplate(null);
      setPrompt('');
    } else {
      setActiveTemplate(template.name);
      setPrompt(template.prompt);
      textareaRef.current?.focus();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const data = await generateBlueprint(prompt.trim(), activeTemplate);
      setBlueprint(data.blueprint);
      setStoreId(data.store_id);
      setIsModalOpen(true);
    } catch (err) {
      setNotification({ type: 'error', message: `Generation failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleDeploy = async (blueprintData, id, shopifyConfig = null) => {
    setIsDeploying(true);
    try {
      const result = await deployStore(blueprintData, id, shopifyConfig);
      if (result.success) {
        setNotification({ type: 'success', message: result.message || 'Store deployed!' });
      } else {
        setNotification({ type: 'error', message: result.message || 'Deployment failed.' });
      }
      return result;           // ← wizard reads this
    } catch (err) {
      setNotification({ type: 'error', message: `Deployment failed: ${err.message}` });
      throw err;               // ← wizard catches this
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="gen-page">

      {/* ── Hero Header ── */}
      <div className="gen-hero">
        <span className="gen-eyebrow">
          <Sparkles size={12} />
          Powered by Gemini AI
        </span>
        <h1 className="gen-hero-title">
          Build your Shopify store<br />
          <span className="gen-hero-accent">from a single prompt</span>
        </h1>
        <p className="gen-hero-sub">
          Describe your vision and let AI architect the perfect store blueprint in seconds.
        </p>
      </div>

      {/* ── Notification ── */}
      {notification && (
        <div className={`gen-notification ${notification.type}`}>
          <span>{notification.type === 'success' ? '✅' : '❌'} {notification.message}</span>
          <button onClick={() => setNotification(null)} className="gen-notif-close">✕</button>
        </div>
      )}

      {/* ── Main Prompt Card ── */}
      <div className={`gen-card ${isFocused ? 'focused' : ''} ${isLoading ? 'loading' : ''}`}>
        {/* Card Top Row */}
        <div className="gen-card-top">
          <div className="gen-card-label">
            <Wand2 size={15} />
            <span>{activeTemplate ? activeTemplate : 'Describe your store'}</span>
          </div>
          <button
            className="gen-card-cta"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            id="generate-blueprint-btn"
          >
            {isLoading ? (
              <>
                <span className="gen-spinner" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate Blueprint
              </>
            )}
          </button>
        </div>

        {/* Card Input Row */}
        <div className="gen-card-input-row">
          <textarea
            ref={textareaRef}
            className="gen-textarea"
            placeholder="Got a vision? Describe your ideal Shopify store…"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (activeTemplate) setActiveTemplate(null);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={1000}
            rows={1}
          />
          <div className="gen-card-meta">
            <span className="gen-model-tag">
              Model <strong>Gemini 2.0 Flash</strong>
            </span>
            <span className={`gen-char-count${prompt.length >= 900 ? ' warn' : ''}`}>{prompt.length}/1000</span>
            <span className="gen-kbd-hint">Ctrl/⌘↵</span>
          </div>
        </div>

        {isLoading && (
          <div className="gen-loading-bar">
            <div className="gen-loading-fill" />
          </div>
        )}
      </div>

      {/* ── Template Chip Bar ── */}
      <div className="gen-chip-bar">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.name}
              className={`gen-chip ${activeTemplate === t.name ? 'active' : ''}`}
              onClick={() => handleTemplateClick(t)}
              disabled={isLoading}
              id={`template-${t.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon size={14} />
              {t.name}
            </button>
          );
        })}
        <span className="gen-chip-hint">Quick-start templates</span>
      </div>


      {/* ── Blueprint Modal ── */}
      {isModalOpen && (
        <BlueprintModal
          blueprint={blueprint}
          storeId={storeId}
          onDeploy={handleDeploy}
          onClose={() => setIsModalOpen(false)}
          isDeploying={isDeploying}
        />
      )}
    </div>
  );
}
