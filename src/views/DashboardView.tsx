import React from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  TrendingUp,
  Award,
  ArrowRight,
  Calendar,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { AppState } from '../utils/storage';
import { Language, UserProfile, UserRole } from '../types';
import {
  calculateWorkStandardCompliance,
  isRoomInTrainerScope,
} from '../utils/metrics';
import { formatShiftLabel, formatTaskCategory, getLabel } from '../utils/i18n';
import { ActiveTab } from '../components/Sidebar';

interface DashboardViewProps {
  language: Language;
  state: AppState;
  currentUser: UserProfile;
  currentRole: UserRole;
  onNavigate: (tab: ActiveTab) => void;
  onToggleTaskComplete: (taskId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  language,
  state,
  currentUser,
  currentRole,
  onNavigate,
  onToggleTaskComplete,
}) => {
  const isEn = language === 'en';
  const { config, users, rooms } = state;
  const isSupervisorOrAdmin = currentRole === 'supervisor' || currentRole === 'admin';
  const activeTrainerId = currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a';

  const relevantTasks = isSupervisorOrAdmin
    ? state.tasks
    : state.tasks.filter((t) => t.trainerId === activeTrainerId);

  const compliance = calculateWorkStandardCompliance(relevantTasks);

  const trainerRooms = isSupervisorOrAdmin
    ? rooms
    : rooms.filter((r) => isRoomInTrainerScope(r.id, activeTrainerId, rooms));

  const todayStr = '2026-11-12';
  const relevantReviews = state.roomReviews.filter((r) => {
    if (!isSupervisorOrAdmin && r.trainerId !== activeTrainerId) return false;
    return r.date === todayStr;
  });

  const avgReviewCompletion =
    relevantReviews.length > 0
      ? Math.round(
          relevantReviews.reduce((acc, r) => acc + r.completionPercentage, 0) /
            relevantReviews.length
        )
      : 0;

  const relevantTrainings = state.trainingSessions.filter((t) => {
    if (!isSupervisorOrAdmin && t.trainerId !== activeTrainerId) return false;
    return true;
  });

  const relevantEvaluations = state.evaluations.filter((e) => {
    if (!isSupervisorOrAdmin && e.trainerId !== activeTrainerId) return false;
    return true;
  });

  const avgEvalScore =
    relevantEvaluations.length > 0
      ? Math.round(
          relevantEvaluations.reduce((acc, e) => acc + e.overallPercentage, 0) /
            relevantEvaluations.length
        )
      : 0;

  // Trainer breakdown
  const trainerAUser = users.find((u) => u.role === 'trainer_a');
  const trainerBUser = users.find((u) => u.role === 'trainer_b');
  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;
  const trainerASchedule = isEn ? config.trainerAScheduleEn : config.trainerAScheduleEs;
  const trainerBSchedule = isEn ? config.trainerBScheduleEn : config.trainerBScheduleEs;

  const tasksTrainerA = state.tasks.filter((t) => t.trainerId === 'trainer_a');
  const tasksTrainerB = state.tasks.filter((t) => t.trainerId === 'trainer_b');
  const compA = calculateWorkStandardCompliance(tasksTrainerA);
  const compB = calculateWorkStandardCompliance(tasksTrainerB);

  const reviewsA = state.roomReviews.filter((r) => r.trainerId === 'trainer_a');
  const reviewsB = state.roomReviews.filter((r) => r.trainerId === 'trainer_b');

  const getRoleDisplayTitle = () => {
    if (currentRole === 'trainer_a') return trainerALabel;
    if (currentRole === 'trainer_b') return trainerBLabel;
    if (currentRole === 'supervisor')
      return isEn ? config.supervisorLabelEn : config.supervisorLabelEs;
    return config.adminLabel;
  };

  const getScheduleLine = () => {
    if (currentRole === 'trainer_a') return trainerASchedule;
    if (currentRole === 'trainer_b') return trainerBSchedule;
    return isEn ? 'All Plant Areas' : 'Planta Completa';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {getLabel('dashboard_title', language, config)}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium">
                {currentUser.name} · {getRoleDisplayTitle()}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {getScheduleLine()} ·{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {trainerRooms.map((r) => r.name).join(', ')}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('work_standard')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {isEn ? 'Standard Work' : 'Ver Estándar'}
            </button>
            <button
              onClick={() => onNavigate('room_reviews')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isEn ? 'Review Room' : 'Revisar Cuarto'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rooms Reviewed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Rooms Reviewed Today' : 'Cuartos Revisados Hoy'}
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {relevantReviews.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isEn ? `of ${trainerRooms.length} rooms` : `de ${trainerRooms.length} cuartos`}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {relevantReviews.length > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {isEn
                  ? `${avgReviewCompletion}% avg checklist completion`
                  : `${avgReviewCompletion}% promedio casillas llenas`}
              </span>
            ) : (
              <span>
                {isEn
                  ? `${trainerRooms.length} rooms pending review`
                  : `Faltan ${trainerRooms.length} cuartos por revisar`}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Standard Work Compliance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Standard Work Compliance' : 'Cumplimiento Estándar'}
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {compliance.percentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({compliance.completed + compliance.supportCount}/{compliance.total})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {compliance.pending} {isEn ? 'pending blocks' : 'actividades pendientes'}
            </span>
          </div>
        </div>

        {/* Card 3: Completed Trainings Logbook */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Completed Trainings' : 'Entrenamientos Realizados'}
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {relevantTrainings.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isEn ? 'logged' : 'en bitácora'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {isEn ? 'Completed floor sessions' : 'Entrenamientos ya hechos'}
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Evaluations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Monthly Evaluations' : 'Evaluaciones Mensuales'}
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tabular-nums">
              {avgEvalScore}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({relevantEvaluations.length} {isEn ? 'records' : 'registros'})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{isEn ? 'Leads & Seconds (31 criteria)' : 'Líderes y Segundos (31 criterios)'}</span>
          </div>
        </div>
      </div>

      {/* Supervisor / Admin Comparative Strip */}
      {isSupervisorOrAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isEn ? 'Trainers Overview' : 'Resumen Comparativo de Entrenadores'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('supervision')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {isEn ? 'Supervision Panel' : 'Panel de Supervisión'}{' '}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stick Pack Trainer */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {trainerAUser?.name || 'Israel Martines'} · {trainerALabel}
                  </span>
                  <div className="text-[11px] text-slate-500">{trainerASchedule}</div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {compA.percentage}% TSW
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {reviewsA.length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Rooms Rev.' : 'Cuartos Rev.'}
                  </div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {state.evaluations.filter((e) => e.trainerId === 'trainer_a').length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Monthly Evals' : 'Evaluaciones'}
                  </div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {state.trainingSessions.filter((t) => t.trainerId === 'trainer_a').length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Trainings' : 'Entrenamientos'}
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms Trainer */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {trainerBUser?.name || 'Andreina Morantes'} · {trainerBLabel}
                  </span>
                  <div className="text-[11px] text-slate-500">{trainerBSchedule}</div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {compB.percentage}% TSW
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {reviewsB.length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Rooms Rev.' : 'Cuartos Rev.'}
                  </div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {state.evaluations.filter((e) => e.trainerId === 'trainer_b').length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Monthly Evals' : 'Evaluaciones'}
                  </div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {state.trainingSessions.filter((t) => t.trainerId === 'trainer_b').length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Trainings' : 'Entrenamientos'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split: Agenda & Room Checklist Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isEn ? "Today's General Standard Work" : 'Agenda General del Día (Estándar)'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('work_standard')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {isEn ? 'Open Schedule' : 'Ver Horarios'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {relevantTasks.slice(0, 5).map((task) => {
              const displayTitle = isEn && task.titleEn ? task.titleEn : task.title;
              return (
                <div
                  key={task.id}
                  className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => onToggleTaskComplete(task.id)}
                      className="mt-0.5 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      aria-label={displayTitle}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          {task.startTime} - {task.endTime}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTaskCategory(task.category, language)}
                        </span>
                        {task.isModifiedSpecific && task.customRoomNote && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                            {task.customRoomNote}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs mt-1 font-medium ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {displayTitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        task.completed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : task.isCreditedSupport
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {task.completed
                        ? isEn
                          ? 'Done'
                          : 'Listo'
                        : task.isCreditedSupport
                        ? isEn
                          ? 'Support'
                          : 'Apoyo'
                        : isEn
                        ? 'Pending'
                        : 'Pendiente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Rooms Status (Checklist % instead of Support Flags) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isEn ? 'Room Review Status' : 'Estatus de Cuartos'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('room_reviews')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isEn ? 'Reviews' : 'Revisiones'}
            </button>
          </div>

          <div className="mt-3 space-y-2 flex-1 overflow-y-auto max-h-[440px]">
            {trainerRooms.map((room) => {
              const review = state.roomReviews.find((r) => r.roomId === room.id);
              return (
                <div
                  key={room.id}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {room.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {room.lineType}
                      {review ? ` · ${formatShiftLabel(review.shift, language)}` : ''}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {review ? (
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          review.completionPercentage === 100
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {review.completionPercentage}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {isEn ? 'Pending' : 'Pendiente'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigate('room_reviews')}
              className="w-full py-2 text-xs font-semibold text-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isEn ? 'Open Room Checklists' : 'Abrir Revisiones de Cuartos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
