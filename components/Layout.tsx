import React from 'react';
import { View, UserProfile } from '../types';
import { triggerHaptic } from '../services/haptic';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  user?: UserProfile;
  onUpdateUser?: (updates: Partial<UserProfile>) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onViewChange, 
  user, 
  onUpdateUser 
}) => {
  const navItems: { view: View; icon: string; label: string }[] = [
    { view: 'home', icon: 'dashboard', label: 'Home' },
    { view: 'recipes', icon: 'soup_kitchen', label: 'Recipes' },
    { view: 'camera', icon: 'photo_camera', label: 'Scan' },
    { view: 'diary', icon: 'history_edu', label: 'Diary' },
    { view: 'profile', icon: 'person', label: 'Profile' },
  ];

  const handleToggleTheme = () => {
    triggerHaptic('light');
    if (onUpdateUser) {
      onUpdateUser({ theme: user?.theme === 'light' ? 'dark' : 'light' });
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col items-center justify-start font-sans transition-colors duration-300 selection:bg-primary/30">
      {/* Full-width sticky top header with centered content */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm transition-colors">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onViewChange('home')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/40 flex items-center justify-center text-primary shadow-lg shadow-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M7 12h10" />
                <circle cx="12" cy="12" r="3" fill="#13ec37" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-primary transition-colors">NutriVision AI</h1>
                <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">PRO</span>
              </div>
            </div>
          </div>

          {/* Top Controls: Theme Switcher & Profile Badge */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleTheme}
              title="Toggle Theme"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary transition-all cursor-pointer"
            >
              <span className="material-icons-round text-lg">
                {user?.theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            {user && (
              <div 
                onClick={() => onViewChange('profile')}
                className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-xl cursor-pointer transition-all active:scale-95"
              >
                <img 
                  src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'} 
                  alt="Avatar" 
                  className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 object-cover"
                />
                <span className="text-[10px] font-black text-primary">🔥 {user.streakDays || 1}d</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-28 view-enter">
          {children}
        </div>
      </main>

      {/* Full-width fixed bottom navigation bar with centered items */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-background-dark/95 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="max-w-2xl mx-auto h-20 grid grid-cols-5 items-center px-2 pb-3">
          {navItems.map((item) => {
            if (item.view === 'camera') {
              return (
                <div key="camera" className="flex flex-col items-center justify-center relative h-full">
                  <div className="absolute -top-6 flex flex-col items-center">
                    <button 
                      onClick={() => {
                        triggerHaptic('medium');
                        onViewChange('camera');
                      }}
                      className={`w-13 h-13 rounded-full bg-primary fab-glow flex items-center justify-center shadow-lg active:scale-90 transition-all duration-300 cursor-pointer ${activeView === 'camera' ? 'ring-4 ring-primary/20 shadow-primary/40' : ''}`}
                    >
                      <span className="material-icons-round text-xl text-black">photo_camera</span>
                    </button>
                    <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${activeView === 'camera' ? 'text-primary' : 'text-slate-500'}`}>
                      Scan
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <button 
                key={item.view}
                onClick={() => {
                  triggerHaptic('light');
                  onViewChange(item.view);
                }}
                className={`flex flex-col items-center justify-center transition-all duration-300 py-1 cursor-pointer ${activeView === item.view ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <span className="material-icons-round text-[20px] mb-1">{item.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;