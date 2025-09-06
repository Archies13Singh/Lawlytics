"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function UserProfile() {
  const { user, userProfile, updateUserProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [userRole, setUserRole] = useState(userProfile?.userRole || '');
  const [simplificationStyle, setSimplificationStyle] = useState(userProfile?.simplificationStyle || '');
  const [outputFormat, setOutputFormat] = useState(userProfile?.outputFormat || '');
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
      await updateUserProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        userRole,
        simplificationStyle,
        outputFormat
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(userProfile?.displayName || '');
    setPhone(userProfile?.phone || '');
    setUserRole(userProfile?.userRole || '');
    setSimplificationStyle(userProfile?.simplificationStyle || '');
    setOutputFormat(userProfile?.outputFormat || '');
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
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              className="text-sm"
            />
          ) : (
            <div className="text-sm" style={{ color: '#344e41' }}>{displayName || 'Not set'}</div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#344e41' }}>
            Phone (optional)
          </label>
          {isEditing ? (
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="text-sm"
            />
          ) : (
            <div className="text-sm" style={{ color: '#344e41' }}>{phone || 'Not set'}</div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#344e41' }}>
            User Role
          </label>
          {isEditing ? (
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Select role</option>
              <option value="Student">Student</option>
              <option value="Employee">Employee</option>
              <option value="Freelancer">Freelancer</option>
              <option value="Landlord">Landlord</option>
              <option value="Small Business Owner">Small Business Owner</option>
              <option value="Lawyer">Lawyer</option>
            </select>
          ) : (
            <div className="text-sm" style={{ color: '#344e41' }}>{userRole || 'Not set'}</div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#344e41' }}>
            Simplification Style
          </label>
          {isEditing ? (
            <select
              value={simplificationStyle}
              onChange={(e) => setSimplificationStyle(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Select style</option>
              <option value="Layman explanation">Layman explanation</option>
              <option value="Business summary">Business summary</option>
              <option value="Legal key points only">Legal key points only</option>
            </select>
          ) : (
            <div className="text-sm" style={{ color: '#344e41' }}>{simplificationStyle || 'Not set'}</div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#344e41' }}>
            Output Format
          </label>
          {isEditing ? (
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Select format</option>
              <option value="Text only">Text only</option>
              <option value="Text + Risk Matrix">Text + Risk Matrix</option>
              <option value="Downloadable PDF">Downloadable PDF</option>
            </select>
          ) : (
            <div className="text-sm" style={{ color: '#344e41' }}>{outputFormat || 'Not set'}</div>
          )}
        </div>

        {isEditing && (
          <div className="flex gap-2 mt-4">
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
        )}

        {!isEditing && (
          <div className="mt-4">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="text-xs px-2"
            >
              Edit Profile
            </Button>
          </div>
        )}

        <div className="text-xs" style={{ color: '#344e41' }}>
          <div>Member since: {userProfile.createdAt.toLocaleDateString()}</div>
          <div>Last login: {userProfile.lastLoginAt.toLocaleDateString()}</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs">
            {error}
          </div>
        )}


      </div>
    </div>
  );
}
