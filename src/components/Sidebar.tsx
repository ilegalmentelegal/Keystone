import React from 'react';
import {
  LayoutDashboard,
  Clock,
  ClipboardCheck,
  Users,
  Award,
  GraduationCap,
  TrendingUp,
  ShieldCheck,
  X,
  Factory,
  Lock,
} from 'lucide-react';
import { AppConfig, Language, UserProfile, UserRole } from '../types';
import { RoleSwitcher } from './RoleSwitcher';
import { getLabel } from '../utils/i18n';

export type ActiveTab =
  | 'dashboard'
  | 'work_standard'
  | 'room_reviews'
  | 'employees'
  | 'evaluations'
  | 'trainings'
  | 'supervision'
  | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: UserProfile;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  config: AppConfig;
  users: UserProfile[];
  language: Language;
  isAdminUnlocked: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  counts: {
    pendingTasks: number;
    pendingFeedbacks: number;
    pendingRegistrations: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  currentRole,
  onRoleChange,
  config,
  users,
  language,
  isAdminUnlocked,
  mobileOpen,
  onCloseMobile,
  counts,
}) => {
  const isEn = language === 'en';

  const getRoleDisplayTitle = () => {
    if (currentRole === 'trainer_a') {
      return isEn ? config.trainerALabelEn : config.trainerALabelEs;
    }
    if (currentRole === 'trainer_b') {
      return isEn ? config.trainerBLabelEn : config.trainerBLabelEs;
    }
    if (currentRole === 'supervisor') {
      return isEn ? config.supervisorLabelEn : config.supervisorLabelEs;
    }
    return config.adminLabel;
  };

  const getScheduleDisplay = () => {
    if (currentRole === 'trainer_a') {
      return isEn ? config.trainerAScheduleEn : config.trainerAScheduleEs;
    }
    if (currentRole === 'trainer_b') {
      return isEn ? config.trainerBScheduleEn : config.trainerBScheduleEs;
    }
    return currentUser.assignedRooms.join(', ');
  };

  const menuItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: getLabel('nav_dashboard', language, config),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'work_standard',
      label: getLabel('nav_work_standard', language, config),
      icon: <Clock className="w-4 h-4" />,
      badge: counts.pendingTasks > 0 ? counts.pendingTasks : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'room_reviews',
      label: getLabel('nav_room_reviews', language, config),
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      id: 'employees',
      label: getLabel('nav_employees', language, config),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'evaluations',
      label: getLabel('nav_evaluations', language, config),
      icon: <Award className="w-4 h-4" />,
    },
    {
      id: 'trainings',
      label: getLabel('nav_trainings', language, config),
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'supervision',
      label: getLabel('nav_supervision', language, config),
      icon: <TrendingUp className="w-4 h-4" />,
      badge: counts.pendingFeedbacks > 0 ? counts.pendingFeedbacks : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      id: 'admin',
      label: getLabel('nav_admin', language, config),
      icon: isAdminUnlocked ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />,
      badge: counts.pendingRegistrations > 0 ? counts.pendingRegistrations : undefined,
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    },
  ];

  const handleItemClick = (id: ActiveTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Factory className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            {isEn ? 'Main Menu' : 'Menú Principal'}
          </span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          aria-label={isEn ? 'Close menu' : 'Cerrar menú'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Role Switcher */}
      <div className="p-3 md:hidden border-b border-slate-100 dark:border-slate-800">
        <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-1">
          {isEn ? 'Switch User:' : 'Cambiar Usuario:'}
        </div>
        <RoleSwitcher
          currentRole={currentRole}
          onRoleChange={onRoleChange}
          config={config}
          users={users}
          language={language}
          isAdminUnlocked={isAdminUnlocked}
        />
      </div>

      {/* Navigation links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
          {getLabel('section_modules', language, config)}
        </div>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active User Card at Bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
            {currentUser.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {getRoleDisplayTitle()}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-800/60 font-mono truncate">
          {getScheduleDisplay()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 sticky top-[57px] h-[calc(100vh-57px)]">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
