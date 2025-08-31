"use client";

import { useAuth } from '@/contexts/AuthContext';
import Button from '../ui/Button';

export default function Navbar() {
  const { user, userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-[#1B4332] shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">Lawlytics</h1>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-smoked-white">
                Welcome, {userProfile?.displayName || user.email}
              </span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Please sign in to continue
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
