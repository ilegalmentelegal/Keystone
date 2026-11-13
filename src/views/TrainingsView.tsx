import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import {
  AppConfig,
  Employee,
  Language,
  RoomDefinition,
  TrainingSession,
  UserProfile,
  UserRole,
} from '../types';
import {
  formatPositionLabel,
  formatShiftLabel,
  getLabel,
} from '../utils/i18n';

interface TrainingsViewProps {
  language: Language;
  config: AppConfig;
  users: UserProfile[];
  rooms: RoomDefinition[];
  sessions: TrainingSession[];
  employees: Employee[];
  currentUser: UserProfile;
  currentRole: UserRole;
  onAddSession: (session: Omit<TrainingSession, 'id'>) => void;
  preselectedEmployee?: Employee | null;
  onClearPreselected?: () => void;
}

export const TrainingsView: React.FC<TrainingsViewProps> = ({
  language,
  config,
  users,
  rooms,
  sessions,
  employees,
  currentUser,
  currentRole,
  onAddSession,
  preselectedEmployee,
  onClearPreselected,
}) => {
  const isEn = language === 'en';
  const isSupervisor = currentRole === 'supervisor';
  const isTrainer = currentRole === 'trainer_a' || currentRole === 'trainer_b';
  const activeTrainerScope = currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a';

  const scopedEmployees = isTrainer
    ? employees.filter((e) => e.trainerId === activeTrainerScope)
    : employees;

  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterTrainer, setFilterTrainer] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preselectedEmployee));

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState(
    preselectedEmployee ? preselectedEmployee.id : scopedEmployees[0]?.id || ''
  );
  const [sessionDate, setSessionDate] = useState('2026-11-12');
  const [competency, setCompetency] = useState('');
  const [room, setRoom] = useState(preselectedEmployee?.room || '');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmpId(preselectedEmployee.id);
      setRoom(preselectedEmployee.room);
      setIsModalOpen(true);
    }
  }, [preselectedEmployee]);

  const selectedEmployeeObj =
    scopedEmployees.find((e) => e.id === selectedEmpId) || scopedEmployees[0];

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = scopedEmployees.find((e) => e.id === empId);
    if (emp) setRoom(emp.room);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeObj || !competency.trim()) return;

    const trainerUser = users.find((u) => u.role === selectedEmployeeObj.trainerId);

    onAddSession({
      date: sessionDate,
      employeeId: selectedEmployeeObj.id,
      employeeName: selectedEmployeeObj.name,
      employeePosition: selectedEmployeeObj.position,
      shift: selectedEmployeeObj.shift,
      trainerId: selectedEmployeeObj.trainerId,
      trainerName: isTrainer ? currentUser.name : trainerUser?.name || currentUser.name,
      competency: competency.trim(),
      room: room || selectedEmployeeObj.room,
      durationMinutes: Number(durationMinutes) || 30,
      comments:
        comments.trim() ||
        (isEn ? 'Completed training logged.' : 'Entrenamiento realizado y documentado en bitácora.'),
    });

    setCompetency('');
    setComments('');
    setIsModalOpen(false);
    if (onClearPreselected) onClearPreselected();
  };

  const trainerAUser = users.find((u) => u.role === 'trainer_a');
  const trainerBUser = users.find((u) => u.role === 'trainer_b');
  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;

  const visibleSessions = sessions.filter((s) => {
    if (isTrainer && s.trainerId !== activeTrainerScope) return false;
    if (!isTrainer && filterTrainer !== 'all' && s.trainerId !== filterTrainer) return false;
    if (filterShift !== 'all' && s.shift !== filterShift) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !s.employeeName.toLowerCase().includes(term) &&
        !s.competency.toLowerCase().includes(term) &&
        !(s.room || '').toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  const shiftACount = visibleSessions.filter((s) => s.shift === 'Shift A (Mon-Wed)').length;
  const shiftBCount = visibleSessions.filter((s) => s.shift === 'Shift B (Thu-Sat)').length;
  const monThuCount = visibleSessions.filter((s) => s.shift === 'Mon-Thu').length;

  const trainerRooms = isTrainer
    ? rooms.filter((r) => r.trainer === activeTrainerScope)
    : rooms;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('trainings_title', language, config)}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Logbook strictly for completed trainings already delivered on the production floor.'
                : 'Bitácora de entrenamientos ya realizados y completados en piso.'}
            </p>
          </div>

          {!isSupervisor && (
            <button
              onClick={() => {
                if (scopedEmployees[0] && !selectedEmpId) {
                  setSelectedEmpId(scopedEmployees[0].id);
                  setRoom(scopedEmployees[0].room);
                }
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'Log Completed Training' : 'Registrar Entrenamiento Realizado'}</span>
            </button>
          )}
        </div>

        {/* Completed Logbook Summary Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
            <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
              {isEn ? 'Total Completed' : 'Total Realizados'}
            </span>
            <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
              {visibleSessions.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{formatShiftLabel('Shift A (Mon-Wed)', language)}</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {shiftACount}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{formatShiftLabel('Shift B (Thu-Sat)', language)}</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {shiftBCount}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{formatShiftLabel('Mon-Thu', language)}</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {monThuCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              isEn
                ? 'Search by employee, topic or room...'
                : 'Buscar por empleado, tema o cuarto...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />

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

          {!isTrainer && (
            <select
              value={filterTrainer}
              onChange={(e) => setFilterTrainer(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">{isEn ? 'Both Trainers' : 'Ambos Entrenadores'}</option>
              <option value="trainer_a">
                {trainerAUser?.name || 'Israel Martines'} ({trainerALabel})
              </option>
              <option value="trainer_b">
                {trainerBUser?.name || 'Andreina Morantes'} ({trainerBLabel})
              </option>
            </select>
          )}
        </div>
      </div>

      {/* Completed Logbook List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            {isEn ? 'Completed Trainings Logbook' : 'Bitácora de Entrenamientos Ya Hechos'}
          </span>
          <span className="text-[11px] text-slate-500">
            {visibleSessions.length} {isEn ? 'records' : 'registros'}
          </span>
        </div>

        {visibleSessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            {isEn
              ? 'No completed trainings match the current filters.'
              : 'No se encontraron entrenamientos realizados con los filtros aplicados.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white">
                      {session.employeeName}
                    </span>
                    {session.employeePosition && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {formatPositionLabel(session.employeePosition, language)}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {formatShiftLabel(session.shift, language)}
                    </span>
                    {session.room && (
                      <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {rooms.find((r) => r.id === session.room)?.name || session.room}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {isEn ? 'Completed' : 'Completado'}
                    </span>
                  </div>

                  <div className="mt-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {isEn ? 'Topic:' : 'Tema:'} {session.competency}
                  </div>

                  <p className="mt-1 text-slate-600 dark:text-slate-300">{session.comments}</p>
                </div>

                <div className="shrink-0 self-end sm:self-center text-right font-mono text-[11px] text-slate-500 space-y-0.5">
                  <div>
                    {isEn ? 'Completed:' : 'Fecha:'}{' '}
                    <strong className="text-slate-700 dark:text-slate-300">{session.date}</strong>
                  </div>
                  <div>
                    {isEn ? 'Trainer:' : 'Entrenador:'} {session.trainerName}
                  </div>
                  {session.durationMinutes && (
                    <div className="flex items-center justify-end gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{session.durationMinutes} min</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Log Completed Training */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Log Completed Training' : 'Registrar Entrenamiento Realizado'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onClearPreselected) onClearPreselected();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                aria-label={isEn ? 'Close modal' : 'Cerrar modal'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Employee *' : 'Empleado *'}
                  </label>
                  <select
                    value={selectedEmployeeObj?.id || ''}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    {scopedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({formatShiftLabel(emp.shift, language)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Completion Date *' : 'Fecha Realizada *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Training Topic / Competency Completed *' : 'Tema o Competencia Completada *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isEn
                      ? 'e.g. DEACOM Print Real Time, 5S, or Start Right / End Right'
                      : 'Ej. DEACOM Imprimir Real Time, 5S o Start Right / End Right'
                  }
                  value={competency}
                  onChange={(e) => setCompetency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Room (Optional)' : 'Cuarto (Opcional)'}
                  </label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">{isEn ? 'General' : 'General'}</option>
                    {trainerRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Duration (minutes)' : 'Duración (minutos)'}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Completion Notes' : 'Notas de Cierre'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    isEn
                      ? 'Summarize what was trained and verified on the floor...'
                      : 'Resume lo que se entrenó y verificó en piso...'
                  }
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
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
                  {isEn ? 'Save Completed Training' : 'Guardar en Bitácora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
