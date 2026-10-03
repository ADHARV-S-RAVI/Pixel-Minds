import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Coins, Shield, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const { currentUser, userData, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-sky-600 bg-sky-50'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-sky-600 transition-colors">
                <span className="text-white font-bold text-lg leading-none">P</span>
              </div>
              <span className="text-slate-900 font-bold text-xl tracking-tight">Pixel Minds</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/opportunities" className={navLinkClass('/opportunities')}>Opportunities</Link>
              <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>Leaderboard</Link>
              {currentUser && (
                <Link to="/submit" className={navLinkClass('/submit')}>Submit</Link>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <>
                {userData?.role === 'admin' && (
                  <Link to="/admin" className="hidden sm:flex items-center space-x-1.5 text-slate-500 hover:text-sky-600 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-sky-50" title="Admin Dashboard">
                    <Shield size={16} />
                    <span className="text-sm font-medium">Admin</span>
                  </Link>
                )}
                <div className="hidden sm:flex items-center space-x-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  <Coins size={14} className="text-amber-500" />
                  <span className="text-amber-700 font-semibold text-sm">{userData?.pixels || 0}</span>
                </div>
                <Link to="/profile" className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg transition-colors hover:bg-slate-50">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                      <UserIcon size={16} />
                    </div>
                  )}
                </Link>
                <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors" title="Logout">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link to="/login" className="text-slate-600 hover:text-slate-900 px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-slate-50">Log in</Link>
                <Link to="/signup" className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">Sign up</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            <Link to="/opportunities" onClick={() => setMobileOpen(false)} className={`block ${navLinkClass('/opportunities')}`}>Opportunities</Link>
            <Link to="/leaderboard" onClick={() => setMobileOpen(false)} className={`block ${navLinkClass('/leaderboard')}`}>Leaderboard</Link>
            {currentUser && (
              <>
                <Link to="/submit" onClick={() => setMobileOpen(false)} className={`block ${navLinkClass('/submit')}`}>Submit Opportunity</Link>
                <Link to="/my-submissions" onClick={() => setMobileOpen(false)} className={`block ${navLinkClass('/my-submissions')}`}>My Submissions</Link>
                {userData?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className={`block ${navLinkClass('/admin')}`}>Admin Dashboard</Link>
                )}
              </>
            )}
            {!currentUser && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full text-center text-slate-600 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Log in</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="block w-full text-center bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};