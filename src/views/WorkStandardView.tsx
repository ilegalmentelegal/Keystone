import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Calendar,
  Save,
  X,
  Eye,
  FileText,
  Paperclip,
  Check,
  RotateCcw,
  Wrench,
  Users,
  Upload,
  Info,
  AlertTriangle,
} from 'lucide-react';
import {
  AppConfig,
  DailySummary,
  Employee,
  EmployeeWeakness,
  ImprovementObservation,
  Language,
  RoomDefinition,
  TaskEvidence,
  TaskExecutionStatus,
  TrainingSession,
  UserProfile,
  UserRole,
  VisualRoomReview,
  WorkStandardNoteCategory,
  WorkStandardTask,
} from '../types';
import { calculateWorkStandardCompliance } from '../utils/metrics';
import { formatSupportReason, formatTaskCategory, getLabel } from '../utils/i18n';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { VisualReviewModal } from '../components/standard_work/VisualReviewModal';
import { WeaknessDrawerModal } from '../components/standard_work/WeaknessDrawerModal';
import { DailySummaryModal } from '../components/standard_work/DailySummaryModal';
import { ImprovementNotesSection } from '../components/standard_work/ImprovementNotesSection';

interface WorkStandardViewProps {
  language: Language;
  config: AppConfig;
  users: UserProfile[];
  tasks: WorkStandardTask[];
  rooms: RoomDefinition[];
  employees: Employee[];
  visualReviews: VisualRoomReview[];
  weaknesses: EmployeeWeakness[];
  trainingSessions: TrainingSession[];
  observations: ImprovementObservation[];
  dailySummaries: DailySummary[];
  currentUser: UserProfile;
  currentRole: UserRole;
  onAddTask: (task: Omit<WorkStandardTask, 'id'>) => void;
  onUpdateTask: (task: WorkStandardTask) => void;
  onDeleteTask: (taskId: string) => void;
  onSaveVisualReview: (
    review: Omit<VisualRoomReview, 'id' | 'createdAt'>,
    createWeakness?: { employeeId: string; description: string }
  ) => void;
  onSaveWeakness: (
    weakness: Omit<EmployeeWeakness, 'id' | 'createdAt'>,
    completedTrainingTopic?: string
  ) => void;
  onSaveDailySummary: (summary: DailySummary) => void;
  onAddObservation: (obs: Omit<ImprovementObservation, 'id' | 'createdAt'>) => void;
  onUpdateObservationStatus: (
    id: string,
    status: 'Pendiente' | 'En proceso' | 'Resuelto'
  ) => void;
}

const SUPPORT_OPTIONS: {
  label: WorkStandardNoteCategory;
  labelEn: string;
  descEs: string;
  descEn: string;
  isProduction?: boolean;
}[] = [
  {
    label: 'Apoyo en producción',
    labelEn: 'Production Support',
    descEs: 'Atención a paros, contención de calidad o soporte directo en línea (Acreditado)',
    descEn: 'Line stop support, quality containment, or hands-on floor coverage (Credited)',
    isProduction: true,
  },
  {
    label: 'Entrenamiento de otro empleado',
    labelEn: 'Training Another Employee',
    descEs: 'Urgencia formativa imprevista en otra línea o turno',
    descEn: 'Unplanned urgent coaching on another line or shift',
  },
  {
    label: 'Problemas técnicos',
    labelEn: 'Technical Issues',
    descEs: 'Falla mecánica, eléctrica o ajuste en envasado',
    descEn: 'Mechanical, electrical, or packaging equipment issue',
  },
  {
    label: 'Falta de personal',
    labelEn: 'Staffing Shortage',
    descEs: 'Ausentismo que requirió cobertura o reasignación',
    descEn: 'Absence requiring line coverage or reassignment',
  },
  {
    label: 'Cuarto detenido o no disponible',
    labelEn: 'Line Stopped / Unavailable',
    descEs: 'Sanitización, falta de material o paro programado',
    descEn: 'Sanitation, material wait, or scheduled downtime',
  },
  {
    label: 'Reunión',
    labelEn: 'Meeting',
    descEs: 'Junta operativa o reunión con supervisión',
    descEn: 'Operations meeting or supervisor sync',
  },
  {
    label: 'Otras responsabilidades',
    labelEn: 'Other Responsibilities',
    descEs: 'Solicitud especial de calidad o gerencia',
    descEn: 'Special quality or management assignment',
  },
  {
    label: 'Otro motivo',
    labelEn: 'Other Reason',
    descEs: 'Especificar detalle en observaciones',
    descEn: 'Specify detail in observations',
  },
];

