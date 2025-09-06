"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '../ui/Button';
import UserProfile from '../auth/UserProfile';

export default function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setShowDropdown(false);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  return (
    <>
      <nav className="bg-[#1B4332] shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">{t('appTitle')}</h1>
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 bg-[#A8BCA1] bg-opacity-10 rounded-md text-white hover:bg-opacity-20 transition-colors"
                  >
                    <span className="text-sm">
                      {language === 'en' ? 'English' :
                       language === 'hi' ? 'हिंदी' :
                       language === 'mr' ? 'मराठी' :
                       language === 'kn' ? 'ಕನ್ನಡ' :
                       language === 'ta' ? 'தமிழ்' :
                       language === 'te' ? 'తెలుగు' :
                       language === 'or' ? 'ଓଡ଼ିଆ' :
                       language === 'bn' ? 'বাংলা' :
                       language === 'bho' ? 'भोजपुरी' :
                       'Language'}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showLanguageDropdown && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => { setLanguage('en'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          English
                        </button>
                        <button
                          onClick={() => { setLanguage('hi'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          हिंदी (Hindi)
                        </button>
                        <button
                          onClick={() => { setLanguage('mr'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          मराठी (Marathi)
                        </button>
                        <button
                          onClick={() => { setLanguage('kn'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          ಕನ್ನಡ (Kannada)
                        </button>
                        <button
                          onClick={() => { setLanguage('ta'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          தமிழ் (Tamil)
                        </button>
                        <button
                          onClick={() => { setLanguage('te'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          తెలుగు (Telugu)
                        </button>
                        <button
                          onClick={() => { setLanguage('or'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          ଓଡ଼ିଆ (Odia)
                        </button>
                        <button
                          onClick={() => { setLanguage('bn'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          বাংলা (Bengali)
                        </button>
                        <button
                          onClick={() => { setLanguage('bho'); setShowLanguageDropdown(false); }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          भोजपुरी (Bhojpuri)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm text-white hidden sm:block">
                  {userProfile?.displayName || user.email}
                </span>
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center justify-center w-8 h-8 bg-white rounded-full text-[#1B4332] font-semibold"
                  >
                    {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={handleProfileClick}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          {t('profile')}
                        </button>
                        <button
                          onClick={handleLogout}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-white">
                  {t('pleaseSignIn')}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">User Profile</h2>
              <button
                onClick={closeProfileModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <UserProfile />
          </div>
        </div>
      )}
    </>
  );
}
