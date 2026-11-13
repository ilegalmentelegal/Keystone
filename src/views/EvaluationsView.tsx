import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Filter,
  X,
  Search,
  Calendar,
} from 'lucide-react';
import {
  AppConfig,
  Employee,
  EvaluationRecord,
  Language,
  MonthlyCompetencyCategory,
  RoomDefinition,
  ShiftType,
  UserProfile,
  UserRole,
} from '../types';
import {
  calculateMonthlyEvaluationScore,
  isEligibleForMonthlyEvaluation,
} from '../utils/metrics';
import {
  MONTHLY_COMPETENCIES,
  formatEvalStatus,
  formatPositionLabel,
  formatShiftLabel,
  getLabel,
} from '../utils/i18n';

interface EvaluationsViewProps {
  language: Language;
  config: AppConfig;
  rooms: RoomDefinition[];
  users: UserProfile[];
  evaluations: EvaluationRecord[];
  employees: Employee[];
  currentUser: UserProfile;
  currentRole: UserRole;
  onAddEvaluation: (ev: Omit<EvaluationRecord, 'id'>) => void;
  preselectedEmployee?: Employee | null;
  onClearPreselected?: () => void;
}

const SECTION_META: {
  id: MonthlyCompetencyCategory;
  titleEn: string;
  titleEs: string;
  badgeClass: string;
}[] = [
  {
    id: 'deacom',
    titleEn: 'DEACOM Knowledge (8)',
    titleEs: 'Conocimiento de DEACOM (8)',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'interpersonal',
    titleEn: 'Interpersonal (11)',
    titleEs: 'Interpersonal (11)',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    id: 'intellectual',
    titleEn: 'Intellectual (12)',
    titleEs: 'Intelectual (12)',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
];

function buildDefaultScores(): Record<string, number> {
  const initial: Record<string, number> = {};
  for (const item of MONTHLY_COMPETENCIES) {
    initial[item.id] = 3;
  }
  return initial;
}

export const EvaluationsView: React.FC<EvaluationsViewProps> = ({
  language,
  config,
  rooms,
  users,
  evaluations,
  employees,
  currentUser,
  currentRole,
  onAddEvaluation,
  preselectedEmployee,
  onClearPreselected,
}) => {
  const isEn = language === 'en';
  const isSupervisor = currentRole === 'supervisor';
  const isTrainer = currentRole === 'trainer_a' || currentRole === 'trainer_b';
  const activeTrainerScope = currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a';

  const eligibleEmployees = employees.filter((emp) => {
    if (!isEligibleForMonthlyEvaluation(emp.position)) return false;
    if (isTrainer && emp.trainerId !== activeTrainerScope) return false;
    return true;
  });

  const [filterTrainer, setFilterTrainer] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(
    Boolean(preselectedEmployee && isEligibleForMonthlyEvaluation(preselectedEmployee.position))
  );
  const [selectedEvalDetail, setSelectedEvalDetail] = useState<EvaluationRecord | null>(null);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    preselectedEmployee && isEligibleForMonthlyEvaluation(preselectedEmployee.position)
      ? preselectedEmployee.id
      : eligibleEmployees[0]?.id || ''
  );
  const [evalMonth, setEvalMonth] = useState('2026-11');
  const [evalDate, setEvalDate] = useState('2026-11-12');
  const [scores, setScores] = useState<Record<string, number>>(() => buildDefaultScores());
  const [comments, setComments] = useState('');
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    if (preselectedEmployee && isEligibleForMonthlyEvaluation(preselectedEmployee.position)) {
      setSelectedEmpId(preselectedEmployee.id);
      setScores(buildDefaultScores());
      setIsNewEvalModalOpen(true);
    }
  }, [preselectedEmployee]);

  const selectedEmployeeObj =
    eligibleEmployees.find((e) => e.id === selectedEmpId) || eligibleEmployees[0];

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    setScores(buildDefaultScores());
  };

  const handleScoreChange = (compId: string, val: number) => {
    setScores((prev) => ({
      ...prev,
      [compId]: val,
    }));
  };

  const scoreCalc = calculateMonthlyEvaluationScore(scores);

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeObj) return;

    const trainerUser = users.find((u) => u.role === selectedEmployeeObj.trainerId);

    onAddEvaluation({
      employeeId: selectedEmployeeObj.id,
      employeeName: selectedEmployeeObj.name,
      employeePosition: selectedEmployeeObj.position,
      shift: selectedEmployeeObj.shift,
      room: selectedEmployeeObj.room,
      trainerId: selectedEmployeeObj.trainerId,
      trainerName: isTrainer ? currentUser.name : trainerUser?.name || currentUser.name,
      evaluationMonth: evalMonth,
      date: evalDate,
      scores,
      sectionPercentages: scoreCalc.sectionPercentages,
      overallPercentage: scoreCalc.overallPercentage,
      status: scoreCalc.status,
      comments:
        comments.trim() ||
        (isEn
          ? 'Monthly evaluation completed on floor standards.'
          : 'Evaluación mensual completada según estándares de piso.'),
      reinforcementRecommendations:
        recommendations.trim() ||
        (isEn
          ? 'Continue monthly follow-up on DEACOM and Lead/Second standards.'
          : 'Continuar seguimiento mensual en DEACOM y estándares de liderazgo.'),
    });

    setComments('');
    setRecommendations('');
    setIsNewEvalModalOpen(false);
    if (onClearPreselected) onClearPreselected();
  };

  const availableMonths = Array.from(
    new Set(evaluations.map((ev) => ev.evaluationMonth))
  ).sort((a, b) => b.localeCompare(a));

  const trainerAUser = users.find((u) => u.role === 'trainer_a');
  const trainerBUser = users.find((u) => u.role === 'trainer_b');
  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;

  const filteredEvaluations = evaluations.filter((ev) => {
    if (!isEligibleForMonthlyEvaluation(ev.employeePosition)) return false;
    if (isTrainer && ev.trainerId !== activeTrainerScope) return false;
    if (!isTrainer && filterTrainer !== 'all' && ev.trainerId !== filterTrainer) return false;
    if (filterShift !== 'all' && ev.shift !== filterShift) return false;
    if (filterPosition !== 'all' && ev.employeePosition !== filterPosition) return false;
    if (filterMonth !== 'all' && ev.evaluationMonth !== filterMonth) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !ev.employeeName.toLowerCase().includes(term) &&
        !ev.room.toLowerCase().includes(term) &&
        !ev.trainerName.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('evaluations_title', language, config)}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Monthly evaluation exclusively for Leads & Seconds across DEACOM Knowledge (8), Interpersonal (11), and Intellectual (12).'
                : 'Evaluación mensual exclusiva para Líderes y Segundos: Conocimiento DEACOM (8), Interpersonal (11) e Intelectual (12).'}
            </p>
          </div>

          {!isSupervisor && eligibleEmployees.length > 0 && (
            <button
              onClick={() => {
                if (eligibleEmployees[0]) {
                  handleSelectEmployee(eligibleEmployees[0].id);
                }
                setIsNewEvalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'New Monthly Evaluation' : 'Nueva Evaluación Mensual'}</span>
            </button>
          )}
        </div>

        {/* 3 Section Summary Cards */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
            <span className="font-bold text-blue-900 dark:text-blue-300">
              {isEn ? '1. DEACOM Knowledge (8 items)' : '1. Conocimiento de DEACOM (8 criterios)'}
            </span>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              {isEn
                ? 'Job Number, Print Work Order, Specs, Print Real Time, Delete Real Time, Check Materials, Order Priority, Inspections.'
                : 'Localización de Job Number, Imprimir hoja de trabajo, Especificaciones, Imprimir/Eliminar Real Time, Materiales, Prioridad e Inspecciones.'}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20">
            <span className="font-bold text-purple-900 dark:text-purple-300">
              {isEn ? '2. Interpersonal (11 items)' : '2. Interpersonal (11 criterios)'}
            </span>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              {isEn
                ? 'Trust, Fun, Openness, Growth, Service, Responsive, Sense of Urgency, Proactive, Crucial Conversations, Managing Change, Respect.'
                : 'Trust, Fun, Openness, Growth, Service, Responsive, Sense of Urgency, Proactive, Crucial Conversations, Managing Change y Respect.'}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
            <span className="font-bold text-emerald-900 dark:text-emerald-300">
              {isEn ? '3. Intellectual (12 items)' : '3. Intelectual (12 criterios)'}
            </span>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              {isEn
                ? 'KPIs, Andon, Request Hour to Hour Board, 5S, SOPs, Checklist, TPM, Takt Time, Start Right/End Right, Gemba, Lean House, Company Vision.'
                : 'KPIs, Andon, Request Hour to Hour Board, 5S, SOPs, Checklist, TPM, Takt Time, Start Right/End Right, Gemba, Lean House y Company Vision.'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              isEn
                ? 'Search Lead or Second by name or room...'
                : 'Buscar Líder o Segundo por nombre o cuarto...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />

          {!isTrainer && (
            <select
              value={filterTrainer}
              onChange={(e) => setFilterTrainer(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">{isEn ? 'All Trainers' : 'Ambos Entrenadores'}</option>
              <option value="trainer_a">
                {trainerAUser?.name || 'Israel Martines'} ({trainerALabel})
              </option>
              <option value="trainer_b">
                {trainerBUser?.name || 'Andreina Morantes'} ({trainerBLabel})
              </option>
            </select>
          )}

          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">{isEn ? 'All Shifts' : 'Todos los Turnos'}</option>
            <option value="Shift A (Mon-Wed)">{formatShiftLabel('Shift A (Mon-Wed)', language)}</option>
            <option value="Shift B (Thu-Sat)">{formatShiftLabel('Shift B (Thu-Sat)', language)}</option>
            <option value="Mon-Thu">{formatShiftLabel('Mon-Thu', language)}</option>
          </select>

          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">{isEn ? 'Leads & Seconds' : 'Líderes y Segundos'}</option>
            <option value="Líder">{formatPositionLabel('Líder', language)}</option>
            <option value="Segundo">{formatPositionLabel('Segundo', language)}</option>
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
          >
            <option value="all">{isEn ? 'All Months' : 'Todos los Meses'}</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evaluation Cards */}
      {filteredEvaluations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-slate-500">
          {isEn
            ? 'No monthly evaluations found matching the active filters.'
            : 'No se encontraron evaluaciones mensuales con los filtros aplicados.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvaluations.map((ev) => (
            <div
              key={ev.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {ev.employeeName}
                      </h3>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {ev.evaluationMonth}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatPositionLabel(ev.employeePosition, language)}
                      </span>
                      <span>·</span>
                      <span>{formatShiftLabel(ev.shift, language)}</span>
                      <span>·</span>
                      <span className="font-mono">
                        {rooms.find((r) => r.id === ev.room)?.name || ev.room}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 tabular-nums">
                      {ev.overallPercentage}%
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        ev.status === 'Competente'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : ev.status === 'En Desarrollo'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {formatEvalStatus(ev.status, language)}
                    </span>
                  </div>
                </div>

                {/* Section Percentages Strip */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                    <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                      {ev.sectionPercentages.deacom}%
                    </div>
                    <div className="text-[10px] text-slate-500">DEACOM</div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                    <div className="font-mono font-bold text-purple-700 dark:text-purple-300">
                      {ev.sectionPercentages.interpersonal}%
                    </div>
                    <div className="text-[10px] text-slate-500">Interpersonal</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {ev.sectionPercentages.intellectual}%
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isEn ? 'Intellectual' : 'Intelectual'}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ev.comments}
                </p>

                {ev.reinforcementRecommendations && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
                    <strong className="text-blue-600 dark:text-blue-400">
                      {isEn ? 'Follow-up Focus:' : 'Plan de Refuerzo:'}
                    </strong>{' '}
                    {ev.reinforcementRecommendations}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {isEn ? 'Evaluator:' : 'Evaluador:'}{' '}
                  <strong className="text-slate-700 dark:text-slate-300">{ev.trainerName}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{ev.date}</span>
                  <button
                    onClick={() => setSelectedEvalDetail(ev)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
                  >
                    {isEn ? 'View 31 Criteria' : 'Ver 31 Criterios'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Detail Breakdown */}
      {selectedEvalDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedEvalDetail.employeeName} — {selectedEvalDetail.evaluationMonth}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatPositionLabel(selectedEvalDetail.employeePosition, language)} ·{' '}
                  {formatShiftLabel(selectedEvalDetail.shift, language)} · {selectedEvalDetail.room} ·{' '}
                  {selectedEvalDetail.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvalDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                aria-label={isEn ? 'Close detail' : 'Cerrar detalle'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1">
              {SECTION_META.map((sec) => {
                const items = MONTHLY_COMPETENCIES.filter((c) => c.category === sec.id);
                const pct = selectedEvalDetail.sectionPercentages[sec.id];
                return (
                  <div key={sec.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${sec.badgeClass}`}>
                        {isEn ? sec.titleEn : sec.titleEs}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {pct}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((comp) => {
                        const val = selectedEvalDetail.scores[comp.id] || 0;
                        return (
                          <div
                            key={comp.id}
                            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs gap-2"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {isEn ? comp.labelEn : comp.labelEs}
                            </span>
                            <span className="shrink-0 font-mono font-bold text-purple-600 dark:text-purple-400">
                              {val} / 4
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                {isEn ? 'Overall:' : 'Puntaje Total:'} {selectedEvalDetail.overallPercentage}% (
                {formatEvalStatus(selectedEvalDetail.status, language)})
              </span>
              <button
                onClick={() => setSelectedEvalDetail(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                {isEn ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Monthly Evaluation */}
      {isNewEvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-6 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEn
                    ? 'Monthly Lead / Second Evaluation'
                    : 'Evaluación Mensual de Líderes y Segundos'}
                </h3>
                <span className="text-xs text-slate-500">
                  {isEn
                    ? 'Scale 1–4 across DEACOM Knowledge (8), Interpersonal (11), and Intellectual (12)'
                    : 'Escala 1 a 4 en DEACOM (8), Interpersonal (11) e Intelectual (12)'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsNewEvalModalOpen(false);
                  if (onClearPreselected) onClearPreselected();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Lead or Second *' : 'Líder o Segundo *'}
                  </label>
                  <select
                    value={selectedEmployeeObj?.id || ''}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    {eligibleEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {formatPositionLabel(emp.position, language)} ({formatShiftLabel(emp.shift, language)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Evaluation Month' : 'Mes Evaluado'}
                  </label>
                  <input
                    type="month"
                    required
                    value={evalMonth}
                    onChange={(e) => setEvalMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Evaluation Date' : 'Fecha'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                    <input
                      type="date"
                      required
                      value={evalDate}
                      onChange={(e) => setEvalDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Score Card */}
              <div className="p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-purple-950 dark:text-purple-200">
                    {isEn ? 'Live Overall Score:' : 'Resultado Total en Vivo:'}{' '}
                    <span className="font-mono text-sm">{scoreCalc.overallPercentage}%</span>
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5 font-mono">
                    DEACOM {scoreCalc.sectionPercentages.deacom}% · Interpersonal{' '}
                    {scoreCalc.sectionPercentages.interpersonal}% ·{' '}
                    {isEn ? 'Intellectual' : 'Intelectual'} {scoreCalc.sectionPercentages.intellectual}%
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full self-start sm:self-center ${
                    scoreCalc.status === 'Competente'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : scoreCalc.status === 'En Desarrollo'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {formatEvalStatus(scoreCalc.status, language)}
                </span>
              </div>

              {/* 3 Sections Grouped */}
              <div className="space-y-5">
                {SECTION_META.map((sec) => {
                  const items = MONTHLY_COMPETENCIES.filter((c) => c.category === sec.id);
                  return (
                    <div key={sec.id} className="space-y-2">
                      <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-1 z-10">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${sec.badgeClass}`}>
                          {isEn ? sec.titleEn : sec.titleEs}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                          {scoreCalc.sectionPercentages[sec.id]}%
                        </span>
                      </div>

                      <div className="space-y-2">
                        {items.map((comp, idx) => {
                          const currentVal = scores[comp.id] ?? 3;
                          return (
                            <div
                              key={comp.id}
                              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {idx + 1}. {isEn ? comp.labelEn : comp.labelEs}
                              </span>

                              <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                {[1, 2, 3, 4].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleScoreChange(comp.id, num)}
                                    className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                                      currentVal === num
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Observations & Comments' : 'Comentarios de la Evaluación'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={
                      isEn
                        ? 'Strengths observed in DEACOM, leadership, and floor standards...'
                        : 'Fortalezas observadas en DEACOM, liderazgo y piso...'
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Coaching Focus / Recommendations' : 'Enfoque de Refuerzo'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={
                      isEn
                        ? 'Topics to practice before next monthly review...'
                        : 'Temas a practicar antes de la siguiente revisión mensual...'
                    }
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewEvalModalOpen(false);
                    if (onClearPreselected) onClearPreselected();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Save Monthly Evaluation' : 'Guardar Evaluación Mensual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