export const WorkStandardView: React.FC<WorkStandardViewProps> = ({
  language,
  config,
  users,
  tasks,
  rooms,
  employees,
  visualReviews,
  weaknesses,
  trainingSessions,
  observations,
  dailySummaries,
  currentUser,
  currentRole,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSaveVisualReview,
  onSaveWeakness,
  onSaveDailySummary,
  onAddObservation,
  onUpdateObservationStatus,
}) => {
  const isEn = language === 'en';
  const isSupervisor = currentRole === 'supervisor';
  const [selectedTrainer, setSelectedTrainer] = useState<'trainer_a' | 'trainer_b'>(
    currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a'
  );

  const [selectedDate, setSelectedDate] = useState('2026-11-12');
  const [activeTab, setActiveTab] = useState<'schedule' | 'observations' | 'history'>('schedule');

  // Modals
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
  const [isWeaknessModalOpen, setIsWeaknessModalOpen] = useState(false);
  const [isDailySummaryModalOpen, setIsDailySummaryModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkStandardTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<WorkStandardTask | null>(null);
  const [supportModalTask, setSupportModalTask] = useState<WorkStandardTask | null>(null);
  const [evidenceTask, setEvidenceTask] = useState<WorkStandardTask | null>(null);

  // Evidence state
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');

  // New task form state (General by default)
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:30');
  const [newEndTime, setNewEndTime] = useState('09:00');
  const [newCategory, setNewCategory] = useState<WorkStandardTask['category']>('Revisión general');
  const [newIsSpecific, setNewIsSpecific] = useState(false);
  const [newCustomRoomNote, setNewCustomRoomNote] = useState('');
  const [newComments, setNewComments] = useState('');

  const effectiveTrainer: 'trainer_a' | 'trainer_b' =
    currentRole === 'trainer_b'
      ? 'trainer_b'
      : currentRole === 'trainer_a'
      ? 'trainer_a'
      : selectedTrainer;

  const filteredTasks = tasks.filter(
    (t) => t.trainerId === effectiveTrainer && t.date === selectedDate
  );

  const compliance = calculateWorkStandardCompliance(filteredTasks);
  const trainerRooms = rooms.filter((r) => r.trainer === effectiveTrainer);
  const trainerEmployees = employees.filter((e) => e.trainerId === effectiveTrainer);

  const trainerAUser = users.find((u) => u.role === 'trainer_a');
  const trainerBUser = users.find((u) => u.role === 'trainer_b');
  const trainerALabel = isEn ? config.trainerALabelEn : config.trainerALabelEs;
  const trainerBLabel = isEn ? config.trainerBLabelEn : config.trainerBLabelEs;
  const activeTrainerName =
    effectiveTrainer === 'trainer_a'
      ? trainerAUser?.name || 'Israel Martines'
      : trainerBUser?.name || 'Andreina Morantes';
  const activeTrainerTitle = effectiveTrainer === 'trainer_a' ? trainerALabel : trainerBLabel;
  const activeSchedule =
    effectiveTrainer === 'trainer_a'
      ? isEn
        ? config.trainerAScheduleEn
        : config.trainerAScheduleEs
      : isEn
      ? config.trainerBScheduleEn
      : config.trainerBScheduleEs;

  const productionSupportTasks = filteredTasks.filter((t) =>
    t.supportReasons?.includes('Apoyo en producción')
  );

  const getStatusBadge = (status?: TaskExecutionStatus) => {
    switch (status) {
      case 'Completado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>{isEn ? 'Completed' : 'Completado'}</span>
          </span>
        );
      case 'Parcialmente completado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{isEn ? 'Partial' : 'Parcial'}</span>
          </span>
        );
      case 'No completado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
            <X className="w-3 h-3" />
            <span>{isEn ? 'Not Completed' : 'No completado'}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            <span>{isEn ? 'Pending' : 'Pendiente'}</span>
          </span>
        );
    }
  };

  const handleSetTaskStatus = (
    task: WorkStandardTask,
    newStatus: TaskExecutionStatus
  ) => {
    if (isSupervisor) return;

    if (newStatus === 'No completado' || newStatus === 'Parcialmente completado') {
      setSupportModalTask({
        ...task,
        status: newStatus,
        completed: false,
      });
    } else {
      onUpdateTask({
        ...task,
        status: newStatus,
        completed: newStatus === 'Completado',
        realEndTime:
          task.realEndTime ||
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  const handleSaveSupportNotes = (
    reasons: WorkStandardNoteCategory[],
    notes: string
  ) => {
    if (!supportModalTask) return;

    onUpdateTask({
      ...supportModalTask,
      isCreditedSupport: reasons.length > 0,
      supportReasons: reasons,
      supportNotes: notes.trim(),
    });

    setSupportModalTask(null);
  };

  const handleAddEvidence = () => {
    if (!evidenceTask || !evidenceTitle.trim()) return;

    const newEvidence: TaskEvidence = {
      id: `ev_${Date.now()}`,
      title: evidenceTitle.trim(),
      note: evidenceNote.trim() || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onUpdateTask({
      ...evidenceTask,
      evidences: [...(evidenceTask.evidences || []), newEvidence],
    });

    setEvidenceTitle('');
    setEvidenceNote('');
    setEvidenceTask(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      trainerId: effectiveTrainer,
      date: selectedDate,
      startTime: newStartTime,
      endTime: newEndTime,
      title: newTitle.trim(),
      titleEn: newTitle.trim(),
      category: newCategory,
      isModifiedSpecific: newIsSpecific,
      customRoomNote: newIsSpecific && newCustomRoomNote.trim() ? newCustomRoomNote.trim() : undefined,
      completed: false,
      status: 'Pendiente',
      comments: newComments.trim() || undefined,
    });

    setNewTitle('');
    setNewComments('');
    setNewIsSpecific(false);
    setNewCustomRoomNote('');
    setIsNewModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    onUpdateTask(editingTask);
    setEditingTask(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('work_standard_title', language, config)}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                {activeTrainerName} · {activeTrainerTitle}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? `General daily revisions by default (${activeSchedule}). Specific rooms are only shown if explicitly modified.`
                : `Revisiones generales por defecto (${activeSchedule}). Solo se especifica cuarto si se modifica manualmente.`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(currentRole === 'supervisor' || currentRole === 'admin') && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  onClick={() => setSelectedTrainer('trainer_a')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    selectedTrainer === 'trainer_a'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {trainerAUser?.name || 'Israel Martines'}
                </button>
                <button
                  onClick={() => setSelectedTrainer('trainer_b')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    selectedTrainer === 'trainer_b'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {trainerBUser?.name || 'Andreina Morantes'}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-medium text-slate-900 dark:text-white border-none focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsVisualModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-xs"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>{isEn ? 'General Review' : 'Revisión General'}</span>
            </button>

            <button
              onClick={() => setIsWeaknessModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <span>{isEn ? 'Coaching Note' : 'Coaching / Debilidad'}</span>
            </button>

            <button
              onClick={() => setIsDailySummaryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>{isEn ? 'Daily Summary' : 'Resumen del Día'}</span>
            </button>

            {!isSupervisor && (
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800"
                title={isEn ? 'Add activity' : 'Agregar actividad'}
                aria-label={isEn ? 'Add activity' : 'Agregar actividad'}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Compliance KPI Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500">
              {isEn ? 'Standard Work Compliance' : 'Cumplimiento del Estándar'}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                {compliance.percentage}%
              </span>
              <span className="text-xs text-slate-500">
                ({compliance.completed + compliance.supportCount}/{compliance.total})
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${compliance.percentage}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {isEn ? 'Completed Blocks' : 'Completadas'}
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
              {compliance.completed}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              {isEn ? '100% executed' : 'Actividades ejecutadas al 100%'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
            <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>{isEn ? 'Production Support' : 'Apoyo en Producción'}</span>
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-blue-700 dark:text-blue-300 tabular-nums">
              {productionSupportTasks.length}
            </div>
            <div className="text-[10px] text-blue-600/90 dark:text-blue-400/90 flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" />
              <span>{isEn ? 'Credited support' : 'Acreditado'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-medium text-slate-500">
              {isEn ? 'Revision Scope' : 'Alcance de Revisión'}
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {isEn ? 'General' : 'General'}
            </div>
            <div className="text-[10px] text-slate-500">
              {isEn
                ? 'Unless modified per activity'
                : 'A menos que se modifique por actividad'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isEn ? 'Daily Schedule (8:30 AM – 5:00 PM)' : 'Horario Diario (8:30 AM – 5:00 PM)'}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/20">
            {filteredTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('observations')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'observations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isEn ? 'Improvement Observations' : 'Oportunidades de Mejora'}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/20">
            {observations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isEn ? 'Daily Closing History' : 'Historial de Cierres'}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/20">
            {dailySummaries.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isEn ? `Scheduled Activities — ${selectedDate}` : `Actividades Programadas — ${selectedDate}`}
              </span>
              <span className="text-xs text-slate-500 ml-2">
                ({isEn ? 'General Revisions' : 'Revisiones Generales'})
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              {isEn
                ? 'Select execution status for each time block'
                : 'Selecciona el estado de ejecución para cada bloque'}
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isEn ? 'No activities for this date' : 'Sin actividades para esta fecha'}
              </h3>
              {!isSupervisor && (
                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Add Activity' : 'Agregar Actividad'}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((task) => {
                const displayTitle = isEn && task.titleEn ? task.titleEn : task.title;
                const displayDesc = isEn && task.descriptionEn ? task.descriptionEn : task.description;
                const isVisualTask =
                  task.category === 'Revisión general' ||
                  displayTitle.toLowerCase().includes('visual');

                return (
                  <div
                    key={task.id}
                    className={`p-4 transition-colors ${
                      task.status === 'Completado'
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                        : task.status === 'Parcialmente completado'
                        ? 'bg-blue-50/20 dark:bg-blue-950/10'
                        : task.status === 'No completado'
                        ? 'bg-rose-50/20 dark:bg-rose-950/10'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {task.startTime} – {task.endTime}
                          </span>

                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {formatTaskCategory(task.category, language)}
                          </span>

                          {task.isModifiedSpecific && task.customRoomNote ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                              {task.customRoomNote}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                              {isEn ? 'General' : 'General'}
                            </span>
                          )}

                          {getStatusBadge(task.status)}
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {displayTitle}
                          </h3>
                          {displayDesc && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {displayDesc}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-400">
                              {isEn ? 'Actual Time:' : 'Hora Real:'}
                            </span>
                            <input
                              type="text"
                              disabled={isSupervisor}
                              placeholder={isEn ? 'Start' : 'Inicio'}
                              value={task.realStartTime || ''}
                              onChange={(e) =>
                                onUpdateTask({ ...task, realStartTime: e.target.value })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center"
                            />
                            <span>–</span>
                            <input
                              type="text"
                              disabled={isSupervisor}
                              placeholder={isEn ? 'End' : 'Fin'}
                              value={task.realEndTime || ''}
                              onChange={(e) =>
                                onUpdateTask({ ...task, realEndTime: e.target.value })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center"
                            />
                          </div>

                          {task.employeesInvolved && task.employeesInvolved.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {task.employeesInvolved.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {task.supportReasons && task.supportReasons.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>{isEn ? 'Activity Support Notes:' : 'Notas de la Actividad:'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {task.supportReasons.map((reason) => (
                                <span
                                  key={reason}
                                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300"
                                >
                                  {formatSupportReason(reason, language)}
                                </span>
                              ))}
                            </div>
                            {task.supportNotes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                "{task.supportNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {task.evidences && task.evidences.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            {task.evidences.map((ev) => (
                              <span
                                key={ev.id}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                                title={ev.note}
                              >
                                {ev.title} ({ev.timestamp})
                              </span>
                            ))}
                          </div>
                        )}

                        {task.comments && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {isEn ? 'Note:' : 'Nota:'}
                            </span>{' '}
                            {task.comments}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 shrink-0">
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                          <button
                            disabled={isSupervisor}
                            onClick={() => handleSetTaskStatus(task, 'Completado')}
                            className={`px-2 py-1 rounded font-semibold transition-all ${
                              task.status === 'Completado'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                            }`}
                          >
                            {isEn ? 'Done' : 'Completado'}
                          </button>
                          <button
                            disabled={isSupervisor}
                            onClick={() => handleSetTaskStatus(task, 'Parcialmente completado')}
                            className={`px-2 py-1 rounded font-semibold transition-all ${
                              task.status === 'Parcialmente completado'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                            }`}
                          >
                            {isEn ? 'Partial' : 'Parcial'}
                          </button>
                          <button
                            disabled={isSupervisor}
                            onClick={() => handleSetTaskStatus(task, 'No completado')}
                            className={`px-2 py-1 rounded font-semibold transition-all ${
                              task.status === 'No completado'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                            }`}
                          >
                            {isEn ? 'Missed' : 'No completado'}
                          </button>
                          <button
                            disabled={isSupervisor}
                            onClick={() => handleSetTaskStatus(task, 'Pendiente')}
                            className={`px-2 py-1 rounded font-semibold transition-all ${
                              task.status === 'Pendiente'
                                ? 'bg-slate-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isEn ? 'Pending' : 'Pendiente'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isVisualTask && (
                            <button
                              onClick={() => setIsVisualModalOpen(true)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-md"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Checklist' : 'Checklist'}</span>
                            </button>
                          )}

                          {!isSupervisor && (
                            <>
                              <button
                                onClick={() => setEvidenceTask(task)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                title={isEn ? 'Attach evidence' : 'Adjuntar evidencia'}
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingTask(task)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                title={isEn ? 'Edit activity' : 'Editar actividad'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setTaskToDelete(task)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                title={isEn ? 'Delete activity' : 'Eliminar actividad'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OBSERVATIONS */}
      {activeTab === 'observations' && (
        <ImprovementNotesSection
          language={language}
          observations={observations}
          employees={trainerEmployees}
          onAddObservation={onAddObservation}
          onUpdateObservationStatus={onUpdateObservationStatus}
        />
      )}

      {/* TAB 3: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? 'Daily Closing History' : 'Historial de Cierres Diarios'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'Saved daily compliance, coaching notes, and next-shift priorities.'
                  : 'Historial de cumplimiento diario, notas de coaching y prioridades de arranque.'}
              </p>
            </div>
            <button
              onClick={() => setIsDailySummaryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'Generate Summary' : 'Generar Resumen'}</span>
            </button>
          </div>

          {dailySummaries.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              {isEn ? 'No saved daily summaries yet.' : 'No hay resúmenes guardados todavía.'}
            </p>
          ) : (
            <div className="space-y-3">
              {dailySummaries.map((summary) => (
                <div
                  key={summary.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {summary.date}
                      </span>
                      <span className="text-slate-500 font-medium">({summary.trainerName})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {summary.compliancePercentage}% {isEn ? 'Compliance' : 'Cumplimiento'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {summary.completedTasks} / {summary.totalTasks}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">{isEn ? 'Scope:' : 'Alcance:'}</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {isEn ? 'General Revision' : 'Revisión General'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {isEn ? 'Completed Trainings:' : 'Entrenamientos:'}
                      </span>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {summary.trainingsConductedCount}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {isEn ? 'Support Notes:' : 'Notas de Apoyo:'}
                      </span>
                      <div className="font-bold text-blue-700 dark:text-blue-400">
                        {summary.supportNotesCount}
                      </div>
                    </div>
                  </div>

                  {summary.prioritiesForTomorrow.length > 0 && (
                    <div className="p-2.5 rounded bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                      <span className="font-bold text-blue-900 dark:text-blue-300 block text-[11px]">
                        {isEn ? 'Next Shift Priorities:' : 'Prioridades Siguiente Turno:'}
                      </span>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px]">
                        {summary.prioritiesForTomorrow.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.notes && (
                    <p className="text-slate-600 dark:text-slate-400 italic text-[11px]">
                      "{summary.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      <VisualReviewModal
        isOpen={isVisualModalOpen}
        onClose={() => setIsVisualModalOpen(false)}
        language={language}
        rooms={trainerRooms}
        employees={trainerEmployees}
        trainerId={effectiveTrainer}
        trainerName={activeTrainerName}
        onSaveVisualReview={onSaveVisualReview}
      />

      <WeaknessDrawerModal
        isOpen={isWeaknessModalOpen}
        onClose={() => setIsWeaknessModalOpen(false)}
        language={language}
        employees={trainerEmployees}
        onSaveWeakness={onSaveWeakness}
      />

      <DailySummaryModal
        isOpen={isDailySummaryModalOpen}
        onClose={() => setIsDailySummaryModalOpen(false)}
        language={language}
        date={selectedDate}
        trainerId={effectiveTrainer}
        trainerName={activeTrainerName}
        tasks={filteredTasks}
        visualReviews={visualReviews}
        weaknesses={weaknesses}
        trainingSessions={trainingSessions}
        observations={observations}
        onSaveDailySummary={onSaveDailySummary}
      />

      {/* Support Reason Modal */}
      {supportModalTask && (
        <SupportNoteModal
          language={language}
          task={supportModalTask}
          onClose={() => setSupportModalTask(null)}
          onSave={handleSaveSupportNotes}
        />
      )}

      {/* Evidence Modal */}
      {evidenceTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Attach Activity Note / Evidence' : 'Adjuntar Evidencia'}</span>
              </h3>
              <button onClick={() => setEvidenceTask(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <input
                type="text"
                placeholder={isEn ? 'Evidence title...' : 'Título de la evidencia...'}
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <textarea
                rows={2}
                placeholder={isEn ? 'Observation...' : 'Nota u observación...'}
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                <Upload className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <span className="text-[11px]">
                  {isEn ? 'Logged with automatic timestamp' : 'Registrado con hora automática'}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEvidenceTask(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleAddEvidence}
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Save Evidence' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'New Standard Work Activity' : 'Nueva Actividad de Estándar'}
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Activity Name *' : 'Nombre de la Actividad *'}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Start Time' : 'Hora Inicio'}
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'End Time' : 'Hora Fin'}
                  </label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Category' : 'Categoría'}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as WorkStandardTask['category'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Revisión general">{isEn ? 'General Revision' : 'Revisión general'}</option>
                  <option value="Entrenamiento">{isEn ? 'Training' : 'Entrenamiento'}</option>
                  <option value="Evaluación">{isEn ? 'Evaluation' : 'Evaluación'}</option>
                  <option value="Identificación de mejoras">{isEn ? 'Improvements' : 'Identificación de mejoras'}</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Verificación técnica">{isEn ? 'Technical Check' : 'Verificación técnica'}</option>
                  <option value="Documentación y cierre">{isEn ? 'Documentation & Close' : 'Documentación y cierre'}</option>
                  <option value="Gemba Walk">Gemba Walk</option>
                  <option value="Reunión">{isEn ? 'Meeting' : 'Reunión'}</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={newIsSpecific}
                    onChange={(e) => setNewIsSpecific(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>
                    {isEn
                      ? 'Modify to specify a room (default is General)'
                      : 'Modificar para especificar cuarto (por defecto es General)'}
                  </span>
                </label>
                {newIsSpecific && (
                  <input
                    type="text"
                    placeholder={isEn ? 'Specify room or note...' : 'Especificar cuarto o detalle...'}
                    value={newCustomRoomNote}
                    onChange={(e) => setNewCustomRoomNote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Comments' : 'Comentarios'}
                </label>
                <textarea
                  rows={2}
                  value={newComments}
                  onChange={(e) => setNewComments(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Save Activity' : 'Guardar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Edit Activity' : 'Editar Actividad'}
              </h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Title *' : 'Título *'}
                </label>
                <input
                  type="text"
                  required
                  value={isEn && editingTask.titleEn ? editingTask.titleEn : editingTask.title}
                  onChange={(e) =>
                    setEditingTask(
                      isEn
                        ? { ...editingTask, titleEn: e.target.value }
                        : { ...editingTask, title: e.target.value }
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'Start Time' : 'Hora Inicio'}</label>
                  <input
                    type="time"
                    required
                    value={editingTask.startTime}
                    onChange={(e) => setEditingTask({ ...editingTask, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{isEn ? 'End Time' : 'Hora Fin'}</label>
                  <input
                    type="time"
                    required
                    value={editingTask.endTime}
                    onChange={(e) => setEditingTask({ ...editingTask, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(editingTask.isModifiedSpecific)}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, isModifiedSpecific: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>
                    {isEn
                      ? 'Modify to specify a room (default is General)'
                      : 'Modificar para especificar cuarto (por defecto es General)'}
                  </span>
                </label>
                {editingTask.isModifiedSpecific && (
                  <input
                    type="text"
                    placeholder={isEn ? 'Specify room...' : 'Especificar cuarto...'}
                    value={editingTask.customRoomNote || ''}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, customRoomNote: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block font-medium mb-1">{isEn ? 'Comments' : 'Comentarios'}</label>
                <textarea
                  rows={2}
                  value={editingTask.comments || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, comments: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEn ? 'Save Changes' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!taskToDelete}
        title={isEn ? 'Delete Activity' : 'Eliminar Actividad'}
        message={
          isEn
            ? `Delete "${taskToDelete?.titleEn || taskToDelete?.title}" from Standard Work?`
            : `¿Eliminar la actividad "${taskToDelete?.title}" del Standard Work?`
        }
        confirmLabel={isEn ? 'Delete' : 'Eliminar'}
        cancelLabel={isEn ? 'Cancel' : 'Cancelar'}
        onConfirm={() => {
          if (taskToDelete) {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};

interface SupportNoteModalProps {
  language: Language;
  task: WorkStandardTask;
  onClose: () => void;
  onSave: (reasons: WorkStandardNoteCategory[], notes: string) => void;
}

const SupportNoteModal: React.FC<SupportNoteModalProps> = ({
  language,
  task,
  onClose,
  onSave,
}) => {
  const isEn = language === 'en';
  const [selectedReasons, setSelectedReasons] = useState<WorkStandardNoteCategory[]>(
    task.supportReasons || []
  );
  const [notes, setNotes] = useState(task.supportNotes || '');

  const toggleReason = (item: WorkStandardNoteCategory) => {
    if (selectedReasons.includes(item)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== item));
    } else {
      setSelectedReasons([...selectedReasons, item]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Add Activity Support Note' : 'Registrar Nota de Actividad'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn && task.titleEn ? task.titleEn : task.title}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
              {isEn
                ? 'Production support or urgent floor assistance is credited as part of Trainer Standard Work compliance.'
                : 'El apoyo directo a producción se acredita como parte del cumplimiento del estándar del Entrenador.'}
            </p>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {SUPPORT_OPTIONS.map((opt) => {
              const isSelected = selectedReasons.includes(opt.label);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => toggleReason(opt.label)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {isEn ? opt.labelEn : opt.label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {isEn ? opt.descEn : opt.descEs}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Additional Notes' : 'Observaciones Adicionales'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={() => onSave(selectedReasons, notes)}
              className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {isEn ? 'Save Note' : 'Guardar Nota'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
