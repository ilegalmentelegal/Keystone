import {
  AppConfig,
  Language,
  MonthlyCompetencyItem,
  ShiftType,
  WorkStandardNoteCategory,
  WorkStandardTask,
} from '../types';

export const MONTHLY_COMPETENCIES: MonthlyCompetencyItem[] = [
  // 1. DEACOM Knowledge (8 items)
  { id: 'deacom_job_number', category: 'deacom', labelEs: 'Localización de Job Number', labelEn: 'Locating Job Number' },
  { id: 'deacom_print_wo', category: 'deacom', labelEs: 'Imprimir hoja de trabajo', labelEn: 'Print Work Order Sheet' },
  { id: 'deacom_specs', category: 'deacom', labelEs: 'Localización de especificaciones', labelEn: 'Locating Specifications' },
  { id: 'deacom_print_rt', category: 'deacom', labelEs: 'Imprimir Real Time', labelEn: 'Print Real Time' },
  { id: 'deacom_delete_rt', category: 'deacom', labelEs: 'Eliminar Real Time', labelEn: 'Delete Real Time' },
  { id: 'deacom_materials', category: 'deacom', labelEs: 'Chequear materiales necesarios para la orden', labelEn: 'Check Materials Needed for Order' },
  { id: 'deacom_priority', category: 'deacom', labelEs: 'Ver prioridad de la orden', labelEn: 'View Order Priority' },
  { id: 'deacom_inspections', category: 'deacom', labelEs: 'Inspecciones', labelEn: 'Inspections' },

  // 2. Interpersonal (11 items)
  { id: 'inter_trust', category: 'interpersonal', labelEs: 'Confianza (Trust)', labelEn: 'Trust' },
  { id: 'inter_fun', category: 'interpersonal', labelEs: 'Entusiasmo / Ambiente Positivo (Fun)', labelEn: 'Fun' },
  { id: 'inter_openness', category: 'interpersonal', labelEs: 'Apertura (Openness)', labelEn: 'Openness' },
  { id: 'inter_growth', category: 'interpersonal', labelEs: 'Crecimiento (Growth)', labelEn: 'Growth' },
  { id: 'inter_service', category: 'interpersonal', labelEs: 'Servicio (Service)', labelEn: 'Service' },
  { id: 'inter_responsive', category: 'interpersonal', labelEs: 'Capacidad de respuesta (Responsive)', labelEn: 'Responsive' },
  { id: 'inter_urgency', category: 'interpersonal', labelEs: 'Sentido de urgencia (Sense of Urgency)', labelEn: 'Sense of Urgency' },
  { id: 'inter_proactive', category: 'interpersonal', labelEs: 'Proactividad (Proactive)', labelEn: 'Proactive' },
  { id: 'inter_crucial', category: 'interpersonal', labelEs: 'Conversaciones cruciales (Crucial Conversations)', labelEn: 'Crucial Conversations' },
  { id: 'inter_change', category: 'interpersonal', labelEs: 'Gestión del cambio (Managing Change)', labelEn: 'Managing Change' },
  { id: 'inter_respect', category: 'interpersonal', labelEs: 'Respeto (Respect)', labelEn: 'Respect' },

  // 3. Intellectual (12 items)
  { id: 'intel_kpis', category: 'intellectual', labelEs: 'KPIs', labelEn: 'KPIs' },
  { id: 'intel_andon', category: 'intellectual', labelEs: 'Andon', labelEn: 'Andon' },
  { id: 'intel_hxh_board', category: 'intellectual', labelEs: 'Tablero Hour to Hour (Request Hour to Hour Board)', labelEn: 'Request Hour to Hour Board' },
  { id: 'intel_5s', category: 'intellectual', labelEs: '5S', labelEn: '5S' },
  { id: 'intel_sops', category: 'intellectual', labelEs: 'SOPs', labelEn: 'SOPs' },
  { id: 'intel_checklist', category: 'intellectual', labelEs: 'Checklist', labelEn: 'Checklist' },
  { id: 'intel_tpm', category: 'intellectual', labelEs: 'TPM', labelEn: 'TPM' },
  { id: 'intel_takt', category: 'intellectual', labelEs: 'Takt Time', labelEn: 'Takt Time' },
  { id: 'intel_start_end', category: 'intellectual', labelEs: 'Start Right / End Right', labelEn: 'Start Right / End Right' },
  { id: 'intel_gemba', category: 'intellectual', labelEs: 'Gemba', labelEn: 'Gemba' },
  { id: 'intel_lean_house', category: 'intellectual', labelEs: 'Casa Lean (Lean House)', labelEn: 'Lean House' },
  { id: 'intel_vision', category: 'intellectual', labelEs: 'Visión de la Compañía (Company Vision)', labelEn: 'Company Vision' },
];

