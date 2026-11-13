import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Check,
  X,
  Users,
  Layers,
  Settings,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Save,
  KeyRound,
  Edit2,
} from 'lucide-react';
import {
  AppConfig,
  Language,
  PendingRegistration,
  RoomDefinition,
  UserProfile,
  UserRole,
} from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DEFAULT_LABELS_EN, DEFAULT_LABELS_ES, getLabel } from '../utils/i18n';

interface AdminViewProps {
  language: Language;
  config: AppConfig;
  rooms: RoomDefinition[];
  users: UserProfile[];
  pendingRegistrations: PendingRegistration[];
  isAdminUnlocked: boolean;
  onUnlockAdmin: (password: string) => boolean;
  onLockAdmin: () => void;
  onUpdateConfig: (nextConfig: AppConfig, notify?: boolean) => void;
  onUpdateRoom: (room: RoomDefinition) => void;
  onAddRoom: (room: RoomDefinition) => void;
  onDeleteRoom: (roomId: string) => void;
  onUpdateUser: (user: UserProfile) => void;
  onApproveRegistration: (id: string) => void;
  onRejectRegistration: (id: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onAddUser: (user: Omit<UserProfile, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  language,
  config,
  rooms,
  users,
  pendingRegistrations,
  isAdminUnlocked,
  onUnlockAdmin,
  onLockAdmin,
  onUpdateConfig,
  onUpdateRoom,
  onAddRoom,
  onDeleteRoom,
  onUpdateUser,
  onApproveRegistration,
  onRejectRegistration,
  onToggleUserStatus,
  onAddUser,
  onDeleteUser,
}) => {
  const isEn = language === 'en';
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [adminTab, setAdminTab] = useState<'rooms' | 'labels' | 'users' | 'security'>('rooms');

  // Local editable config draft
  const [configDraft, setConfigDraft] = useState<AppConfig>(config);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setConfigDraft(config);
  }, [config]);

  const applyConfigDraft = (next: AppConfig) => {
    setConfigDraft(next);
    onUpdateConfig(next);
  };

  // Room editing state
  const [editingRoom, setEditingRoom] = useState<RoomDefinition | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLine, setNewRoomLine] = useState('');
  const [newRoomTrainer, setNewRoomTrainer] = useState<'trainer_a' | 'trainer_b'>('trainer_a');

  // User editing / creation state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('trainer_a');
  const [newUserTitle, setNewUserTitle] = useState('Trainer');

  // Password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMessage, setPwdMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const pendingList = pendingRegistrations.filter((r) => r.status === 'pendiente');

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onUnlockAdmin(passwordInput);
    if (ok) {
      setPasswordInput('');
      setPasswordError(false);
      setConfigDraft(config);
    } else {
      setPasswordError(true);
    }
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              {config.adminLabel}
            </h1>
            <p className="text-xs text-slate-500">
              {isEn ? 'Password required to access Admin controls' : 'Se requiere contraseña para acceder'}
            </p>
          </div>
        </div>

        <form onSubmit={handleUnlockSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Admin Password' : 'Contraseña de Administrador'}
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {passwordError && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {isEn ? 'Incorrect password.' : 'Contraseña incorrecta.'}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
          >
            <Unlock className="w-4 h-4" />
            <span>{isEn ? 'Unlock Keystone ADMIN' : 'Desbloquear Keystone ADMIN'}</span>
          </button>
        </form>
      </div>
    );
  }

  const triggerSavedBanner = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(configDraft, true);
    triggerSavedBanner();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId.trim() || !newRoomName.trim()) return;
    onAddRoom({
      id: newRoomId.trim(),
      name: newRoomName.trim(),
      lineType: newRoomLine.trim() || (newRoomTrainer === 'trainer_a' ? 'Stick Pack' : 'Cuartos'),
      trainer: newRoomTrainer,
      standardTaktSeconds: 1.5,
      standardHourOutput: 2000,
      isStickPack: newRoomTrainer === 'trainer_a',
    });
    setNewRoomId('');
    setNewRoomName('');
    setNewRoomLine('');
    setIsAddRoomOpen(false);
    triggerSavedBanner();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const initials = newUserName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    onAddUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      title: newUserTitle.trim(),
      assignedRooms:
        newUserRole === 'trainer_a'
          ? rooms.filter((r) => r.trainer === 'trainer_a').map((r) => r.id)
          : newUserRole === 'trainer_b'
          ? rooms.filter((r) => r.trainer === 'trainer_b').map((r) => r.id)
          : ['Planta Completa'],
      avatar: initials || 'TH',
      status: 'active',
    });

    setNewUserName('');
    setNewUserEmail('');
    setIsAddUserModalOpen(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPwd !== config.adminPassword) {
      setPwdMessage({
        type: 'err',
        text: isEn ? 'Current password is incorrect.' : 'La contraseña actual es incorrecta.',
      });
      return;
    }
    if (newPwd.length < 4 || newPwd !== confirmPwd) {
      setPwdMessage({
        type: 'err',
        text: isEn
          ? 'New password must be at least 4 characters and match confirmation.'
          : 'La nueva contraseña debe tener al menos 4 caracteres y coincidir.',
      });
      return;
    }
    const updated = { ...configDraft, adminPassword: newPwd };
    setConfigDraft(updated);
    onUpdateConfig(updated, true);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdMessage({
      type: 'ok',
      text: isEn ? 'Admin password updated successfully.' : 'Contraseña de Keystone ADMIN actualizada.',
    });
  };

  const labelKeys = Object.keys(DEFAULT_LABELS_EN);

  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('admin_title', language, config)}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Edit room names and assignments, customize all page titles and role names, manage personnel and security.'
                : 'Edita qué es cada cuarto, personaliza los nombres de toda la página, roles, usuarios y contraseña de acceso.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {savedNotice && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                {isEn ? 'Changes saved!' : '¡Cambios guardados!'}
              </span>
            )}
            <button
              onClick={onLockAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isEn ? 'Lock Admin' : 'Bloquear Admin'}</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAdminTab('rooms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              adminTab === 'rooms'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isEn ? 'Rooms Configuration' : 'Nombres de Cuartos'}</span>
          </button>

          <button
            onClick={() => {
              setConfigDraft(config);
              setAdminTab('labels');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              adminTab === 'labels'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isEn ? 'Page & Role Names' : 'Nombres de Página y Roles'}</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              adminTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isEn ? 'Personnel & Users' : 'Personal y Usuarios'}</span>
          </button>

          <button
            onClick={() => setAdminTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              adminTab === 'security'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isEn ? 'Password' : 'Contraseña'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ROOMS CONFIGURATION */}
      {adminTab === 'rooms' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isEn ? 'Customize What Each Room Is' : 'Configurar qué es cada cuarto'}
              </span>
              <p className="text-[11px] text-slate-500">
                {isEn
                  ? 'Rename any room or area, edit its description/line type, and assign it to a trainer.'
                  : 'Cambia el nombre y descripción de cada cuarto o área y asígnalo al entrenador correspondiente.'}
              </p>
            </div>
            <button
              onClick={() => setIsAddRoomOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add Room' : 'Agregar Cuarto'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{isEn ? 'Room Name / Description' : 'Nombre / Qué es el Cuarto'}</th>
                  <th className="px-4 py-3">{isEn ? 'Line Type' : 'Tipo de Línea'}</th>
                  <th className="px-4 py-3">{isEn ? 'Assigned Trainer' : 'Entrenador Asignado'}</th>
                  <th className="px-4 py-3 text-right">{isEn ? 'Actions' : 'Acciones'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rooms.map((rm) => (
                  <tr key={rm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {rm.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {rm.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {rm.lineType}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          rm.trainer === 'trainer_a'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {rm.trainer === 'trainer_a' ? trainerALabel : trainerBLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingRoom(rm)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-200 text-[11px] font-medium"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEn ? 'Edit' : 'Editar'}</span>
                        </button>
                        <button
                          onClick={() => onDeleteRoom(rm.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title={isEn ? 'Delete room' : 'Eliminar cuarto'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAGE & ROLE LABELS */}
      {adminTab === 'labels' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Brand, Roles & Schedule Names' : 'Nombres de Marca, Roles y Turnos'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isEn
                    ? 'Customize role titles and shift schedules displayed across the platform.'
                    : 'Personaliza los títulos de los roles y horarios mostrados en toda la plataforma.'}
                </p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isEn ? 'Save All Names' : 'Guardar Nombres'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Application Name' : 'Nombre de la Aplicación'}
                </label>
                <input
                  type="text"
                  value={configDraft.appName}
                  onChange={(e) => applyConfigDraft({ ...configDraft, appName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Administrator Label' : 'Nombre del Administrador'}
                </label>
                <input
                  type="text"
                  value={configDraft.adminLabel}
                  onChange={(e) => applyConfigDraft({ ...configDraft, adminLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Subtitle (English)' : 'Subtítulo (Inglés)'}
                </label>
                <input
                  type="text"
                  value={configDraft.appSubtitleEn}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, appSubtitleEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Subtitle (Spanish)' : 'Subtítulo (Español)'}
                </label>
                <input
                  type="text"
                  value={configDraft.appSubtitleEs}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, appSubtitleEs: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 1 Title (English)' : 'Título Entrenador 1 (Inglés)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerALabelEn}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerALabelEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 1 Title (Spanish)' : 'Título Entrenador 1 (Español)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerALabelEs}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerALabelEs: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 1 Schedule (English)' : 'Horario Entrenador 1 (Inglés)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerAScheduleEn}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerAScheduleEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 1 Schedule (Spanish)' : 'Horario Entrenador 1 (Español)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerAScheduleEs}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerAScheduleEs: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 2 Title (English)' : 'Título Entrenador 2 (Inglés)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerBLabelEn}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerBLabelEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 2 Title (Spanish)' : 'Título Entrenador 2 (Español)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerBLabelEs}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerBLabelEs: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 2 Schedule (English)' : 'Horario Entrenador 2 (Inglés)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerBScheduleEn}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerBScheduleEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Trainer 2 Schedule (Spanish)' : 'Horario Entrenador 2 (Español)'}
                </label>
                <input
                  type="text"
                  value={configDraft.trainerBScheduleEs}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, trainerBScheduleEs: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Supervisor Title (English)' : 'Título Supervisor (Inglés)'}
                </label>
                <input
                  type="text"
                  value={configDraft.supervisorLabelEn}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, supervisorLabelEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Supervisor Title (Spanish)' : 'Título Supervisor (Español)'}
                </label>
                <input
                  type="text"
                  value={configDraft.supervisorLabelEs}
                  onChange={(e) =>
                    applyConfigDraft({ ...configDraft, supervisorLabelEs: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section & Menu Labels Customization */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Module & Page Headings (EN / ES)' : 'Nombres de Módulos y Secciones (EN / ES)'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isEn
                    ? 'Changes apply live across menus and page headers.'
                    : 'Los cambios se aplican en vivo en todos los menús y títulos.'}
                </p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isEn ? 'Save All Names' : 'Guardar Nombres'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs">
              {labelKeys.map((key) => (
                <div
                  key={key}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-mono text-[11px] text-slate-500">{key}</span>
                  <input
                    type="text"
                    aria-label={`${key} English`}
                    value={configDraft.customLabelsEn[key] ?? DEFAULT_LABELS_EN[key]}
                    onChange={(e) =>
                      applyConfigDraft({
                        ...configDraft,
                        customLabelsEn: { ...configDraft.customLabelsEn, [key]: e.target.value },
                      })
                    }
                    placeholder="English label"
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    aria-label={`${key} Spanish`}
                    value={configDraft.customLabelsEs[key] ?? DEFAULT_LABELS_ES[key]}
                    onChange={(e) =>
                      applyConfigDraft({
                        ...configDraft,
                        customLabelsEs: { ...configDraft.customLabelsEs, [key]: e.target.value },
                      })
                    }
                    placeholder="Spanish label"
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PERSONNEL & USERS */}
      {adminTab === 'users' && (
        <div className="space-y-6">
          {pendingList.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Pending Registrations' : 'Solicitudes Pendientes'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {pendingList.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingList.map((reg) => (
                  <div key={reg.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{reg.name}</div>
                      <div className="text-[11px] text-slate-500">{reg.email} · {reg.department}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveRegistration(reg.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRejectRegistration(reg.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 border border-rose-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isEn ? 'Trainers, Supervisor & Admin Accounts' : 'Cuentas de Entrenadores, Supervisor y Admin'}
              </span>
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add User' : 'Agregar Usuario'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">{isEn ? 'Name' : 'Nombre'}</th>
                    <th className="px-4 py-3">{isEn ? 'Role' : 'Rol'}</th>
                    <th className="px-4 py-3">{isEn ? 'Title' : 'Cargo'}</th>
                    <th className="px-4 py-3">{isEn ? 'Status' : 'Estado'}</th>
                    <th className="px-4 py-3 text-right">{isEn ? 'Actions' : 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {u.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.role === 'trainer_a'
                            ? trainerALabel
                            : u.role === 'trainer_b'
                            ? trainerBLabel
                            : u.role === 'supervisor'
                            ? isEn
                              ? config.supervisorLabelEn
                              : config.supervisorLabelEs
                            : config.adminLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{u.title}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => onToggleUserStatus(u.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {u.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          <span>{u.status === 'active' ? (isEn ? 'Active' : 'Activo') : isEn ? 'Inactive' : 'Inactivo'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px]"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{isEn ? 'Edit' : 'Editar'}</span>
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              aria-label={`Delete ${u.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY / PASSWORD */}
      {adminTab === 'security' && (
        <div className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Change Keystone ADMIN Password' : 'Cambiar Contraseña de Keystone ADMIN'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isEn
                ? 'Default initial password is Keystone2026. Update it here for plant security.'
                : 'La contraseña inicial predeterminada es Keystone2026. Cámbiala aquí.'}
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Current Password' : 'Contraseña Actual'}
              </label>
              <input
                type="password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'New Password' : 'Nueva Contraseña'}
              </label>
              <input
                type="password"
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Confirm New Password' : 'Confirmar Nueva Contraseña'}
              </label>
              <input
                type="password"
                required
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {pwdMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold ${
                  pwdMessage.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {pwdMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
            >
              {isEn ? 'Update Password' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      )}

      {/* Modal: Edit Room */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? `Edit Room: ${editingRoom.id}` : `Editar Cuarto: ${editingRoom.id}`}
              </h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateRoom(editingRoom);
                setEditingRoom(null);
                triggerSavedBanner();
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Room Name / Description *' : 'Nombre / Qué es este cuarto *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Line Type' : 'Tipo de Línea / Área'}
                </label>
                <input
                  type="text"
                  value={editingRoom.lineType}
                  onChange={(e) => setEditingRoom({ ...editingRoom, lineType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Assigned Trainer' : 'Entrenador Responsable'}
                </label>
                <select
                  value={editingRoom.trainer}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      trainer: e.target.value as 'trainer_a' | 'trainer_b',
                      isStickPack: e.target.value === 'trainer_a',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="trainer_a">{trainerALabel}</option>
                  <option value="trainer_b">{trainerBLabel}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Save Room' : 'Guardar Cuarto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Room */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? 'Add New Room' : 'Agregar Nuevo Cuarto'}
              </h3>
              <button onClick={() => setIsAddRoomOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Room Code / ID *' : 'Código de Cuarto *'}</label>
                <input
                  type="text"
                  required
                  placeholder="P14"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Room Name / What it is *' : 'Nombre / Qué es *'}</label>
                <input
                  type="text"
                  required
                  placeholder="P14 - Stick Pack 6"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Line Type' : 'Tipo de Línea'}</label>
                <input
                  type="text"
                  placeholder="Stick Pack / Blister"
                  value={newRoomLine}
                  onChange={(e) => setNewRoomLine(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Assigned Trainer' : 'Entrenador Asignado'}</label>
                <select
                  value={newRoomTrainer}
                  onChange={(e) => setNewRoomTrainer(e.target.value as 'trainer_a' | 'trainer_b')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="trainer_a">{trainerALabel}</option>
                  <option value="trainer_b">{trainerBLabel}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="px-4 py-1.5 font-semibold text-white bg-blue-600 rounded-lg">
                  {isEn ? 'Save Room' : 'Guardar Cuarto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? 'Edit Account' : 'Editar Usuario'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const initials = editingUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                onUpdateUser({ ...editingUser, avatar: initials || editingUser.avatar });
                setEditingUser(null);
                triggerSavedBanner();
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Full Name *' : 'Nombre Completo *'}</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Email *' : 'Correo *'}</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Position Title' : 'Cargo / Título'}</label>
                <input
                  type="text"
                  value={editingUser.title}
                  onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setEditingUser(null)} className="px-3 py-1.5 rounded-lg">
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="px-4 py-1.5 font-semibold text-white bg-blue-600 rounded-lg">
                  {isEn ? 'Save' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New User */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Create User' : 'Crear Usuario'}
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Full Name *' : 'Nombre Completo *'}</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Email *' : 'Correo *'}</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'System Role *' : 'Rol *'}</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="trainer_a">{trainerALabel}</option>
                    <option value="trainer_b">{trainerBLabel}</option>
                    <option value="supervisor">{isEn ? config.supervisorLabelEn : config.supervisorLabelEs}</option>
                    <option value="admin">{config.adminLabel}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Title' : 'Cargo'}</label>
                  <input
                    type="text"
                    value={newUserTitle}
                    onChange={(e) => setNewUserTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-3 py-1.5 rounded-lg">
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="px-4 py-1.5 font-semibold text-white bg-blue-600 rounded-lg">
                  {isEn ? 'Save User' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!userToDelete}
        title={isEn ? 'Delete User Account' : 'Eliminar Cuenta'}
        message={
          isEn
            ? `Are you sure you want to permanently remove ${userToDelete?.name}?`
            : `¿Estás seguro de eliminar a ${userToDelete?.name}?`
        }
        confirmLabel={isEn ? 'Delete' : 'Eliminar'}
        onConfirm={() => {
          if (userToDelete) {
            onDeleteUser(userToDelete.id);
            setUserToDelete(null);
          }
        }}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
