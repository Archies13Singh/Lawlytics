"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const navRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <nav ref={navRef} className="bg-[#1B4332] shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-white hover:text-gray-100">
                {t('appTitle')}
              </Link>
              <nav className="hidden sm:flex items-center gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 text-sm transition-colors"
                  title="Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9.83l-3.58 3.59A1 1 0 0 1 5 19.59V16H5a3 3 0 0 1-3-3V5Z" />
                  </svg>
                  <span className="font-medium">Chat</span>
                </Link>
              </nav>
            </div>

            {/* Right controls - hidden on mobile */}
            {user ? (
              <div className="hidden sm:flex items-center space-x-4">
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

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('confirmLogoutTitle')}</h3>
            <p className="text-sm text-gray-700 mb-4">{t('confirmLogoutMessage')}</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-md border text-sm"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button
                className="px-3 py-2 rounded-md bg-red-600 text-white text-sm"
                onClick={async () => { setShowLogoutConfirm(false); setShowDropdown(false); setShowMobileMenu(false); await handleLogout(); }}
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
                </div>
                <span className="text-sm text-white hidden sm:block">
                  {userProfile?.displayName || user?.email || 'User'}
                </span>
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center justify-center w-8 h-8 bg-white rounded-full text-[#1B4332] font-semibold"
                  >
                    {(userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
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
                          onClick={() => setShowLogoutConfirm(true)}
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
              <div className="hidden sm:flex items-center space-x-4">
                <span className="text-sm text-white">
                  {t('pleaseSignIn')}
                </span>
              </div>
            )}

            {/* Hamburger for mobile */}
            <button
              className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-white hover:bg-white/10"
              aria-label="Open menu"
              onClick={() => setShowMobileMenu((v) => !v)}
            >
              <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_429_11066)">
                  <path d="M3 6.00092H21M3 12.0009H21M3 18.0009H21" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </g>
                <defs>
                  <clipPath id="clip0_429_11066">
                    <rect width="24" height="24" fill="white" transform="translate(0 0.000915527)" />
                  </clipPath>
                </defs>
              </svg>

            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown panel */}
      {showMobileMenu && (
        <div className="sm:hidden bg-[#1B4332] border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
            <Link
              href="/chat"
              onClick={() => setShowMobileMenu(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 text-white hover:bg-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9.83l-3.58 3.59A1 1 0 0 1 5 19.59V16H5a3 3 0 0 1-3-3V5Z" />
              </svg>
              <span className="font-medium">Chat</span>
            </Link>

            {user ? (
              <div className="space-y-2">
                <div className="text-white/80 text-sm">{userProfile?.displayName || user?.email || 'User'}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowLanguageDropdown(false); setShowMobileMenu(false); setShowProfileModal(true); }}
                    className="flex-1 px-3 py-2 rounded-md bg-white text-[#1B4332] text-sm"
                  >
                    {t('profile')}
                  </button>
                  <button
                    onClick={() => { setShowLogoutConfirm(true); }}
                    className="flex-1 px-3 py-2 rounded-md bg-red-50 text-red-700 text-sm"
                  >
                    {t('logout')}
                  </button>
                </div>
                <div className="pt-1">
                  <label className="block text-xs text-white/70 mb-1">Language</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['en', 'hi', 'mr', 'kn', 'ta', 'te', 'or', 'bn', 'bho'] as const).map((lng) => (
                      <button
                        key={lng}
                        onClick={() => { setLanguage(lng); setShowMobileMenu(false); }}
                        className={`px-2 py-1 rounded text-xs ${language === lng ? 'bg-white text-[#1B4332]' : 'bg-white/10 text-white'}`}
                      >
                        {lng.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/90 text-sm">{t('pleaseSignIn')}</div>
            )}
          </div>
        </div>
      )}

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
