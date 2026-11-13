import {
  AppConfig,
  DailySummary,
  Employee,
  EmployeeWeakness,
  EvaluationRecord,
  ImprovementObservation,
  PendingRegistration,
  RoomDefinition,
  RoomReview,
  RoomReviewChecklist,
  SupervisorFeedback,
  TrainingSession,
  UserProfile,
  VisualRoomReview,
  WorkStandardTask,
} from '../types';

export const DEFAULT_WORKSPACE_ID = 'keystone_plant';
export const BOOTSTRAPPED_ADMIN_EMAIL = 'israelangelito1@gmail.com';

export function normalizeDocId(rawId: string): string {
  const cleaned = String(rawId || 'doc')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safe = cleaned.length > 0 ? cleaned : `doc_${Date.now()}`;
  return safe.slice(0, 128);
}

export function clampStr(value: string | undefined | null, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : fallback;
  const trimmed = str.trim();
  const effective = trimmed.length > 0 ? trimmed : fallback;
  return effective.slice(0, maxLen);
}

export function clampOptionalStr(value: string | undefined | null, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

export function clampStrArray(
  arr: string[] | undefined,
  maxItems: number,
  maxItemLen = 160
): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .slice(0, maxItems)
    .map((v) => v.trim().slice(0, maxItemLen));
}

export function sanitizeMemberUids(memberUids: string[], fallbackUid: string): string[] {
  const unique = Array.from(
    new Set([fallbackUid, ...memberUids].map((u) => normalizeDocId(u)).filter(Boolean))
  );
  return unique.slice(0, 20);
}

export function sanitizeChecklist(checklist?: Partial<RoomReviewChecklist>): RoomReviewChecklist {
  return {
    hourByHour: Boolean(checklist?.hourByHour),
    kpis: Boolean(checklist?.kpis),
    tpms: Boolean(checklist?.tpms),
    fiveS: Boolean(checklist?.fiveS),
    startRightEndRight: Boolean(checklist?.startRightEndRight),
    taktTime: Boolean(checklist?.taktTime),
  };
}

function clampLabelMap(map: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!map || typeof map !== 'object') return out;
  const entries = Object.entries(map).slice(0, 60);
  for (const [k, v] of entries) {
    if (typeof k === 'string' && typeof v === 'string' && k.length <= 64) {
      out[k] = v.slice(0, 200);
    }
  }
  return out;
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as T;
}

export function buildWorkspaceConfigPayload<TTime>(
  config: AppConfig,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  return {
    id: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    appName: clampStr(config.appName, 80, 'Trainer Hub'),
    appSubtitleEs: clampStr(config.appSubtitleEs, 120, 'Control Operativo y Entrenamiento'),
    appSubtitleEn: clampStr(config.appSubtitleEn, 120, 'Operations & Training Control'),
    adminPassword: clampStr(config.adminPassword, 80, 'Keystone2026'),
    trainerALabelEs: clampStr(config.trainerALabelEs, 80, 'Entrenador de Stick Pack'),
    trainerALabelEn: clampStr(config.trainerALabelEn, 80, 'Stick Pack Trainer'),
    trainerAScheduleEs: clampStr(config.trainerAScheduleEs, 100, 'Shift A (Lun–Mié) · Shift B (Jue–Sáb)'),
    trainerAScheduleEn: clampStr(config.trainerAScheduleEn, 100, 'Shift A (Mon–Wed) · Shift B (Thu–Sat)'),
    trainerBLabelEs: clampStr(config.trainerBLabelEs, 80, 'Entrenador de Cuartos'),
    trainerBLabelEn: clampStr(config.trainerBLabelEn, 80, 'Rooms Trainer'),
    trainerBScheduleEs: clampStr(config.trainerBScheduleEs, 100, 'Lunes a Jueves'),
    trainerBScheduleEn: clampStr(config.trainerBScheduleEn, 100, 'Monday to Thursday'),
    supervisorLabelEs: clampStr(config.supervisorLabelEs, 80, 'Supervisor'),
    supervisorLabelEn: clampStr(config.supervisorLabelEn, 80, 'Supervisor'),
    adminLabel: clampStr(config.adminLabel, 80, 'Keystone ADMIN'),
    customLabelsEs: clampLabelMap(config.customLabelsEs),
    customLabelsEn: clampLabelMap(config.customLabelsEn),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  };
}

