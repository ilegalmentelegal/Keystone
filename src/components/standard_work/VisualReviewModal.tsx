import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  X,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  Employee,
  Language,
  RoomDefinition,
  RoomReviewChecklist,
  VisualRoomReview,
} from '../../types';
import { calculateRoomChecklistPercentage } from '../../utils/metrics';

interface VisualReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  rooms: RoomDefinition[];
  employees: Employee[];
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  onSaveVisualReview: (
    review: Omit<VisualRoomReview, 'id' | 'createdAt'>,
    createWeakness?: { employeeId: string; description: string }
  ) => void;
}

const CHECKLIST_ITEMS: {
  key: keyof RoomReviewChecklist;
  labelEs: string;
  labelEn: string;
}[] = [
  { key: 'hourByHour', labelEs: 'Hora x Hora', labelEn: 'Hour by Hour' },
  { key: 'kpis', labelEs: 'KPIs', labelEn: 'KPIs' },
  { key: 'tpms', labelEs: 'TPMs', labelEn: 'TPMs' },
  { key: 'fiveS', labelEs: '5S', labelEn: '5S' },
  { key: 'startRightEndRight', labelEs: 'Start Right / End Right', labelEn: 'Start Right / End Right' },
  { key: 'taktTime', labelEs: 'Takt Time', labelEn: 'Takt Time' },
];

export const VisualReviewModal: React.FC<VisualReviewModalProps> = ({
  isOpen,
  onClose,
  language,
  rooms,
  employees,
  trainerId,
  trainerName,
  onSaveVisualReview,
}) => {
  const [date, setDate] = useState('2026-11-12');
  const [round, setRound] = useState<'Ronda 1' | 'Ronda 2'>('Ronda 1');
  const [isCustomRoomModified, setIsCustomRoomModified] = useState(false);
  const [customRoomId, setCustomRoomId] = useState(rooms[0]?.id || '');

  const [checklist, setChecklist] = useState<RoomReviewChecklist>({
    hourByHour: true,
    kpis: true,
    tpms: true,
    fiveS: true,
    startRightEndRight: true,
    taktTime: true,
  });

  const [observations, setObservations] = useState('');
  const [employeeInvolvedId, setEmployeeInvolvedId] = useState('');
  const [needToStrengthen, setNeedToStrengthen] = useState('');
  const [logWeakness, setLogWeakness] = useState(false);

  if (!isOpen) return null;

  const isEn = language === 'en';
  const pct = calculateRoomChecklistPercentage(checklist);
  const selectedEmployeeObj = employees.find((e) => e.id === employeeInvolvedId);

  const toggleItem = (key: keyof RoomReviewChecklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRoomObj = rooms.find((r) => r.id === customRoomId);
    const scopeLabel =
      isCustomRoomModified && selectedRoomObj
        ? selectedRoomObj.name
        : isEn
        ? 'General Review'
        : 'Revisión General';

    const reviewData: Omit<VisualRoomReview, 'id' | 'createdAt'> = {
      date,
      scopeLabel,
      isCustomRoomModified,
      trainerId,
      trainerName,
      round,
      checklist,
      observations: observations.trim() || undefined,
      employeeInvolvedId: employeeInvolvedId || undefined,
      employeeInvolvedName: selectedEmployeeObj?.name || undefined,
      needToStrengthen: needToStrengthen.trim() || undefined,
    };

    let weaknessPayload: { employeeId: string; description: string } | undefined;
    if (logWeakness && employeeInvolvedId && needToStrengthen.trim()) {
      weaknessPayload = {
        employeeId: employeeInvolvedId,
        description: needToStrengthen.trim(),
      };
    }

    onSaveVisualReview(reviewData, weaknessPayload);
    setObservations('');
    setEmployeeInvolvedId('');
    setNeedToStrengthen('');
    setLogWeakness(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'General Visual Review' : 'Revisión Visual General'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'General area review by default. Check what was filled vs. not filled.'
                : 'Revisión general del área por defecto. Marca lo que sí se llenó y lo que no.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Round, Date & General/Specific Scope Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Review Round' : 'Ronda de Revisión'}
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setRound('Ronda 1')}
                  className={`py-1.5 px-2 rounded-md font-semibold transition-colors ${
                    round === 'Ronda 1'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isEn ? '1st Review (9:00 AM)' : '1ra Revisión (9:00 AM)'}
                </button>
                <button
                  type="button"
                  onClick={() => setRound('Ronda 2')}
                  className={`py-1.5 px-2 rounded-md font-semibold transition-colors ${
                    round === 'Ronda 2'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isEn ? '2nd Review (1:30 PM)' : '2da Revisión (1:30 PM)'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Date' : 'Fecha'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Optional Room Modification Toggle */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isCustomRoomModified}
                onChange={(e) => setIsCustomRoomModified(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>
                {isEn
                  ? 'Modify to specify a particular room (default is General)'
                  : 'Modificar para especificar un cuarto específico (por defecto es General)'}
              </span>
            </label>

            {isCustomRoomModified && (
              <select
                value={customRoomId}
                onChange={(e) => setCustomRoomId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 6 Checkboxes */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isEn ? 'Board Completion Checklist (6 Items)' : 'Casillas de Completado (6 Elementos)'}
              </span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {pct}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CHECKLIST_ITEMS.map((item) => {
                const checked = checklist[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleItem(item.key)}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                      checked
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isEn ? item.labelEn : item.labelEs}
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      {checked ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {isEn ? 'Filled' : 'Sí'}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-500" />
                          <span className="text-rose-600 dark:text-rose-300">
                            {isEn ? 'Missing' : 'No'}
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'General Observations' : 'Observaciones del Recorrido'}
            </label>
            <textarea
              rows={2}
              placeholder={
                isEn
                  ? 'Brief notes on visual boards and general area conditions...'
                  : 'Notas breves sobre tableros visuales y condiciones generales del área...'
              }
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Optional Weakness Note */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              {isEn
                ? 'Optional: Note an employee reinforcement point'
                : 'Opcional: Registrar punto de refuerzo con algún empleado'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={employeeInvolvedId}
                onChange={(e) => setEmployeeInvolvedId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">{isEn ? 'None / General' : 'Ninguno / General'}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder={isEn ? 'What needs strengthening?' : '¿Qué necesita fortalecerse?'}
                value={needToStrengthen}
                onChange={(e) => setNeedToStrengthen(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {employeeInvolvedId && needToStrengthen.trim() && (
              <label className="flex items-center gap-2 text-xs font-medium text-blue-900 dark:text-blue-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logWeakness}
                  onChange={(e) => setLogWeakness(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>
                  {isEn
                    ? 'Save weakness record for follow-up'
                    : 'Guardar registro de debilidad para seguimiento'}
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              <span>{isEn ? 'Save Review' : 'Guardar Revisión'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
