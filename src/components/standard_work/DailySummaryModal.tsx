import React, { useState } from 'react';
import {
  FileText,
  X,
  Save,
  Check,
} from 'lucide-react';
import {
  DailySummary,
  EmployeeWeakness,
  ImprovementObservation,
  Language,
  TrainingSession,
  VisualRoomReview,
  WorkStandardTask,
} from '../../types';
import { calculateWorkStandardCompliance } from '../../utils/metrics';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  date: string;
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  tasks: WorkStandardTask[];
  visualReviews: VisualRoomReview[];
  weaknesses: EmployeeWeakness[];
  trainingSessions: TrainingSession[];
  observations: ImprovementObservation[];
  onSaveDailySummary: (summary: DailySummary) => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({
  isOpen,
  onClose,
  language,
  date,
  trainerId,
  trainerName,
  tasks,
  visualReviews,
  weaknesses,
  trainingSessions,
  observations,
  onSaveDailySummary,
}) => {
  const [priorities, setPriorities] = useState<string[]>([
    'Verify Hour by Hour and Start Right / End Right at shift start.',
    'Follow up on monthly DEACOM evaluations with Leads and Seconds.',
  ]);
  const [newPriorityInput, setNewPriorityInput] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const isEn = language === 'en';
  const dayTasks = tasks.filter((t) => t.date === date);
  const dayVisuals = visualReviews.filter((v) => v.date === date && v.trainerId === trainerId);
  const dayWeaknesses = weaknesses.filter((w) => w.date === date);
  const dayTrainings = trainingSessions.filter((s) => s.date === date && s.trainerId === trainerId);
  const dayObs = observations.filter((o) => o.date === date);

  const comp = calculateWorkStandardCompliance(dayTasks);
  const notCompletedCount = dayTasks.filter((t) => t.status === 'No completado').length;

  const evaluatedEmployees = Array.from(
    new Set(
      dayTasks
        .flatMap((t) => t.employeesInvolved || [])
        .concat(dayWeaknesses.map((w) => w.employeeName))
    )
  );

  const handleAddPriority = () => {
    if (!newPriorityInput.trim()) return;
    setPriorities([...priorities, newPriorityInput.trim()]);
    setNewPriorityInput('');
  };

  const handleRemovePriority = (idx: number) => {
    setPriorities(priorities.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const summary: DailySummary = {
      id: `sum_${trainerId}_${date.replace(/-/g, '')}`,
      date,
      trainerId,
      trainerName,
      completedTasks: comp.completed,
      partialTasks: comp.partial,
      notCompletedTasks: notCompletedCount,
      pendingTasks: comp.pending,
      totalTasks: comp.total,
      compliancePercentage: comp.percentage,
      supportNotesCount: comp.supportCount,
      evaluatedEmployees,
      trainingsConductedCount: dayTrainings.length,
      weaknessesCount: dayWeaknesses.length,
      improvementActionsCount: dayObs.length,
      prioritiesForTomorrow: priorities,
      notes:
        generalNotes.trim() ||
        (isEn ? 'Daily Standard Work closed cleanly.' : 'Cierre de Standard Work completado.'),
      savedAt: new Date().toISOString(),
    };

    onSaveDailySummary(summary);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Daily Summary — Standard Work' : 'Resumen Diario — Standard Work'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {date} · {trainerName}
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

        <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase">
                {isEn ? 'Completed' : 'Completadas'}
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {comp.completed} <span className="text-xs font-normal text-slate-500">/ {comp.total}</span>
              </div>
              <div className="text-[10px] text-emerald-600/90 mt-0.5">
                {comp.percentage}% {isEn ? 'compliance' : 'cumplimiento'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
              <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold uppercase">
                {isEn ? 'General Reviews' : 'Revisiones Generales'}
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
                {dayVisuals.length}
              </div>
              <div className="text-[10px] text-blue-600/90 mt-0.5">
                {isEn ? 'Visual rounds logged' : 'Rondas registradas'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
              <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold uppercase">
                {isEn ? 'Completed Trainings' : 'Entrenamientos Hechos'}
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-purple-700 dark:text-purple-300">
                {dayTrainings.length}
              </div>
              <div className="text-[10px] text-purple-600/90 mt-0.5">
                {dayWeaknesses.length} {isEn ? 'follow-up notes' : 'notas de refuerzo'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase">
                {isEn ? 'Production Support' : 'Apoyo Producción'}
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {comp.supportCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {isEn ? 'Credited blocks' : 'Bloques acreditados'}
              </div>
            </div>
          </div>

          {/* Priorities for Tomorrow */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 dark:text-blue-200">
                {isEn ? 'Priorities for Next Shift' : 'Prioridades para el Siguiente Día'}
              </span>
              <span className="text-[11px] text-slate-500">
                {priorities.length} {isEn ? 'items' : 'prioridades'}
              </span>
            </div>

            <div className="space-y-1.5">
              {priorities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{item}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePriority(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder={isEn ? 'Add a priority for tomorrow...' : 'Escribe una prioridad para mañana...'}
                value={newPriorityInput}
                onChange={(e) => setNewPriorityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPriority();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddPriority}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isEn ? 'Add' : 'Agregar'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'General Shift Closing Notes' : 'Notas Generales de Cierre'}
            </label>
            <textarea
              rows={2}
              placeholder={isEn ? 'Optional closing remarks...' : 'Comentarios finales de la jornada...'}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            {isEn ? 'Close' : 'Cerrar'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-xs ${
              isSaved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>
              {isSaved
                ? isEn
                  ? 'Saved!'
                  : '¡Guardado!'
                : isEn
                ? 'Save Daily Summary'
                : 'Guardar Resumen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
