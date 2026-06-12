/**
 * ProfilePage.jsx — User Profile
 * ==============================
 * View and edit user profile details.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authUpdateProfile, authUploadAvatar } from '../api';
import { User, Mail, Calendar, Shield, Edit2, Check, X, Loader2, Camera } from 'lucide-react';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);

  const memberSince = (() => {
    const dateStr = user?.created_at;
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { return 'Unknown'; }
  })();

  const handleSave = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const updatedUser = await authUpdateProfile(newName.trim());
      updateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 2MB' });
      return;
    }

    // Show instant local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    setIsLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updatedUser = await authUploadAvatar(formData);
      updateUser(updatedUser);
      setAvatarPreview(updatedUser.avatar_url || localUrl);
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
    } catch (err) {
      setAvatarPreview(user?.avatar_url || null); // revert on failure
      setMessage({ type: 'error', text: err.message || 'Failed to upload avatar' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div>
          <h1>Profile</h1>
          <p>Manage your personal information and account settings</p>
        </div>
        {!isEditing && (
          <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
            <Edit2 size={16} /> Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div className={`profile-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-lg">
              {avatarPreview ? (
                <img src={avatarPreview} alt={user?.name} />
              ) : (
                initials
              )}
            </div>
            <label className="avatar-upload-overlay" htmlFor="avatar-upload">
              <Camera size={24} />
              <input 
                type="file" 
                id="avatar-upload" 
                hidden 
                accept="image/*" 
                onChange={handleAvatarChange}
                disabled={isLoading}
              />
            </label>
            {isLoading && <div className="avatar-loading-spinner"><Loader2 size={24} className="spin" /></div>}
          </div>
          <div className="profile-avatar-info">
            <h2>{user?.name || 'User'}</h2>
            <span className="profile-role"><Shield size={14} /> Store Admin</span>
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-detail-row">
            <div className="profile-detail-icon"><User size={18} /></div>
            <div className="profile-detail-content">
              <label>Full Name</label>
              {isEditing ? (
                <div className="profile-edit-input-wrap">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <div className="profile-edit-actions">
                    <button className="save" onClick={handleSave} disabled={isLoading}>
                      {isLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    </button>
                    <button className="cancel" onClick={() => { setIsEditing(false); setNewName(user.name); }} disabled={isLoading}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <span>{user?.name || '—'}</span>
              )}
            </div>
          </div>

          <div className="profile-detail-row">
            <div className="profile-detail-icon"><Mail size={18} /></div>
            <div className="profile-detail-content">
              <label>Email Address</label>
              <span className="disabled-text">{user?.email || '—'}</span>
            </div>
          </div>

          <div className="profile-detail-row">
            <div className="profile-detail-icon"><Calendar size={18} /></div>
            <div className="profile-detail-content">
              <label>Member Since</label>
              <span>{memberSince}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
