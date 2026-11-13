import React, { useState } from 'react';
import {
  TrendingUp,
  MessageSquare,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { AppState } from '../utils/storage';
import { Language, SupervisorFeedback, UserProfile, UserRole } from '../types';
import { calculateWorkStandardCompliance } from '../utils/metrics';
import { getLabel } from '../utils/i18n';

interface SupervisionViewProps {
  language: Language;
  state: AppState;
  currentUser: UserProfile;
  currentRole: UserRole;
  onAddFeedback: (feedback: Omit<SupervisorFeedback, 'id' | 'read'>) => void;
  onMarkFeedbackRead: (feedbackId: string) => void;
}

export const SupervisionView: React.FC<SupervisionViewProps> = ({
  language,
  state,
  currentUser,
  onAddFeedback,
  onMarkFeedbackRead,
}) => {
  const isEn = language === 'en';
  const { config, users, rooms } = state;

  const trainerAUser = users.find((u) => u.role === 'trainer_a');
  const trainerBUser = users.find((u) => u.role === 'trainer_b');
  const supervisorUser = users.find((u) => u.role === 'supervisor');

  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;
  const trainerASchedule = isEn ? config.trainerAScheduleEn : config.trainerAScheduleEs;
  const trainerBSchedule = isEn ? config.trainerBScheduleEn : config.trainerBScheduleEs;

  const roomsA = rooms.filter((r) => r.trainer === 'trainer_a');
  const roomsB = rooms.filter((r) => r.trainer === 'trainer_b');

  // Stick Pack Trainer stats
  const tasksA = state.tasks.filter((t) => t.trainerId === 'trainer_a');
  const compA = calculateWorkStandardCompliance(tasksA);
  const reviewsA = state.roomReviews.filter((r) => r.trainerId === 'trainer_a');
  const evalsA = state.evaluations.filter((e) => e.trainerId === 'trainer_a');
  const trainingsA = state.trainingSessions.filter((t) => t.trainerId === 'trainer_a');

  // Rooms Trainer stats
  const tasksB = state.tasks.filter((t) => t.trainerId === 'trainer_b');
  const compB = calculateWorkStandardCompliance(tasksB);
  const reviewsB = state.roomReviews.filter((r) => r.trainerId === 'trainer_b');
  const evalsB = state.evaluations.filter((e) => e.trainerId === 'trainer_b');
  const trainingsB = state.trainingSessions.filter((t) => t.trainerId === 'trainer_b');

  // Feedback form state
  const [targetTrainer, setTargetTrainer] = useState<'trainer_a' | 'trainer_b'>('trainer_a');
  const [feedbackType, setFeedbackType] = useState<SupervisorFeedback['type']>('Reconocimiento');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [date] = useState('2026-11-12');

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackMessage.trim()) return;

    onAddFeedback({
      supervisorName: supervisorUser?.name || currentUser.name,
      targetTrainerId: targetTrainer,
      date,
      type: feedbackType,
      title: feedbackTitle.trim(),
      message: feedbackMessage.trim(),
    });

    setFeedbackTitle('');
    setFeedbackMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('supervision_title', language, config)}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Consolidated oversight of both Trainers: room reviews, monthly Lead/Second evaluations, completed trainings, and feedback.'
                : 'Vista consolidada de ambos Entrenadores: revisiones de cuartos, evaluaciones mensuales, bitácora de entrenamientos y retroalimentación.'}
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shrink-0">
            {supervisorUser?.name || 'Jonathan de Jesús'} ·{' '}
            {isEn ? config.supervisorLabelEn : config.supervisorLabelEs}
          </span>
        </div>
      </div>

      {/* Comparative Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stick Pack Trainer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                  {trainerALabel}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {trainerAUser?.name || 'Israel Martines'}
                </h2>
                <p className="text-xs text-slate-500">{trainerASchedule}</p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                  {compA.percentage}%
                </div>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'TSW Compliance' : 'Cumplimiento TSW'}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  {reviewsA.length}/{roomsA.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Rooms Reviewed' : 'Cuartos Rev.'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  {evalsA.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Monthly Evals' : 'Evaluaciones'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  {trainingsA.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Trainings Done' : 'Entrenamientos'}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                {isEn ? 'Assigned Rooms Checklist Status:' : 'Estatus de Cuartos Asignados:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomsA.map((rm) => {
                  const rev = reviewsA.find((r) => r.roomId === rm.id);
                  return (
                    <span
                      key={rm.id}
                      className="px-2 py-0.5 rounded font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <span>{rm.name}</span>
                      <span
                        className={`font-bold ${
                          !rev
                            ? 'text-slate-400'
                            : rev.completionPercentage === 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {rev ? `${rev.completionPercentage}%` : '—'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Trainer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">
                  {trainerBLabel}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {trainerBUser?.name || 'Andreina Morantes'}
                </h2>
                <p className="text-xs text-slate-500">{trainerBSchedule}</p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {compB.percentage}%
                </div>
                <span className="text-[10px] text-slate-500">
                  {isEn ? 'TSW Compliance' : 'Cumplimiento TSW'}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  {reviewsB.length}/{roomsB.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Rooms Reviewed' : 'Cuartos Rev.'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  {evalsB.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Monthly Evals' : 'Evaluaciones'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  {trainingsB.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Trainings Done' : 'Entrenamientos'}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                {isEn ? 'Assigned Rooms Checklist Status:' : 'Estatus de Cuartos Asignados:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomsB.map((rm) => {
                  const rev = reviewsB.find((r) => r.roomId === rm.id);
                  return (
                    <span
                      key={rm.id}
                      className="px-2 py-0.5 rounded font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <span>{rm.name}</span>
                      <span
                        className={`font-bold ${
                          !rev
                            ? 'text-slate-400'
                            : rev.completionPercentage === 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {rev ? `${rev.completionPercentage}%` : '—'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Send Supervisor Feedback' : 'Enviar Retroalimentación'}
            </h3>
          </div>

          <form onSubmit={handleSendFeedback} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Target Trainer *' : 'Entrenador Destinatario *'}
              </label>
              <select
                value={targetTrainer}
                onChange={(e) => setTargetTrainer(e.target.value as 'trainer_a' | 'trainer_b')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="trainer_a">
                  {trainerAUser?.name || 'Israel Martines'} ({trainerALabel})
                </option>
                <option value="trainer_b">
                  {trainerBUser?.name || 'Andreina Morantes'} ({trainerBLabel})
                </option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Feedback Type *' : 'Tipo *'}
              </label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as SupervisorFeedback['type'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Reconocimiento">{isEn ? 'Recognition' : 'Reconocimiento'}</option>
                <option value="Oportunidad de Mejora">
                  {isEn ? 'Improvement Opportunity' : 'Oportunidad de Mejora'}
                </option>
                <option value="Acción Correctiva">
                  {isEn ? 'Corrective Action' : 'Acción Correctiva'}
                </option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Title *' : 'Título *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  isEn
                    ? 'e.g. Great 5S and Hour by Hour review coverage'
                    : 'Ej. Excelente seguimiento en revisión 5S y Hora x Hora'
                }
                value={feedbackTitle}
                onChange={(e) => setFeedbackTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Message *' : 'Mensaje *'}
              </label>
              <textarea
                rows={3}
                required
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isEn ? 'Send Feedback' : 'Enviar Retroalimentación'}</span>
            </button>
          </form>
        </div>

        {/* Feedback Log */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Feedback History' : 'Historial de Retroalimentación'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {state.supervisorFeedbacks.length} {isEn ? 'records' : 'registros'}
            </span>
          </div>

          <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto">
            {state.supervisorFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        fb.type === 'Reconocimiento'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : fb.type === 'Oportunidad de Mejora'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {fb.type}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isEn ? 'To:' : 'Para:'}{' '}
                      {fb.targetTrainerId === 'trainer_a'
                        ? trainerAUser?.name || 'Israel Martines'
                        : trainerBUser?.name || 'Andreina Morantes'}
                    </span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{fb.date}</span>
                </div>

                <h4 className="mt-2 font-bold text-slate-900 dark:text-white">{fb.title}</h4>
                <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {fb.message}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {isEn ? 'From:' : 'Enviado por:'} <strong>{fb.supervisorName}</strong>
                  </span>
                  {fb.read ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {isEn ? 'Read' : 'Leído'}
                    </span>
                  ) : (
                    <button
                      onClick={() => onMarkFeedbackRead(fb.id)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {isEn ? 'Mark as read' : 'Marcar como leído'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
