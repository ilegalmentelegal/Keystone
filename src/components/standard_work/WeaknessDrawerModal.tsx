import React, { useState } from 'react';
import {
  CheckCircle,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  Employee,
  EmployeeWeakness,
  Language,
} from '../../types';
import { categorizeWeakness } from '../../utils/metrics';
import { formatPositionLabel, formatShiftLabel } from '../../utils/i18n';

interface WeaknessDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  employees: Employee[];
  onSaveWeakness: (
    weakness: Omit<EmployeeWeakness, 'id' | 'createdAt'>,
    completedTrainingTopic?: string
  ) => void;
}

export const WeaknessDrawerModal: React.FC<WeaknessDrawerModalProps> = ({
  isOpen,
  onClose,
  language,
  employees,
  onSaveWeakness,
}) => {
  const [date, setDate] = useState('2026-11-12');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [weaknessText, setWeaknessText] = useState('');
  const [alsoLogCompletedTraining, setAlsoLogCompletedTraining] = useState(false);
  const [trainingTopic, setTrainingTopic] = useState('');

  if (!isOpen) return null;

  const isEn = language === 'en';
  const selectedEmployeeObj =
    employees.find((e) => e.id === selectedEmpId) || employees[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeObj || !weaknessText.trim()) return;

    onSaveWeakness(
      {
        date,
        roomId: selectedEmployeeObj.room || 'General',
        employeeId: selectedEmployeeObj.id,
        employeeName: selectedEmployeeObj.name,
        position: selectedEmployeeObj.position,
        weaknessDescription: weaknessText.trim(),
        category: categorizeWeakness(weaknessText),
        status: alsoLogCompletedTraining ? 'Resuelto' : 'En proceso',
      },
      alsoLogCompletedTraining && trainingTopic.trim() ? trainingTopic.trim() : undefined
    );

    setWeaknessText('');
    setTrainingTopic('');
    setAlsoLogCompletedTraining(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Employee Coaching / Weakness Note' : 'Registrar Debilidad / Coaching'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Document an area to reinforce and optionally log completed coaching in the Training Logbook.'
                : 'Documenta un área a reforzar y opcionalmente registra la capacitación realizada en la bitácora.'}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Employee *' : 'Empleado *'}
              </label>
              <select
                value={selectedEmployeeObj?.id || ''}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {formatPositionLabel(emp.position, language)} ({formatShiftLabel(emp.shift, language)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Date' : 'Fecha'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Observed Weakness / Gap *' : 'Debilidad / Área de Refuerzo Observada *'}
            </label>
            <textarea
              rows={3}
              required
              placeholder={
                isEn
                  ? 'e.g. Needs reinforcement on DEACOM Delete Real Time or Start Right / End Right...'
                  : 'Ej. Reforzar eliminación de Real Time en DEACOM o llenado Start Right / End Right...'
              }
              value={weaknessText}
              onChange={(e) => setWeaknessText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5">
            <label className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={alsoLogCompletedTraining}
                onChange={(e) => setAlsoLogCompletedTraining(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <span>
                {isEn
                  ? 'I already completed hands-on coaching — add to Completed Trainings Logbook'
                  : 'Ya realicé el coaching práctico — registrar en Bitácora de Entrenamientos Realizados'}
              </span>
            </label>

            {alsoLogCompletedTraining && (
              <input
                type="text"
                required
                placeholder={
                  isEn
                    ? 'Completed training topic...'
                    : 'Tema del entrenamiento ya completado...'
                }
                value={trainingTopic}
                onChange={(e) => setTrainingTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isEn ? 'Save Record' : 'Guardar Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
