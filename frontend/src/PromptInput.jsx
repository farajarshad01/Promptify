/**
 * PromptInput.jsx — Store Prompt Input Component
 * ================================================
 * This component lets users either:
 * 1. Select a "Quick Start Template" chip (Jewelry, Fitness, Tea)
 * 2. Type a custom store description in the textarea
 *
 * It also shows the user's last 5 prompts from localStorage.
 */

import { useState, useEffect } from 'react';
import './PromptInput.css';

// ── Template Definitions ──────────────────────────────────────
// Each template has a name, icon, and a pre-written prompt.
const TEMPLATES = [
  {
    name: 'Minimalist Jewelry',
    icon: '💎',
    prompt: 'A minimalist jewelry brand focusing on delicate, everyday gold and silver pieces. Target audience is women aged 25-40 who value understated elegance.',
  },
  {
    name: 'Fitness Tech',
    icon: '🏋️',
    prompt: 'A fitness technology store selling smart workout equipment, wearable tech, and recovery tools. Target audience is tech-savvy athletes and gym enthusiasts.',
  },
  {
    name: 'Organic Tea',
    icon: '🍵',
    prompt: 'An organic tea company sourcing single-origin teas from family farms worldwide. Premium loose-leaf teas with eco-friendly packaging.',
  },
];

// localStorage key for storing recent prompts
const RECENT_KEY = 'promptify_recent';

/**
 * Load recent prompts from localStorage.
 * Returns an array of the last 5 prompt strings.
 */
function loadRecentPrompts() {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new prompt to the recent list in localStorage.
 * Keeps only the last 5 unique prompts.
 */
export function saveRecentPrompt(prompt) {
  try {
    let recents = loadRecentPrompts();
    // Remove duplicate if it exists
    recents = recents.filter((p) => p !== prompt);
    // Add new prompt to the beginning
    recents.unshift(prompt);
    // Keep only last 5
    recents = recents.slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
  } catch {
    // localStorage might be full — fail silently
  }
}

export default function PromptInput({ onGenerate, isLoading }) {
  // The current text in the textarea
  const [prompt, setPrompt] = useState('');
  // Which template chip is currently selected (null = none)
  const [activeTemplate, setActiveTemplate] = useState(null);
  // Recent prompts loaded from localStorage
  const [recentPrompts, setRecentPrompts] = useState([]);

  // Load recent prompts when the component first renders
  useEffect(() => {
    setRecentPrompts(loadRecentPrompts());
  }, []);

  /**
   * Handle clicking a template chip.
   * Fills the textarea with the template's pre-written prompt.
   */
  const handleTemplateClick = (template) => {
    // Toggle: if already selected, deselect
    if (activeTemplate === template.name) {
      setActiveTemplate(null);
      setPrompt('');
    } else {
      setActiveTemplate(template.name);
      setPrompt(template.prompt);
    }
  };

  /**
   * Handle the "Generate Blueprint" button click.
   * Passes the prompt and template name to the parent component.
   */
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt.trim(), activeTemplate);
  };

  /**
   * Handle clicking a recent prompt.
   * Fills the textarea with that prompt.
   */
  const handleRecentClick = (recentPrompt) => {
    setPrompt(recentPrompt);
    setActiveTemplate(null);
  };

  return (
    <div className="prompt-section">
      {/* Section Title */}
      <div className="section-header">
        <h2>Create Your Store</h2>
        <p>Choose a template or describe your dream store below</p>
      </div>

      {/* Template Chips */}
      <div className="template-chips">
        <span className="chip-label">Quick Start:</span>
        {TEMPLATES.map((template) => (
          <button
            key={template.name}
            className={`chip ${activeTemplate === template.name ? 'active' : ''}`}
            onClick={() => handleTemplateClick(template)}
            disabled={isLoading}
          >
            <span className="chip-icon">{template.icon}</span>
            {template.name}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="input-area">
        <textarea
          className="prompt-textarea"
          placeholder="Describe your ideal Shopify store... e.g., 'A sustainable fashion brand for young professionals with earth-tone aesthetics and eco-friendly packaging'"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            // Clear template selection when user types manually
            if (activeTemplate) setActiveTemplate(null);
          }}
          disabled={isLoading}
          maxLength={1000}
        />
        <span className="char-count">{prompt.length}/1000</span>
      </div>

      {/* Generate Button */}
      <div className="generate-actions">
        <button
          className="btn-generate"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Generating...
            </>
          ) : (
            <>
              <span className="btn-icon">✨</span>
              Generate Blueprint
            </>
          )}
        </button>
        {isLoading && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            AI is crafting your store blueprint...
          </span>
        )}
      </div>

      {/* Recent Prompts */}
      {recentPrompts.length > 0 && (
        <div className="recent-prompts">
          <h3>Recent Activity</h3>
          <div className="recent-list">
            {recentPrompts.map((rp, idx) => (
              <button
                key={idx}
                className="recent-item"
                onClick={() => handleRecentClick(rp)}
                disabled={isLoading}
              >
                <span className="recent-icon">🕐</span>
                <span className="recent-text">{rp}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
