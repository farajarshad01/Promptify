/**
 * api.js — Frontend API Client
 * =============================
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('promptify_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (headers['Content-Type'] === undefined) {
    delete headers['Content-Type'];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `HTTP Error ${response.status}`);
      }
      return text;
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        // Clear token on unauthorized
        localStorage.removeItem('promptify_token');
        localStorage.removeItem('promptify_user');
        // We don't throw here so we can return the error message from the server
      }
      throw new Error(data.detail || data.message || `API request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
    
    // If it's a 401, we want to force a reload or redirect eventually, 
    // but for now just clearing the storage is a good start.
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      localStorage.removeItem('promptify_token');
      localStorage.removeItem('promptify_user');
    }

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Unable to connect to the server. Please ensure the backend is running on http://127.0.0.1:8000');
    }
    throw error;
  }
}

// ── Auth Endpoints ────────────────────────────────────────────

export async function authLogin(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function authSocial(email, name, avatarUrl) {
  return request('/auth/social', {
    method: 'POST',
    body: JSON.stringify({ email, name, avatar_url: avatarUrl }),
  });
}

export async function authSignup(email, password, name) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function authGetMe() {
  return request('/auth/me');
}

export async function authUpdateProfile(name) {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function authUploadAvatar(formData) {
  return request('/auth/avatar/upload', {
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type, fetch will set it with boundary for FormData
      'Content-Type': undefined, 
    },
  });
}

// ── Generation & Deployment ───────────────────────────────────

export async function generateBlueprint(prompt, template = null) {
  return request('/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, template }),
  });
}

export async function deployStore(blueprint, storeId = null, shopifyConfig = null) {
  return request('/deploy', {
    method: 'POST',
    body: JSON.stringify({ 
      blueprint, 
      store_id: storeId,
      shopify_url: shopifyConfig?.url,
      shopify_token: shopifyConfig?.token
    }),
  });
}

// ── Store Management ──────────────────────────────────────────

export async function getStores() {
  return request('/stores');
}

export async function getStore(storeId) {
  return request(`/stores/${storeId}`);
}

// ── Shopify OAuth ─────────────────────────────────────────────

export async function shopifyConnect(shopDomain) {
  return request(`/shopify/connect?shop=${encodeURIComponent(shopDomain)}`);
}

export async function shopifyStatus() {
  return request('/shopify/status');
}

export async function shopifyDisconnect() {
  return request('/shopify/disconnect', { method: 'POST' });
}
