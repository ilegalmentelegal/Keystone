import React, { useState } from 'react';
import { ShieldCheck, X, Lock } from 'lucide-react';
import { Language } from '../types';

interface AdminPasswordModalProps {
  isOpen: boolean;
  language: Language;
  expectedPassword: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  language,
  expectedPassword,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const isEn = language === 'en';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === expectedPassword) {
      setPassword('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Keystone ADMIN Access' : 'Acceso a Keystone ADMIN'}
            </h3>
          </div>
          <button
            onClick={() => {
              setPassword('');
              setError(false);
              onCancel();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isEn
              ? 'Enter the Administrator password to unlock Keystone ADMIN permissions and edit plant configuration.'
              : 'Ingresa la contraseña de Administrador para desbloquear Keystone ADMIN y editar la configuración de la plataforma.'}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Password' : 'Contraseña'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {isEn ? 'Incorrect password. Please try again.' : 'Contraseña incorrecta. Intenta nuevamente.'}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setError(false);
                onCancel();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
            >
              {isEn ? 'Unlock' : 'Desbloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