export function buildRoomPayload<TTime>(
  room: RoomDefinition,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(room.id);
  return stripUndefined({
    id: docId,
    originalId: docId !== room.id ? clampStr(room.id, 64, docId) : undefined,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    name: clampStr(room.name, 120, docId),
    trainer: room.trainer === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    lineType: clampStr(room.lineType, 100, 'General'),
    standardTaktSeconds: Math.min(10000, Math.max(0, Number(room.standardTaktSeconds) || 0)),
    standardHourOutput: Math.min(1000000, Math.max(0, Number(room.standardHourOutput) || 0)),
    isStickPack: Boolean(room.isStickPack),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildAppUserPayload<TTime>(
  user: UserProfile,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(user.id);
  return {
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    name: clampStr(user.name, 120, 'User'),
    role: user.role,
    title: clampStr(user.title, 100, 'Trainer'),
    assignedRooms: clampStrArray(user.assignedRooms, 50, 64),
    avatar: clampStr(user.avatar, 10, 'TH'),
    status: user.status === 'inactive' ? 'inactive' : 'active',
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  };
}

export function buildEmployeePayload<TTime>(
  emp: Employee,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(emp.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    code: clampStr(emp.code, 40, 'EMP-0000'),
    name: clampStr(emp.name, 120, 'Employee'),
    trainerId: emp.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    area: clampStr(emp.area, 80, 'Producción'),
    room: clampStr(emp.room, 64, 'General'),
    position: emp.position,
    status: emp.status === 'Inactivo' ? 'Inactivo' : 'Activo',
    shift: emp.shift,
    hireDate: clampStr(emp.hireDate, 30, '2026-01-01'),
    currentCompetencyLevel: Math.min(4, Math.max(1, Number(emp.currentCompetencyLevel) || 1)),
    notes: clampOptionalStr(emp.notes, 500),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildRoomReviewPayload<TTime>(
  rev: RoomReview,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(rev.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    roomId: clampStr(rev.roomId, 64, 'P09'),
    trainerId: rev.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    trainerName: clampStr(rev.trainerName, 120, 'Trainer'),
    date: clampStr(rev.date, 20, '2026-11-12'),
    shift: rev.shift,
    checklist: sanitizeChecklist(rev.checklist),
    completionPercentage: Math.min(100, Math.max(0, Number(rev.completionPercentage) || 0)),
    isCustomModified: typeof rev.isCustomModified === 'boolean' ? rev.isCustomModified : undefined,
    notes: clampOptionalStr(rev.notes, 600),
    createdAtIso: clampOptionalStr(rev.createdAt, 40),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildTaskPayload<TTime>(
  task: WorkStandardTask,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(task.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    trainerId: task.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    date: clampStr(task.date, 20, '2026-11-12'),
    startTime: clampStr(task.startTime, 20, '08:30'),
    endTime: clampStr(task.endTime, 20, '09:00'),
    title: clampStr(task.title, 200, 'Standard Work Block'),
    titleEn: clampOptionalStr(task.titleEn, 200),
    description: clampOptionalStr(task.description, 600),
    descriptionEn: clampOptionalStr(task.descriptionEn, 600),
    category: clampStr(task.category, 60, 'Revisión general'),
    isModifiedSpecific: typeof task.isModifiedSpecific === 'boolean' ? task.isModifiedSpecific : undefined,
    customRoomNote: clampOptionalStr(task.customRoomNote, 200),
    employeesInvolved: task.employeesInvolved ? clampStrArray(task.employeesInvolved, 20, 120) : undefined,
    completed: Boolean(task.completed),
    status: task.status,
    realStartTime: clampOptionalStr(task.realStartTime, 20),
    realEndTime: clampOptionalStr(task.realEndTime, 20),
    comments: clampOptionalStr(task.comments, 800),
    isCreditedSupport: typeof task.isCreditedSupport === 'boolean' ? task.isCreditedSupport : undefined,
    supportReasons: task.supportReasons ? clampStrArray(task.supportReasons, 10, 80) : undefined,
    supportNotes: clampOptionalStr(task.supportNotes, 500),
    evidences: Array.isArray(task.evidences) ? task.evidences.slice(0, 10) : undefined,
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildVisualReviewPayload<TTime>(
  vr: VisualRoomReview,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(vr.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    date: clampStr(vr.date, 20, '2026-11-12'),
    scopeLabel: clampStr(vr.scopeLabel, 100, 'General'),
    isCustomRoomModified: typeof vr.isCustomRoomModified === 'boolean' ? vr.isCustomRoomModified : undefined,
    trainerId: vr.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    trainerName: clampStr(vr.trainerName, 120, 'Trainer'),
    round: vr.round === 'Ronda 2' ? 'Ronda 2' : 'Ronda 1',
    checklist: sanitizeChecklist(vr.checklist),
    observations: clampOptionalStr(vr.observations, 800),
    employeeInvolvedId: clampOptionalStr(vr.employeeInvolvedId, 128),
    employeeInvolvedName: clampOptionalStr(vr.employeeInvolvedName, 120),
    needToStrengthen: clampOptionalStr(vr.needToStrengthen, 500),
    createdAtIso: clampOptionalStr(vr.createdAt, 40),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildWeaknessPayload<TTime>(
  weakness: EmployeeWeakness,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(weakness.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    date: clampStr(weakness.date, 20, '2026-11-12'),
    roomId: clampStr(weakness.roomId, 64, 'General'),
    employeeId: clampStr(weakness.employeeId, 128, 'emp'),
    employeeName: clampStr(weakness.employeeName, 120, 'Employee'),
    position: weakness.position,
    weaknessDescription: clampStr(weakness.weaknessDescription, 800, '-'),
    category: clampStr(weakness.category, 80, 'Uso de DEACOM'),
    status: weakness.status,
    createdAtIso: clampOptionalStr(weakness.createdAt, 40),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildObservationPayload<TTime>(
  obs: ImprovementObservation,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(obs.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    date: clampStr(obs.date, 20, '2026-11-12'),
    title: clampStr(obs.title, 160, 'Observation'),
    description: clampStr(obs.description, 800, '-'),
    category: clampStr(obs.category, 60, 'Procedimientos'),
    employeeId: clampOptionalStr(obs.employeeId, 128),
    employeeName: clampOptionalStr(obs.employeeName, 120),
    status: obs.status,
    createdAtIso: clampOptionalStr(obs.createdAt, 40),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildDailySummaryPayload<TTime>(
  summary: DailySummary,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(summary.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    date: clampStr(summary.date, 20, '2026-11-12'),
    trainerId: summary.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    trainerName: clampStr(summary.trainerName, 120, 'Trainer'),
    completedTasks: Number(summary.completedTasks) || 0,
    partialTasks: Number(summary.partialTasks) || 0,
    notCompletedTasks: Number(summary.notCompletedTasks) || 0,
    pendingTasks: Number(summary.pendingTasks) || 0,
    totalTasks: Number(summary.totalTasks) || 0,
    compliancePercentage: Number(summary.compliancePercentage) || 0,
    supportNotesCount: Number(summary.supportNotesCount) || 0,
    evaluatedEmployees: clampStrArray(summary.evaluatedEmployees, 30, 120),
    trainingsConductedCount: Number(summary.trainingsConductedCount) || 0,
    weaknessesCount: Number(summary.weaknessesCount) || 0,
    improvementActionsCount: Number(summary.improvementActionsCount) || 0,
    prioritiesForTomorrow: clampStrArray(summary.prioritiesForTomorrow, 20, 160),
    notes: clampOptionalStr(summary.notes, 1000),
    savedAt: clampStr(summary.savedAt, 40, new Date().toISOString()),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildEvaluationPayload<TTime>(
  ev: EvaluationRecord,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(ev.id);
  const clampedScores: Record<string, number> = {};
  if (ev.scores && typeof ev.scores === 'object') {
    for (const [k, v] of Object.entries(ev.scores).slice(0, 40)) {
      if (typeof k === 'string' && typeof v === 'number') {
        clampedScores[k] = v;
      }
    }
  }
  return {
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    employeeId: clampStr(ev.employeeId, 128, 'emp'),
    employeeName: clampStr(ev.employeeName, 120, 'Employee'),
    employeePosition: ev.employeePosition,
    shift: ev.shift,
    room: clampStr(ev.room, 64, 'General'),
    trainerId: ev.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    trainerName: clampStr(ev.trainerName, 120, 'Trainer'),
    evaluationMonth: clampStr(ev.evaluationMonth, 10, '2026-11'),
    date: clampStr(ev.date, 20, '2026-11-12'),
    scores: clampedScores,
    sectionPercentages: {
      deacom: Number(ev.sectionPercentages?.deacom) || 0,
      interpersonal: Number(ev.sectionPercentages?.interpersonal) || 0,
      intellectual: Number(ev.sectionPercentages?.intellectual) || 0,
    },
    overallPercentage: Math.min(100, Math.max(0, Number(ev.overallPercentage) || 0)),
    status: ev.status,
    comments: clampStr(ev.comments, 1000, ''),
    reinforcementRecommendations: clampStr(ev.reinforcementRecommendations, 1000, ''),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  };
}

export function buildTrainingSessionPayload<TTime>(
  session: TrainingSession,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(session.id);
  return stripUndefined({
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    date: clampStr(session.date, 20, '2026-11-12'),
    employeeId: clampStr(session.employeeId, 128, 'emp'),
    employeeName: clampStr(session.employeeName, 120, 'Employee'),
    employeePosition: session.employeePosition,
    shift: session.shift,
    trainerId: session.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    trainerName: clampStr(session.trainerName, 120, 'Trainer'),
    competency: clampStr(session.competency, 200, 'Training'),
    room: clampOptionalStr(session.room, 64),
    durationMinutes:
      typeof session.durationMinutes === 'number'
        ? Math.min(600, Math.max(0, session.durationMinutes))
        : undefined,
    comments: clampStr(session.comments, 1000, ''),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  });
}

export function buildSupervisorFeedbackPayload<TTime>(
  fb: SupervisorFeedback,
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(fb.id);
  return {
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    memberUids: sanitizeMemberUids(memberUids, ownerId),
    supervisorName: clampStr(fb.supervisorName, 120, 'Jonathan de Jesús'),
    targetTrainerId: fb.targetTrainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
    date: clampStr(fb.date, 20, '2026-11-12'),
    type: fb.type,
    title: clampStr(fb.title, 160, 'Feedback'),
    message: clampStr(fb.message, 1000, '-'),
    read: Boolean(fb.read),
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  };
}

export function buildPendingRegistrationPayload<TTime>(
  reg: PendingRegistration,
  workspaceId: string,
  ownerId: string,
  createdAtVal: TTime,
  updatedAtVal: TTime
) {
  const docId = normalizeDocId(reg.id);
  return {
    id: docId,
    workspaceId: normalizeDocId(workspaceId),
    ownerId: normalizeDocId(ownerId),
    name: clampStr(reg.name, 120, 'User'),
    email: clampStr(reg.email, 180, 'user@keystone.com'),
    requestedRole: reg.requestedRole,
    department: clampStr(reg.department, 100, 'Production'),
    date: clampStr(reg.date, 20, '2026-11-12'),
    status: reg.status,
    createdAt: createdAtVal,
    updatedAt: updatedAtVal,
  };
}