export const DEFAULT_LABELS_ES: Record<string, string> = {
  nav_dashboard: 'Dashboard',
  nav_work_standard: 'Estándar de Trabajo',
  nav_room_reviews: 'Revisión de Cuartos',
  nav_employees: 'Empleados',
  nav_evaluations: 'Evaluación Mensual',
  nav_trainings: 'Bitácora Entrenamientos',
  nav_supervision: 'Supervisión',
  nav_admin: 'Keystone ADMIN',
  section_modules: 'Módulos Operativos',
  dashboard_title: 'Panel Principal de Operaciones',
  work_standard_title: 'Estándar de Trabajo Diario',
  room_reviews_title: 'Revisión de Cuartos de Producción',
  employees_title: 'Empleados por Entrenador y Turno',
  evaluations_title: 'Evaluación Mensual (Líderes y Segundos)',
  trainings_title: 'Bitácora de Entrenamientos Realizados',
  supervision_title: 'Panel de Supervisión',
  admin_title: 'Keystone ADMIN — Configuración Total',
};

export const DEFAULT_LABELS_EN: Record<string, string> = {
  nav_dashboard: 'Dashboard',
  nav_work_standard: 'Standard Work',
  nav_room_reviews: 'Room Reviews',
  nav_employees: 'Employees',
  nav_evaluations: 'Monthly Evaluation',
  nav_trainings: 'Training Logbook',
  nav_supervision: 'Supervision',
  nav_admin: 'Keystone ADMIN',
  section_modules: 'Operations Modules',
  dashboard_title: 'Operations Dashboard',
  work_standard_title: 'Daily Standard Work',
  room_reviews_title: 'Production Room Reviews',
  employees_title: 'Employees by Trainer & Shift',
  evaluations_title: 'Monthly Evaluation (Leads & Seconds)',
  trainings_title: 'Completed Trainings Logbook',
  supervision_title: 'Supervision Panel',
  admin_title: 'Keystone ADMIN — Full Configuration',
};

export function getLabel(
  key: string,
  language: Language,
  config?: AppConfig
): string {
  if (config) {
    const customMap = language === 'en' ? config.customLabelsEn : config.customLabelsEs;
    if (customMap && customMap[key] && customMap[key].trim() !== '') {
      return customMap[key];
    }
  }
  const dict = language === 'en' ? DEFAULT_LABELS_EN : DEFAULT_LABELS_ES;
  return dict[key] || key;
}

export function formatShiftLabel(shift: ShiftType, language: Language): string {
  if (language === 'en') {
    if (shift === 'Shift A (Mon-Wed)') return 'Shift A (Mon–Wed)';
    if (shift === 'Shift B (Thu-Sat)') return 'Shift B (Thu–Sat)';
    return 'Mon–Thu';
  }
  if (shift === 'Shift A (Mon-Wed)') return 'Turno A (Lun–Mié)';
  if (shift === 'Shift B (Thu-Sat)') return 'Turno B (Jue–Sáb)';
  return 'Lun–Jue';
}

export function formatPositionLabel(position: string, language: Language): string {
  if (language === 'es') return position;
  if (position === 'Líder') return 'Lead';
  if (position === 'Segundo') return 'Second';
  if (position === 'Operador') return 'Operator';
  return position;
}

export function formatEvalStatus(
  status: 'Competente' | 'En Desarrollo' | 'Requiere Refuerzo',
  language: Language
): string {
  if (language === 'es') return status;
  if (status === 'Competente') return 'Competent';
  if (status === 'En Desarrollo') return 'Developing';
  return 'Needs Reinforcement';
}

export function formatTaskCategory(
  category: WorkStandardTask['category'],
  language: Language
): string {
  if (language === 'es') return category;
  const map: Record<WorkStandardTask['category'], string> = {
    'Revisión general': 'General Revision',
    Entrenamiento: 'Training',
    Evaluación: 'Evaluation',
    'Identificación de mejoras': 'Improvements',
    Lunch: 'Lunch',
    'Verificación técnica': 'Technical Check',
    'Documentación y cierre': 'Documentation & Close',
    'Gemba Walk': 'Gemba Walk',
    Reunión: 'Meeting',
  };
  return map[category] || category;
}

export function formatSupportReason(
  reason: WorkStandardNoteCategory,
  language: Language
): string {
  if (language === 'es') return reason;
  const map: Record<WorkStandardNoteCategory, string> = {
    'Apoyo en producción': 'Production Support',
    'Entrenamiento de otro empleado': 'Training Another Employee',
    'Problemas técnicos': 'Technical Issues',
    'Falta de personal': 'Staffing Shortage',
    'Cuarto detenido o no disponible': 'Line Stopped / Unavailable',
    Reunión: 'Meeting',
    'Otras responsabilidades': 'Other Responsibilities',
    'Otro motivo': 'Other Reason',
  };
  return map[reason] || reason;
}
