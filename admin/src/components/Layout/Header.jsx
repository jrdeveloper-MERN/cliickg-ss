import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, User, Sun, Moon, Menu, ChevronRight, Loader2 } from 'lucide-react';
import Modal from '../Common/Modal';

const Header = ({ toggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const handleCloseLogoutModal = () => {
    if (!isLoggingOut) {
      setShowLogoutModal(false);
    }
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const generateBreadcrumbs = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Dashboard'];

    return segments.map((seg) =>
      seg.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    );
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="h-16 bg-admin-card border-b border-admin-border flex items-center justify-between px-3 sm:px-6 fixed top-0 right-0 left-0 lg:left-60 z-[90] transition-[left,background-color,border-color] duration-200">
      {/* Left: Mobile Hamburger Toggle + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden bg-transparent border-none text-admin-text-secondary hover:text-admin-text-primary cursor-pointer flex items-center justify-center p-1.5 rounded-md transition-colors shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-admin-text-secondary truncate max-w-[200px] md:max-w-[400px] lg:max-w-[600px]">
          <span className="font-medium text-admin-text-muted shrink-0">Admin</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight size={14} className="text-admin-text-muted shrink-0" />
              <span
                className={`truncate ${
                  idx === breadcrumbs.length - 1
                    ? 'font-semibold text-admin-text-primary'
                    : 'font-normal text-admin-text-secondary'
                }`}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-admin-border bg-admin-card hover:bg-admin-subtle text-admin-text-secondary transition-all duration-200 cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 focus:outline-none shrink-0"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? (
            <Sun size={17} className="text-amber-500 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon size={17} className="text-admin-accent transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 border-l border-admin-border">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-admin-accent-light text-admin-accent flex items-center justify-center shrink-0">
            <User size={16} />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-admin-text-primary leading-tight truncate max-w-[100px]">
              {user?.name || 'Admin'}
            </span>
            <span className="text-[11px] text-admin-text-muted truncate max-w-[100px]">
              {user?.role || 'Administrator'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenLogoutModal}
            className="bg-transparent border-none text-admin-danger hover:opacity-80 cursor-pointer ml-1 p-1 flex items-center transition-opacity shrink-0"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={handleCloseLogoutModal}
        title="Confirm Logout"
        width="420px"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-admin-text-secondary">
            Are you sure you want to logout?
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCloseLogoutModal}
              disabled={isLoggingOut}
              className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xs text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut && <Loader2 size={14} className="animate-spin" />}
              {isLoggingOut ? 'Logging out...' : 'Confirm Logout'}
            </button>
          </div>
        </div>
      </Modal>
    </header>
  );
};

export default Header;
