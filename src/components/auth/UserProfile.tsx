"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function UserProfile() {
  const { user, userProfile, updateUserProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUserProfile({ displayName: displayName.trim() });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(userProfile?.displayName || '');
    setIsEditing(false);
    setError('');
  };

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="rounded-lg shadow-lg p-4" style={{ backgroundColor: '#A8BCA1' }}>
      <h2 className="text-lg font-semibold mb-3" style={{ color: '#3a5a40' }}>👤 User Profile</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#344e41' }}>
            Email
          </label>
          <div className="text-sm" style={{ color: '#344e41' }}>{user.email}</div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#344e41' }}>
            Display Name
          </label>
          {isEditing ? (
            <div className="flex gap-1">
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="text-sm"
              />
              <Button
                onClick={handleSave}
                loading={loading}
                size="sm"
                className="text-xs px-2"
              >
                Save
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className="text-xs px-2"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-sm flex-1" style={{ color: '#344e41' }}>{displayName || 'Not set'}</div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="text-xs px-2"
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs" style={{ color: '#344e41' }}>
          <div>Member since: {userProfile.createdAt.toLocaleDateString()}</div>
          <div>Last login: {userProfile.lastLoginAt.toLocaleDateString()}</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs">
            {error}
          </div>
        )}

        <div className="pt-2 border-t" style={{ borderColor: '#588157' }}>
          <Button
            onClick={logout}
            variant="destructive"
            className="w-full text-sm"
            size="sm"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
