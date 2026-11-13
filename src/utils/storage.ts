import {
  AppConfig,
  DailySummary,
  Employee,
  EmployeeWeakness,
  EvaluationRecord,
  ImprovementObservation,
  Language,
  PendingRegistration,
  RoomDefinition,
  RoomReview,
  SupervisorFeedback,
  TrainingSession,
  UserProfile,
  UserRole,
  VisualRoomReview,
  WorkStandardTask,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_DAILY_SUMMARIES,
  INITIAL_EMPLOYEES,
  INITIAL_EVALUATIONS,
  INITIAL_OBSERVATIONS,
  INITIAL_PENDING_REGISTRATIONS,
  INITIAL_ROOM_REVIEWS,
  INITIAL_ROOMS,
  INITIAL_SUPERVISOR_FEEDBACK,
  INITIAL_TRAINING_SESSIONS,
  INITIAL_USERS,
  INITIAL_VISUAL_REVIEWS,
  INITIAL_WEAKNESSES,
  INITIAL_WORK_STANDARD_TASKS,
} from '../data/mockData';

const STORAGE_KEY = 'trainer_hub_state_v4';
const UPDATED_AT_KEY = 'trainer_hub_updated_at_v4';
const ROLE_KEY = 'trainer_hub_active_role_v3';
const LANG_KEY = 'trainer_hub_language_v3';

export interface AppState {
  config: AppConfig;
  users: UserProfile[];
  rooms: RoomDefinition[];
  employees: Employee[];
  roomReviews: RoomReview[];
  tasks: WorkStandardTask[];
  visualReviews: VisualRoomReview[];
  weaknesses: EmployeeWeakness[];
  observations: ImprovementObservation[];
  dailySummaries: DailySummary[];
  evaluations: EvaluationRecord[];
  trainingSessions: TrainingSession[];
  supervisorFeedbacks: SupervisorFeedback[];
  pendingRegistrations: PendingRegistration[];
}

export function getInitialState(): AppState {
  return {
    config: INITIAL_CONFIG,
    users: INITIAL_USERS,
    rooms: INITIAL_ROOMS,
    employees: INITIAL_EMPLOYEES,
    roomReviews: INITIAL_ROOM_REVIEWS,
    tasks: INITIAL_WORK_STANDARD_TASKS,
    visualReviews: INITIAL_VISUAL_REVIEWS,
    weaknesses: INITIAL_WEAKNESSES,
    observations: INITIAL_OBSERVATIONS,
    dailySummaries: INITIAL_DAILY_SUMMARIES,
    evaluations: INITIAL_EVALUATIONS,
    trainingSessions: INITIAL_TRAINING_SESSIONS,
    supervisorFeedbacks: INITIAL_SUPERVISOR_FEEDBACK,
    pendingRegistrations: INITIAL_PENDING_REGISTRATIONS,
  };
}

export function mergeWithInitialState(parsed: Partial<AppState> | null | undefined): AppState {
  if (!parsed) return getInitialState();
  return {
    config: {
      ...INITIAL_CONFIG,
      ...(parsed.config || {}),
      customLabelsEs: {
        ...INITIAL_CONFIG.customLabelsEs,
        ...(parsed.config?.customLabelsEs || {}),
      },
      customLabelsEn: {
        ...INITIAL_CONFIG.customLabelsEn,
        ...(parsed.config?.customLabelsEn || {}),
      },
    },
    users: parsed.users || INITIAL_USERS,
    rooms: parsed.rooms || INITIAL_ROOMS,
    employees: parsed.employees || INITIAL_EMPLOYEES,
    roomReviews: parsed.roomReviews || INITIAL_ROOM_REVIEWS,
    tasks: parsed.tasks || INITIAL_WORK_STANDARD_TASKS,
    visualReviews: parsed.visualReviews || INITIAL_VISUAL_REVIEWS,
    weaknesses: parsed.weaknesses || INITIAL_WEAKNESSES,
    observations: parsed.observations || INITIAL_OBSERVATIONS,
    dailySummaries: parsed.dailySummaries || INITIAL_DAILY_SUMMARIES,
    evaluations: parsed.evaluations || INITIAL_EVALUATIONS,
    trainingSessions: parsed.trainingSessions || INITIAL_TRAINING_SESSIONS,
    supervisorFeedbacks: parsed.supervisorFeedbacks || INITIAL_SUPERVISOR_FEEDBACK,
    pendingRegistrations: parsed.pendingRegistrations || INITIAL_PENDING_REGISTRATIONS,
  };
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return getInitialState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      saveAppState(initial, 0);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return mergeWithInitialState(parsed);
  } catch (err) {
    console.error('Error loading app state from localStorage:', err);
    return getInitialState();
  }
}

export function loadLocalUpdatedAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(UPDATED_AT_KEY);
    return val ? Number(val) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveAppState(state: AppState, updatedAt?: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (updatedAt !== undefined) {
      localStorage.setItem(UPDATED_AT_KEY, String(updatedAt));
    } else {
      localStorage.setItem(UPDATED_AT_KEY, String(Date.now()));
    }
  } catch (err) {
    console.error('Error saving app state to localStorage:', err);
  }
}

export function resetAppState(): AppState {
  const initial = getInitialState();
  saveAppState(initial, Date.now());
  return initial;
}

export async function fetchServerState(): Promise<{ state: AppState | null; updatedAt: number } | null> {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      state: Partial<AppState> | null;
      updatedAt: number;
    };
    return {
      state: data.state ? mergeWithInitialState(data.state) : null,
      updatedAt: data.updatedAt || 0,
    };
  } catch {
    return null;
  }
}

export async function pushServerState(state: AppState): Promise<number | null> {
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; updatedAt: number };
    return data.updatedAt || Date.now();
  } catch {
    return null;
  }
}

export async function resetServerState(state: AppState): Promise<number | null> {
  try {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; updatedAt: number };
    return data.updatedAt || Date.now();
  } catch {
    return null;
  }
}

export function loadActiveRole(): UserRole {
  if (typeof window === 'undefined') return 'trainer_a';
  try {
    const role = localStorage.getItem(ROLE_KEY) as UserRole;
    if (role && ['admin', 'trainer_a', 'trainer_b', 'supervisor'].includes(role)) {
      return role;
    }
  } catch {
    // ignore
  }
  return 'trainer_a';
}

export function saveActiveRole(role: UserRole): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    // ignore
  }
}

export function loadLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const lang = localStorage.getItem(LANG_KEY) as Language;
    if (lang === 'en' || lang === 'es') {
      return lang;
    }
  } catch {
    // ignore
  }
  return 'en';
}

export function saveLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}
