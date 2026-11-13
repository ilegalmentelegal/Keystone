import React from 'react';
import { ShieldCheck, Eye, Wrench, Lock } from 'lucide-react';
import { AppConfig, Language, UserProfile, UserRole } from '../types';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  config: AppConfig;
  users: UserProfile[];
  language: Language;
  isAdminUnlocked: boolean;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  onRoleChange,
  config,
  users,
  language,
  isAdminUnlocked,
}) => {
  const isEn = language === 'en';

  const getName = (role: UserRole, fallback: string) =>
    users.find((u) => u.role === role)?.name || fallback;

  const roles: {
    id: UserRole;
    name: string;
    person: string;
    shortScope: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'trainer_a',
      name: isEn ? config.trainerALabelEn : config.trainerALabelEs,
      person: getName('trainer_a', 'Israel Martines'),
      shortScope: isEn ? config.trainerAScheduleEn : config.trainerAScheduleEs,
      icon: <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
    },
    {
      id: 'trainer_b',
      name: isEn ? config.trainerBLabelEn : config.trainerBLabelEs,
      person: getName('trainer_b', 'Andreina Morantes'),
      shortScope: isEn ? config.trainerBScheduleEn : config.trainerBScheduleEs,
      icon: <Wrench className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
    },
    {
      id: 'supervisor',
      name: isEn ? config.supervisorLabelEn : config.supervisorLabelEs,
      person: getName('supervisor', 'Jonathan de Jesús'),
      shortScope: isEn ? 'Global View & Feedback' : 'Vista Global y Feedback',
      icon: <Eye className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
    },
    {
      id: 'admin',
      name: config.adminLabel,
      person: getName('admin', 'Keystone ADMIN'),
      shortScope: isEn ? 'Password Protected' : 'Protegido con Contraseña',
      icon: isAdminUnlocked ? (
        <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      ) : (
        <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2 hidden lg:inline uppercase tracking-wider">
        {isEn ? 'Role:' : 'Rol:'}
      </span>
      <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap">
        {roles.map((r) => {
          const isActive = currentRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onRoleChange(r.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
              title={`${r.person} · ${r.shortScope}`}
            >
              {r.icon}
              <span className="whitespace-nowrap">{r.person}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
