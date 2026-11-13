import React from 'react';
import { User } from 'firebase/auth';
import { Moon, Sun, RotateCcw, Menu, Globe, Cloud, LogIn, LogOut } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';
import { PWAInstallButton } from './PWAInstallButton';
import { AppConfig, Language, UserProfile, UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  config: AppConfig;
  users: UserProfile[];
  language: Language;
  onToggleLanguage: () => void;
  isAdminUnlocked: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetData: () => void;
  onToggleMobileMenu: () => void;
  firebaseUser: User | null;
  isCloudConnected: boolean;
  authLoading: boolean;
  onFirebaseSignIn: () => void;
  onFirebaseSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  config,
  users,
  language,
  onToggleLanguage,
  isAdminUnlocked,
  darkMode,
  onToggleDarkMode,
  onResetData,
  onToggleMobileMenu,
  firebaseUser,
  isCloudConnected,
  authLoading,
  onFirebaseSignIn,
  onFirebaseSignOut,
}) => {
  const isEn = language === 'en';
  const subtitle = isEn ? config.appSubtitleEn : config.appSubtitleEs;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors w-full max-w-full overflow-x-hidden">
      {/* Zone 1: Mobile Hamburger + Brand Wordmark */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 sm:p-2 shrink-0 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={isEn ? 'Open navigation menu' : 'Abrir menú de navegación'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <a href="#dashboard" className="flex items-center gap-2 sm:gap-2.5 text-decoration-none group min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-base tracking-wider group-hover:bg-blue-700 transition-colors">
            TH
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap truncate">
              {config.appName}
            </div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
              {subtitle}
            </div>
          </div>
        </a>
      </div>

      {/* Zone 2: Role Switcher */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-2xl">
        <RoleSwitcher
          currentRole={currentRole}
          onRoleChange={onRoleChange}
          config={config}
          users={users}
          language={language}
          isAdminUnlocked={isAdminUnlocked}
        />
      </div>

      {/* Zone 3: Cloud Auth + Language Switcher + PWA + Reset + Theme */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {firebaseUser ? (
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2 py-1">
            <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 max-w-[110px] truncate">
              {firebaseUser.displayName || firebaseUser.email}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}
              title={isCloudConnected ? 'Cloud Firestore active' : 'Connecting to Cloud Firestore...'}
            />
            <button
              onClick={onFirebaseSignOut}
              disabled={authLoading}
              className="p-0.5 text-emerald-700 dark:text-emerald-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              title={isEn ? 'Sign out of Google' : 'Cerrar sesión de Google'}
              aria-label={isEn ? 'Sign out of Google' : 'Cerrar sesión de Google'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onFirebaseSignIn}
            disabled={authLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors shadow-xs"
            title={isEn ? 'Sign in with Google to sync Cloud Firestore' : 'Inicia sesión con Google para guardar en Cloud Firestore'}
            aria-label={isEn ? 'Sign in with Google' : 'Iniciar sesión con Google'}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{isEn ? 'Google Sign In' : 'Conectar Google'}</span>
          </button>
        )}

        {/* Language Toggle EN / ES */}
        <button
          onClick={onToggleLanguage}
          data-testid="language-toggle"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title={isEn ? 'Switch to Spanish' : 'Cambiar a Inglés'}
          aria-label={isEn ? 'Switch language to Spanish' : 'Cambiar idioma a Inglés'}
        >
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{isEn ? 'EN' : 'ES'}</span>
        </button>

        <div className="hidden sm:block">
          <PWAInstallButton />
        </div>

        {/* Reset Data Button */}
        <button
          onClick={onResetData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={isEn ? 'Reset initial data' : 'Restablecer datos originales'}
          aria-label={isEn ? 'Reset data' : 'Restablecer datos'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{isEn ? 'Reset' : 'Reiniciar'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={darkMode ? (isEn ? 'Light mode' : 'Modo claro') : isEn ? 'Dark mode' : 'Modo oscuro'}
          aria-label={isEn ? 'Toggle theme' : 'Cambiar tema visual'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
