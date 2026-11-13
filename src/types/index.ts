export type Language = 'es' | 'en';

export type UserRole = 'admin' | 'trainer_a' | 'trainer_b' | 'supervisor';

export type ShiftType = 'Shift A (Mon-Wed)' | 'Shift B (Thu-Sat)' | 'Mon-Thu';

export interface AppConfig {
  appName: string;
  appSubtitleEs: string;
  appSubtitleEn: string;
  adminPassword: string;
  trainerALabelEs: string;
  trainerALabelEn: string;
  trainerAScheduleEs: string;
  trainerAScheduleEn: string;
  trainerBLabelEs: string;
  trainerBLabelEn: string;
  trainerBScheduleEs: string;
  trainerBScheduleEn: string;
  supervisorLabelEs: string;
  supervisorLabelEn: string;
  adminLabel: string;
  customLabelsEs: Record<string, string>;
  customLabelsEn: Record<string, string>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  assignedRooms: string[];
  avatar: string;
  status: 'active' | 'inactive';
}

export type EmployeePosition = 'Operador' | 'Segundo' | 'Líder';

export interface Employee {
  id: string;
  code: string;
  name: string;
  trainerId: 'trainer_a' | 'trainer_b';
  area: string;
  room: string;
  position: EmployeePosition;
  status: 'Activo' | 'Inactivo';
  shift: ShiftType;
  hireDate: string;
  currentCompetencyLevel: number; // 1-4
  phone?: string;
  notes?: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  trainer: 'trainer_a' | 'trainer_b';
  lineType: string;
  standardTaktSeconds: number;
  standardHourOutput: number;
  isStickPack: boolean;
}

export interface RoomReviewChecklist {
  hourByHour: boolean;
  kpis: boolean;
  tpms: boolean;
  fiveS: boolean;
  startRightEndRight: boolean;
  taktTime: boolean;
}

export interface RoomReview {
  id: string;
  roomId: string;
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  date: string;
  shift: ShiftType;
  checklist: RoomReviewChecklist;
  completionPercentage: number; // 0-100 based on 6 checkboxes
  isCustomModified?: boolean;
  notes?: string;
  createdAt: string;
}

export type MonthlyCompetencyCategory = 'deacom' | 'interpersonal' | 'intellectual';

export interface MonthlyCompetencyItem {
  id: string;
  category: MonthlyCompetencyCategory;
  labelEs: string;
  labelEn: string;
}

export interface EvaluationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: EmployeePosition;
  shift: ShiftType;
  room: string;
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  evaluationMonth: string; // YYYY-MM
  date: string;
  scores: Record<string, number>; // competencyId -> score (1 to 4)
  sectionPercentages: {
    deacom: number;
    interpersonal: number;
    intellectual: number;
  };
  overallPercentage: number;
  status: 'Competente' | 'En Desarrollo' | 'Requiere Refuerzo';
  comments: string;
  reinforcementRecommendations: string;
}

export interface TrainingSession {
  id: string;
  date: string; // Completed date
  employeeId: string;
  employeeName: string;
  employeePosition?: EmployeePosition;
  shift: ShiftType;
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  competency: string;
  room?: string;
  durationMinutes?: number;
  comments: string;
}

export type TaskExecutionStatus =
  | 'Completado'
  | 'Parcialmente completado'
  | 'No completado'
  | 'Pendiente';

export type WorkStandardNoteCategory =
  | 'Apoyo en producción'
  | 'Entrenamiento de otro empleado'
  | 'Problemas técnicos'
  | 'Falta de personal'
  | 'Cuarto detenido o no disponible'
  | 'Reunión'
  | 'Otras responsabilidades'
  | 'Otro motivo';

export interface TaskEvidence {
  id: string;
  title: string;
  note?: string;
  url?: string;
  timestamp: string;
}

export interface WorkStandardTask {
  id: string;
  trainerId: 'trainer_a' | 'trainer_b';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  category:
    | 'Revisión general'
    | 'Entrenamiento'
    | 'Evaluación'
    | 'Identificación de mejoras'
    | 'Lunch'
    | 'Verificación técnica'
    | 'Documentación y cierre'
    | 'Gemba Walk'
    | 'Reunión';
  isModifiedSpecific?: boolean;
  customRoomNote?: string;
  employeesInvolved?: string[];
  completed: boolean;
  status: TaskExecutionStatus;
  realStartTime?: string;
  realEndTime?: string;
  comments?: string;
  isCreditedSupport?: boolean;
  supportReasons?: WorkStandardNoteCategory[];
  supportNotes?: string;
  evidences?: TaskEvidence[];
}

export interface VisualRoomReview {
  id: string;
  date: string;
  scopeLabel: string; // 'General' by default, or specific room if modified
  isCustomRoomModified?: boolean;
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  round: 'Ronda 1' | 'Ronda 2';
  checklist: RoomReviewChecklist;
  observations?: string;
  employeeInvolvedId?: string;
  employeeInvolvedName?: string;
  needToStrengthen?: string;
  createdAt: string;
}

export interface EmployeeWeakness {
  id: string;
  date: string;
  roomId: string;
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  weaknessDescription: string;
  category:
    | 'Setup de máquina'
    | 'Uso de DEACOM'
    | 'Inspección de producto'
    | '5S y limpieza'
    | 'GMP y seguridad'
    | 'Liderazgo y HxH';
  status: 'Pendiente' | 'En proceso' | 'Resuelto';
  createdAt: string;
}

export interface ImprovementObservation {
  id: string;
  date: string;
  title: string;
  description: string;
  category: 'Liderazgo' | 'DEACOM' | 'Calidad / Defectos' | '5S / Limpieza' | 'Setup / Máquina' | 'Procedimientos';
  employeeId?: string;
  employeeName?: string;
  status: 'Pendiente' | 'En proceso' | 'Resuelto';
  createdAt: string;
}

export interface DailySummary {
  id: string;
  date: string;
  trainerId: 'trainer_a' | 'trainer_b';
  trainerName: string;
  completedTasks: number;
  partialTasks: number;
  notCompletedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  compliancePercentage: number;
  supportNotesCount: number;
  evaluatedEmployees: string[];
  trainingsConductedCount: number;
  weaknessesCount: number;
  improvementActionsCount: number;
  prioritiesForTomorrow: string[];
  notes?: string;
  savedAt: string;
}

export interface SupervisorFeedback {
  id: string;
  supervisorName: string;
  targetTrainerId: 'trainer_a' | 'trainer_b';
  date: string;
  type: 'Reconocimiento' | 'Oportunidad de Mejora' | 'Acción Correctiva';
  title: string;
  message: string;
  read: boolean;
}

export interface PendingRegistration {
  id: string;
  name: string;
  email: string;
  requestedRole: UserRole;
  department: string;
  date: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
}
