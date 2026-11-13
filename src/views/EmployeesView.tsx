import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Award,
  GraduationCap,
  X,
} from 'lucide-react';
import {
  AppConfig,
  Employee,
  EmployeePosition,
  EvaluationRecord,
  Language,
  RoomDefinition,
  ShiftType,
  TrainingSession,
  UserProfile,
  UserRole,
} from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  formatEvalStatus,
  formatPositionLabel,
  formatShiftLabel,
  getLabel,
} from '../utils/i18n';

interface EmployeesViewProps {
  language: Language;
  config: AppConfig;
  rooms: RoomDefinition[];
  users: UserProfile[];
  employees: Employee[];
  evaluations: EvaluationRecord[];
  trainingSessions: TrainingSession[];
  currentUser: UserProfile;
  currentRole: UserRole;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onToggleStatus: (empId: string) => void;
  onStartEvaluation: (emp: Employee) => void;
  onStartTraining: (emp: Employee) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  language,
  config,
  rooms,
  users,
  employees,
  evaluations,
  trainingSessions,
  currentRole,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onToggleStatus,
  onStartEvaluation,
  onStartTraining,
}) => {
  const isEn = language === 'en';
  const isSupervisor = currentRole === 'supervisor';
  const isSupervisorOrAdmin = currentRole === 'supervisor' || currentRole === 'admin';
  const defaultTrainerId: 'trainer_a' | 'trainer_b' =
    currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a';

  const trainerAName = users.find((u) => u.role === 'trainer_a')?.name || 'Israel Martines';
  const trainerBName = users.find((u) => u.role === 'trainer_b')?.name || 'Andreina Morantes';
  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;

  // Filters
  const [filterTrainer, setFilterTrainer] = useState<'all' | 'trainer_a' | 'trainer_b'>(
    isSupervisorOrAdmin ? 'all' : defaultTrainerId
  );
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Add Form State
  const [formTrainerId, setFormTrainerId] = useState<'trainer_a' | 'trainer_b'>(defaultTrainerId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState<EmployeePosition>('Operador');
  const [shift, setShift] = useState<ShiftType>(
    defaultTrainerId === 'trainer_a' ? 'Shift A (Mon-Wed)' : 'Mon-Thu'
  );
  const [room, setRoom] = useState(
    rooms.find((r) => r.trainer === defaultTrainerId)?.id || 'P10'
  );
  const [area, setArea] = useState(
    defaultTrainerId === 'trainer_a' ? 'Stick Pack' : 'Cuartos'
  );
  const [hireDate, setHireDate] = useState('2025-01-15');
  const [notes, setNotes] = useState('');

  // Strict trainer separation when logged in as a Trainer
  const trainerScopedEmployees = isSupervisorOrAdmin
    ? employees.filter((e) => (filterTrainer === 'all' ? true : e.trainerId === filterTrainer))
    : employees.filter((e) => e.trainerId === defaultTrainerId);

  const filteredEmployees = trainerScopedEmployees.filter((emp) => {
    if (filterShift !== 'all' && emp.shift !== filterShift) return false;
    if (filterPosition !== 'all' && emp.position !== filterPosition) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !emp.name.toLowerCase().includes(term) &&
        !emp.code.toLowerCase().includes(term) &&
        !emp.room.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleOpenAddModal = () => {
    const tId = isSupervisorOrAdmin && filterTrainer !== 'all' ? filterTrainer : defaultTrainerId;
    setFormTrainerId(tId);
    setShift(tId === 'trainer_a' ? 'Shift A (Mon-Wed)' : 'Mon-Thu');
    setRoom(rooms.find((r) => r.trainer === tId)?.id || rooms[0]?.id || 'P10');
    setArea(tId === 'trainer_a' ? 'Stick Pack' : 'Cuartos');
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddEmployee({
      code: code.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      trainerId: formTrainerId,
      area: area.trim() || (formTrainerId === 'trainer_a' ? 'Stick Pack' : 'Cuartos'),
      room,
      position,
      status: 'Activo',
      shift,
      hireDate,
      currentCompetencyLevel: 1,
      notes: notes.trim() || undefined,
    });

    setCode('');
    setName('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    onUpdateEmployee(editingEmployee);
    setEditingEmployee(null);
  };

  const activeTrainerRooms = rooms.filter((r) => r.trainer === formTrainerId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('employees_title', language, config)}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isSupervisorOrAdmin
                ? isEn
                  ? 'Personnel separated by Trainer and Shift (Stick Pack Shift A/B & Rooms Mon–Thu).'
                  : 'Personal separado por Entrenador y Turno (Stick Pack Turno A/B y Cuartos Lun–Jue).'
                : currentRole === 'trainer_a'
                ? `${trainerAName} · ${isEn ? config.trainerAScheduleEn : config.trainerAScheduleEs}`
                : `${trainerBName} · ${isEn ? config.trainerBScheduleEn : config.trainerBScheduleEs}`}
            </p>
          </div>

          {!isSupervisor && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'New Employee' : 'Nuevo Empleado'}</span>
            </button>
          )}
        </div>

        {/* Summary KPI Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{isEn ? 'Assigned Staff' : 'Personal Asignado'}</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {trainerScopedEmployees.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{isEn ? 'Leads' : 'Líderes'}</span>
            <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
              {trainerScopedEmployees.filter((e) => e.position === 'Líder').length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{isEn ? 'Seconds' : 'Segundos'}</span>
            <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
              {trainerScopedEmployees.filter((e) => e.position === 'Segundo').length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-500 text-[11px]">{isEn ? 'Operators' : 'Operadores'}</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {trainerScopedEmployees.filter((e) => e.position === 'Operador').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Shift Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isEn ? 'Search name, code, or room...' : 'Buscar nombre, código o cuarto...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSupervisorOrAdmin && (
              <select
                value={filterTrainer}
                onChange={(e) => setFilterTrainer(e.target.value as 'all' | 'trainer_a' | 'trainer_b')}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="all">{isEn ? 'All Trainers' : 'Ambos Entrenadores'}</option>
                <option value="trainer_a">{trainerAName} ({trainerALabel})</option>
                <option value="trainer_b">{trainerBName} ({trainerBLabel})</option>
              </select>
            )}

            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">{isEn ? 'All Positions' : 'Todos los puestos'}</option>
              <option value="Líder">{formatPositionLabel('Líder', language)}</option>
              <option value="Segundo">{formatPositionLabel('Segundo', language)}</option>
              <option value="Operador">{formatPositionLabel('Operador', language)}</option>
            </select>
          </div>
        </div>

        {/* Shift Separation Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-500">
            {isEn ? 'Shift Filter:' : 'Separar por Turno:'}
          </span>
          <button
            onClick={() => setFilterShift('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterShift === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {isEn ? 'All Shifts' : 'Todos los Turnos'}
          </button>
          {(currentRole !== 'trainer_b' || isSupervisorOrAdmin) && (
            <>
              <button
                onClick={() => setFilterShift('Shift A (Mon-Wed)')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterShift === 'Shift A (Mon-Wed)'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {formatShiftLabel('Shift A (Mon-Wed)', language)}
              </button>
              <button
                onClick={() => setFilterShift('Shift B (Thu-Sat)')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterShift === 'Shift B (Thu-Sat)'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {formatShiftLabel('Shift B (Thu-Sat)', language)}
              </button>
            </>
          )}
          {(currentRole !== 'trainer_a' || isSupervisorOrAdmin) && (
            <button
              onClick={() => setFilterShift('Mon-Thu')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterShift === 'Mon-Thu'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {formatShiftLabel('Mon-Thu', language)}
            </button>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{isEn ? 'Employee / Code' : 'Empleado / Código'}</th>
                <th className="px-4 py-3">{isEn ? 'Position' : 'Puesto'}</th>
                <th className="px-4 py-3">{isEn ? 'Shift' : 'Turno'}</th>
                <th className="px-4 py-3">{isEn ? 'Room & Trainer' : 'Cuarto y Entrenador'}</th>
                <th className="px-4 py-3">{isEn ? 'Last Evaluation' : 'Última Eval.'}</th>
                <th className="px-4 py-3">{isEn ? 'Status' : 'Estado'}</th>
                <th className="px-4 py-3 text-right">{isEn ? 'Actions' : 'Acciones'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.map((emp) => {
                const empEvals = evaluations.filter((ev) => ev.employeeId === emp.id);
                const latestEval = empEvals[0];

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {emp.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{emp.code}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.position === 'Líder'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : emp.position === 'Segundo'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {formatPositionLabel(emp.position, language)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {formatShiftLabel(emp.shift, language)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {rooms.find((r) => r.id === emp.room)?.name || emp.room}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {emp.trainerId === 'trainer_a' ? trainerAName : trainerBName}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {latestEval ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {latestEval.overallPercentage}%
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({formatEvalStatus(latestEval.status, language)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          {emp.position === 'Operador'
                            ? isEn
                              ? 'Operator'
                              : 'Operador'
                            : isEn
                            ? 'Pending'
                            : 'Pendiente'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        disabled={isSupervisor}
                        onClick={() => onToggleStatus(emp.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          emp.status === 'Activo'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {emp.status === 'Activo' ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <UserX className="w-3 h-3" />
                        )}
                        <span>{emp.status === 'Activo' ? (isEn ? 'Active' : 'Activo') : isEn ? 'Inactive' : 'Inactivo'}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedEmployeeForDetail(emp)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          {isEn ? 'Profile' : 'Ficha'}
                        </button>

                        {!isSupervisor && (
                          <>
                            {(emp.position === 'Líder' || emp.position === 'Segundo') && (
                              <button
                                onClick={() => onStartEvaluation(emp)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded"
                                title={isEn ? 'Monthly Evaluation' : 'Evaluación Mensual'}
                              >
                                <Award className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => onStartTraining(emp)}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                              title={isEn ? 'Log Completed Training' : 'Registrar Entrenamiento'}
                            >
                              <GraduationCap className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setEditingEmployee(emp)}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
                              title={isEn ? 'Edit' : 'Editar'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded"
                              title={isEn ? 'Delete' : 'Eliminar'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Employee Profile */}
      {selectedEmployeeForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedEmployeeForDetail.name}
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {selectedEmployeeForDetail.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatPositionLabel(selectedEmployeeForDetail.position, language)} · {formatShiftLabel(selectedEmployeeForDetail.shift, language)} · {selectedEmployeeForDetail.room}
                </p>
              </div>
              <button onClick={() => setSelectedEmployeeForDetail(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  {isEn ? 'Completed Trainings Logbook' : 'Entrenamientos Realizados'}
                </h4>
                {trainingSessions.filter((t) => t.employeeId === selectedEmployeeForDetail.id).length === 0 ? (
                  <p className="text-slate-400">{isEn ? 'No completed trainings yet.' : 'Sin entrenamientos registrados.'}</p>
                ) : (
                  <div className="space-y-2">
                    {trainingSessions
                      .filter((t) => t.employeeId === selectedEmployeeForDetail.id)
                      .map((ts) => (
                        <div key={ts.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="flex justify-between font-semibold">
                            <span>{ts.competency}</span>
                            <span className="font-mono text-slate-400">{ts.date}</span>
                          </div>
                          <p className="text-slate-500 mt-1">{ts.comments}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {(selectedEmployeeForDetail.position === 'Líder' ||
                selectedEmployeeForDetail.position === 'Segundo') && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-600" />
                    {isEn ? 'Monthly Evaluations' : 'Evaluaciones Mensuales'}
                  </h4>
                  {evaluations.filter((ev) => ev.employeeId === selectedEmployeeForDetail.id).length === 0 ? (
                    <p className="text-slate-400">{isEn ? 'No monthly evaluations yet.' : 'Sin evaluaciones mensuales.'}</p>
                  ) : (
                    <div className="space-y-2">
                      {evaluations
                        .filter((ev) => ev.employeeId === selectedEmployeeForDetail.id)
                        .map((ev) => (
                          <div key={ev.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between font-bold">
                              <span>{ev.evaluationMonth}</span>
                              <span className="font-mono text-purple-600">{ev.overallPercentage}%</span>
                            </div>
                            <p className="text-slate-500 mt-1">{ev.comments}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Add Employee' : 'Nuevo Empleado'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Trainer *' : 'Entrenador *'}</label>
                  <select
                    disabled={!isSupervisorOrAdmin}
                    value={formTrainerId}
                    onChange={(e) => {
                      const nextT = e.target.value as 'trainer_a' | 'trainer_b';
                      setFormTrainerId(nextT);
                      setShift(nextT === 'trainer_a' ? 'Shift A (Mon-Wed)' : 'Mon-Thu');
                      setRoom(rooms.find((r) => r.trainer === nextT)?.id || '');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="trainer_a">{trainerAName} ({trainerALabel})</option>
                    <option value="trainer_b">{trainerBName} ({trainerBLabel})</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Shift *' : 'Turno *'}</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as ShiftType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {formTrainerId === 'trainer_a' ? (
                      <>
                        <option value="Shift A (Mon-Wed)">{formatShiftLabel('Shift A (Mon-Wed)', language)}</option>
                        <option value="Shift B (Thu-Sat)">{formatShiftLabel('Shift B (Thu-Sat)', language)}</option>
                      </>
                    ) : (
                      <option value="Mon-Thu">{formatShiftLabel('Mon-Thu', language)}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Employee Code' : 'Código EMP'}</label>
                  <input
                    type="text"
                    placeholder="EMP-1099"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Position *' : 'Puesto *'}</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as EmployeePosition)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Operador">{formatPositionLabel('Operador', language)}</option>
                    <option value="Segundo">{formatPositionLabel('Segundo', language)}</option>
                    <option value="Líder">{formatPositionLabel('Líder', language)}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">{isEn ? 'Full Name *' : 'Nombre Completo *'}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Assigned Room' : 'Cuarto'}</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {activeTrainerRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Hire Date' : 'Fecha Ingreso'}</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-1.5 rounded-lg">
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                  {isEn ? 'Save Employee' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Employee */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Edit Employee' : 'Editar Empleado'}: {editingEmployee.name}
              </h3>
              <button onClick={() => setEditingEmployee(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Full Name' : 'Nombre'}</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Position' : 'Puesto'}</label>
                  <select
                    value={editingEmployee.position}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, position: e.target.value as EmployeePosition })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Operador">{formatPositionLabel('Operador', language)}</option>
                    <option value="Segundo">{formatPositionLabel('Segundo', language)}</option>
                    <option value="Líder">{formatPositionLabel('Líder', language)}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Shift' : 'Turno'}</label>
                  <select
                    value={editingEmployee.shift}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, shift: e.target.value as ShiftType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Shift A (Mon-Wed)">{formatShiftLabel('Shift A (Mon-Wed)', language)}</option>
                    <option value="Shift B (Thu-Sat)">{formatShiftLabel('Shift B (Thu-Sat)', language)}</option>
                    <option value="Mon-Thu">{formatShiftLabel('Mon-Thu', language)}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Room' : 'Cuarto'}</label>
                  <select
                    value={editingEmployee.room}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {rooms
                      .filter((r) => r.trainer === editingEmployee.trainerId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setEditingEmployee(null)} className="px-3 py-1.5 rounded-lg">
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="px-4 py-1.5 font-semibold text-white bg-blue-600 rounded-lg">
                  {isEn ? 'Save Changes' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!employeeToDelete}
        title={isEn ? 'Delete Employee' : 'Eliminar Empleado'}
        message={
          isEn
            ? `Are you sure you want to delete ${employeeToDelete?.name}?`
            : `¿Estás seguro de eliminar a ${employeeToDelete?.name}?`
        }
        confirmLabel={isEn ? 'Delete' : 'Eliminar'}
        onConfirm={() => {
          if (employeeToDelete) {
            onDeleteEmployee(employeeToDelete.id);
            setEmployeeToDelete(null);
          }
        }}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
};
