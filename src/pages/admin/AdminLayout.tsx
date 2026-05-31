import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Store,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';

export function AdminLayout() {
  const { isDarkMode, setIsDarkMode } = useUI();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Wrap logout so admin pages always return to the public explorer after
  // signing out — avoids stale admin UI lingering with a cleared session.
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
    { path: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" />, exact: false },
    { path: '/admin/creators', label: 'Creators', icon: <Store className="w-4 h-4" />, exact: false },
    { path: '/admin/categories', label: 'Categories', icon: <Tag className="w-4 h-4" />, exact: false },
    { path: '/admin/filters', label: 'Filters', icon: <SlidersHorizontal className="w-4 h-4" />, exact: false },
  ];

  const isActive = (item: typeof navItems[number]) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "bg-zinc-950 text-white" : "bg-gray-100 text-black"}`}>
      <header className={`sticky top-0 z-50 brutalist-border border-t-0 border-l-0 border-r-0 transition-colors duration-300 ${isDarkMode ? "bg-black" : "bg-white"}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/admin" className="flex items-center gap-2 shrink-0">
            <span className={`text-2xl sm:text-3xl md:text-4xl font-display tracking-wider transition-colors duration-300 ${isDarkMode ? "text-white" : "text-black"}`}>
              DECYCLES <span className="text-red-500">ADMIN</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {navItems.map(item => {
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-300 ${
                    active
                      ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border border-transparent ${isDarkMode ? "hover:text-white hover:bg-white/5 hover:border-white/10" : "hover:text-black hover:bg-black/5 hover:border-black/10"}`
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <Link
              to="/"
              title="View site"
              className={`hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 brutalist-border brutalist-shadow transition-colors ${
                isDarkMode
                  ? "border-white/30 text-white hover:bg-white/10"
                  : "border-black/30 text-black hover:bg-black/5"
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              View site
            </Link>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 transition-colors ${isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600"}`}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={handleLogout}
              className={`hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 brutalist-border brutalist-shadow transition-colors ${
                isDarkMode
                  ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                  : "border-red-500/40 text-red-600 hover:bg-red-50"
              }`}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>

            {/* Mobile hamburger */}
            <button
              className={`md:hidden p-2 transition-colors ${isDarkMode ? "text-white" : "text-black"}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`md:hidden border-t overflow-hidden ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}
            >
              <div className="px-4 py-6 flex flex-col gap-3">
                {navItems.map(item => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                        active
                          ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                          : isDarkMode ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-500 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}

                <div className={`my-2 h-px ${isDarkMode ? "bg-white/10" : "bg-black/10"}`} />

                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                    isDarkMode ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-500 hover:bg-black/5 hover:text-black"
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  View site
                </Link>

                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${isDarkMode ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
