/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Cloud, LogIn, X, AlertTriangle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { DashboardView } from './views/DashboardView';
import { WorkStandardView } from './views/WorkStandardView';
import { RoomReviewsView } from './views/RoomReviewsView';
import { EmployeesView } from './views/EmployeesView';
import { EvaluationsView } from './views/EvaluationsView';
import { TrainingsView } from './views/TrainingsView';
import { SupervisionView } from './views/SupervisionView';
import { AdminView } from './views/AdminView';

import {
  AppState,
  loadAppState,
  loadLocalUpdatedAt,
  saveAppState,
  resetAppState,
  loadActiveRole,
  saveActiveRole,
  loadLanguage,
  saveLanguage,
  fetchServerState,
  pushServerState,
  resetServerState,
} from './utils/storage';
import {
  AppConfig,
  DailySummary,
  Employee,
  EmployeeWeakness,
  EvaluationRecord,
  ImprovementObservation,
  Language,
  RoomDefinition,
  RoomReview,
  SupervisorFeedback,
  TrainingSession,
  UserProfile,
  UserRole,
  VisualRoomReview,
  WorkStandardTask,
} from './types';
import { categorizeWeakness } from './utils/metrics';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import {
  addEvaluationToFirestore,
  addTrainingSessionToFirestore,
  addVisualReviewToFirestore,
  addWeaknessToFirestore,
  cascadeTrainerNameInFirestore,
  deleteAppUserFromFirestore,
  deleteEmployeeFromFirestore,
  deleteRoomFromFirestore,
  deleteTaskFromFirestore,
  ensureFirebaseWorkspaceSession,
  resetWorkspaceInFirestore,
  saveConfigToFirestore,
  subscribeToWorkspace,
  updatePendingRegistrationStatusInFirestore,
  upsertAppUserToFirestore,
  upsertDailySummaryToFirestore,
  upsertEmployeeToFirestore,
  upsertObservationToFirestore,
  upsertRoomReviewToFirestore,
  upsertRoomToFirestore,
  upsertSupervisorFeedbackToFirestore,
  upsertTaskToFirestore,
  WorkspaceSessionContext,
} from './utils/firestoreSync';
import firebaseAppletConfig from '../firebase-applet-config.json';

export default function App() {
  const {
    user: firebaseUser,
    authReady,
    authLoading,
    authError,
    signIn: handleFirebaseSignIn,
    signOut: handleFirebaseSignOut,
    clearAuthError,
  } = useFirebaseAuth();
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = loadActiveRole();
    // Never restore directly into unlocked admin without password check
    return saved === 'admin' ? 'trainer_a' : saved;
  });
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [preselectedEmpForEval, setPreselectedEmpForEval] = useState<Employee | null>(null);
  const [preselectedEmpForTrain, setPreselectedEmpForTrain] = useState<Employee | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isCloudBannerDismissed, setIsCloudBannerDismissed] = useState(false);

  const lastSyncedAtRef = useRef<number>(loadLocalUpdatedAt());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudConfigTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLocalWriteRef = useRef<boolean>(false);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const languageRef = useRef<Language>(language);
  const firestoreCtxRef = useRef<WorkspaceSessionContext | null>(null);
  const appStateRef = useRef<AppState>(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trainer_hub_theme');
      if (saved) return saved === 'dark';
      return true;
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('trainer_hub_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('trainer_hub_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    languageRef.current = language;
    document.documentElement.lang = language;
  }, [language]);

  const showToast = (enText: string, esText: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(languageRef.current === 'en' ? enText : esText);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const runCloudWrite = (fn: (ctx: WorkspaceSessionContext) => Promise<void>) => {
    const ctx = firestoreCtxRef.current;
    if (!ctx) return;
    void fn(ctx).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      setCloudError(msg);
    });
  };

  // Connect Firebase Authentication & Cloud Firestore real-time listeners when authenticated
  useEffect(() => {
    if (!authReady) return;
    if (!firebaseUser || !firebaseUser.emailVerified) {
      firestoreCtxRef.current = null;
      setIsCloudConnected(false);
      return;
    }

    let cancelled = false;
    let unsubFirestore: (() => void) | null = null;

    const connectCloud = async () => {
      try {
        setCloudError(null);
        const ctx = await ensureFirebaseWorkspaceSession(firebaseUser, appStateRef.current);
        if (cancelled) return;
        firestoreCtxRef.current = ctx;
        setIsCloudConnected(true);
        showToast(
          ctx.seeded ? 'Cloud Firestore initialized & synced' : 'Connected to Cloud Firestore',
          ctx.seeded ? 'Cloud Firestore inicializado y sincronizado' : 'Conectado a Cloud Firestore'
        );

        unsubFirestore = subscribeToWorkspace(ctx, (patch) => {
          if (cancelled) return;
          setAppState((prev) => {
            const mergedPatch: Partial<AppState> = { ...patch };
            if (patch.users) {
              mergedPatch.users = patch.users.map((incomingUser) => {
                const prevUser = prev.users.find((u) => u.id === incomingUser.id);
                return {
                  ...incomingUser,
                  email: incomingUser.email || prevUser?.email || 'user@keystone.com',
                };
              });
            }
            const next: AppState = { ...prev, ...mergedPatch };
            const ts = Date.now();
            lastSyncedAtRef.current = ts;
            saveAppState(next, ts);
            return next;
          });
        });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setCloudError(msg);
          setIsCloudConnected(false);
        }
      }
    };

    void connectCloud();

    return () => {
      cancelled = true;
      firestoreCtxRef.current = null;
      setIsCloudConnected(false);
      if (unsubFirestore) unsubFirestore();
      if (cloudConfigTimerRef.current) clearTimeout(cloudConfigTimerRef.current);
    };
  }, [authReady, firebaseUser]);

  // Sync state with backend JSON database & other browser tabs
  useEffect(() => {
    let active = true;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('trainer_hub_sync');
      broadcastRef.current = channel;
      channel.onmessage = (event) => {
        const msg = event.data as {
          type?: string;
          state?: AppState;
          updatedAt?: number;
        };
        if (
          msg?.type === 'STATE_UPDATED' &&
          msg.state &&
          typeof msg.updatedAt === 'number' &&
          msg.updatedAt > lastSyncedAtRef.current
        ) {
          lastSyncedAtRef.current = msg.updatedAt;
          saveAppState(msg.state, msg.updatedAt);
          setAppState(msg.state);
        }
      };
    }

    const syncFromServer = async (seedIfEmpty: boolean) => {
      if (pendingLocalWriteRef.current) return;
      const serverResult = await fetchServerState();
      if (!active || !serverResult) return;

      if (serverResult.state === null) {
        if (seedIfEmpty && !pendingLocalWriteRef.current) {
          const initialLocal = loadAppState();
          const serverTs = await pushServerState(initialLocal);
          if (active && serverTs) {
            lastSyncedAtRef.current = serverTs;
            saveAppState(initialLocal, serverTs);
          }
        }
        return;
      }

      if (
        !pendingLocalWriteRef.current &&
        serverResult.updatedAt > lastSyncedAtRef.current
      ) {
        lastSyncedAtRef.current = serverResult.updatedAt;
        saveAppState(serverResult.state, serverResult.updatedAt);
        setAppState(serverResult.state);
      }
    };

    void syncFromServer(true);

    const pollId = setInterval(() => {
      void syncFromServer(false);
    }, 4000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncFromServer(false);
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      active = false;
      clearInterval(pollId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      broadcastRef.current?.close();
      broadcastRef.current = null;
    };
  }, []);

  const flushServerSave = async (stateToSave: AppState) => {
    const serverTs = await pushServerState(stateToSave);
    pendingLocalWriteRef.current = false;
    if (serverTs) {
      lastSyncedAtRef.current = serverTs;
      saveAppState(stateToSave, serverTs);
      broadcastRef.current?.postMessage({
        type: 'STATE_UPDATED',
        state: stateToSave,
        updatedAt: serverTs,
      });
    }
  };

  const updateState = (
    updater: (prev: AppState) => AppState,
    options?: { toast?: { en: string; es: string }; immediate?: boolean }
  ) => {
    pendingLocalWriteRef.current = true;
    const localTs = Date.now();
    lastSyncedAtRef.current = localTs;

    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next, localTs);
      broadcastRef.current?.postMessage({
        type: 'STATE_UPDATED',
        state: next,
        updatedAt: localTs,
      });

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (options?.immediate) {
        void flushServerSave(next);
      } else {
        saveTimerRef.current = setTimeout(() => {
          void flushServerSave(next);
        }, 250);
      }
      return next;
    });

    if (options?.toast) {
      showToast(options.toast.en, options.toast.es);
    }
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next: Language = prev === 'en' ? 'es' : 'en';
      saveLanguage(next);
      return next;
    });
  };

  const handleRoleChange = (role: UserRole) => {
    if (role === 'admin' && !isAdminUnlocked) {
      setIsAdminPasswordModalOpen(true);
      return;
    }
    setCurrentRole(role);
    saveActiveRole(role);
    if (role === 'admin') {
      setActiveTab('admin');
    }
  };

  const handleAdminModalSuccess = () => {
    setIsAdminUnlocked(true);
    setIsAdminPasswordModalOpen(false);
    setCurrentRole('admin');
    saveActiveRole('admin');
    setActiveTab('admin');
  };

  const handleUnlockAdminFromView = (password: string): boolean => {
    if (password === appState.config.adminPassword) {
      setIsAdminUnlocked(true);
      return true;
    }
    return false;
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    if (currentRole === 'admin') {
      setCurrentRole('trainer_a');
      saveActiveRole('trainer_a');
    }
  };

  const currentUser: UserProfile =
    appState.users.find((u) => u.role === currentRole) || {
      id: 'default_user',
      name:
        currentRole === 'trainer_a'
          ? 'Israel Martines'
          : currentRole === 'trainer_b'
          ? 'Andreina Morantes'
          : currentRole === 'supervisor'
          ? 'Jonathan de Jesús'
          : appState.config.adminLabel,
      email: 'user@keystone.com',
      role: currentRole,
      title: currentRole,
      assignedRooms: [],
      avatar: 'TH',
      status: 'active',
    };

  const handleConfirmReset = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (cloudConfigTimerRef.current) clearTimeout(cloudConfigTimerRef.current);
    pendingLocalWriteRef.current = true;
    const fresh = resetAppState();
    const nowTs = Date.now();
    lastSyncedAtRef.current = nowTs;
    setAppState(fresh);
    setIsResetModalOpen(false);
    broadcastRef.current?.postMessage({
      type: 'STATE_UPDATED',
      state: fresh,
      updatedAt: nowTs,
    });
    void resetServerState(fresh).then((serverTs) => {
      pendingLocalWriteRef.current = false;
      if (serverTs) {
        lastSyncedAtRef.current = serverTs;
        saveAppState(fresh, serverTs);
      }
    });
    runCloudWrite((ctx) => resetWorkspaceInFirestore(ctx, fresh));
    showToast('Data reset to defaults', 'Datos restablecidos al estado inicial');
  };

  // Standard Work task handlers
  const handleToggleTaskComplete = (taskId: string) => {
    let updatedTaskForCloud: WorkStandardTask | null = null;
    updateState(
      (prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const nextCompleted = !t.completed;
          updatedTaskForCloud = {
            ...t,
            completed: nextCompleted,
            status: nextCompleted ? 'Completado' : 'Pendiente',
          };
          return updatedTaskForCloud;
        }),
      }),
      {
        immediate: true,
        toast: { en: 'Task status updated', es: 'Estado de actividad actualizado' },
      }
    );
    if (updatedTaskForCloud) {
      const taskToSave = updatedTaskForCloud;
      runCloudWrite((ctx) => upsertTaskToFirestore(ctx, taskToSave));
    }
  };

  const handleAddTask = (newTask: Omit<WorkStandardTask, 'id'>) => {
    const task: WorkStandardTask = {
      ...newTask,
      id: `task_${Date.now()}`,
    };
    updateState(
      (prev) => ({
        ...prev,
        tasks: [task, ...prev.tasks],
      }),
      {
        immediate: true,
        toast: { en: 'Activity added & saved', es: 'Actividad agregada y guardada' },
      }
    );
    runCloudWrite((ctx) => upsertTaskToFirestore(ctx, task));
  };

  const handleUpdateTask = (updatedTask: WorkStandardTask) => {
    updateState(
      (prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }),
      {
        immediate: true,
        toast: { en: 'Activity updated', es: 'Actividad actualizada' },
      }
    );
    runCloudWrite((ctx) => upsertTaskToFirestore(ctx, updatedTask));
  };

  const handleDeleteTask = (taskId: string) => {
    updateState(
      (prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
      }),
      {
        immediate: true,
        toast: { en: 'Activity removed', es: 'Actividad eliminada' },
      }
    );
    runCloudWrite((ctx) => deleteTaskFromFirestore(ctx, taskId));
  };

  // Room Review handlers (6 checkboxes)
  const handleAddReview = (newReview: Omit<RoomReview, 'id' | 'createdAt'>) => {
    const review: RoomReview = {
      ...newReview,
      id: `rev_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const replacedIds = appStateRef.current.roomReviews
      .filter((r) => r.roomId === review.roomId && r.date === review.date)
      .map((r) => r.id);

    updateState(
      (prev) => ({
        ...prev,
        roomReviews: [
          review,
          ...prev.roomReviews.filter(
            (r) => !(r.roomId === review.roomId && r.date === review.date)
          ),
        ],
      }),
      {
        immediate: true,
        toast: { en: 'Room review saved', es: 'Revisión de cuarto guardada' },
      }
    );
    runCloudWrite((ctx) => upsertRoomReviewToFirestore(ctx, review, replacedIds));
  };

  // Employee handlers
  const handleAddEmployee = (newEmp: Omit<Employee, 'id'>) => {
    const emp: Employee = {
      ...newEmp,
      id: `emp_${Date.now()}`,
    };
    updateState(
      (prev) => ({
        ...prev,
        employees: [emp, ...prev.employees],
      }),
      {
        immediate: true,
        toast: { en: 'Employee added & saved', es: 'Empleado agregado y guardado' },
      }
    );
    runCloudWrite((ctx) => upsertEmployeeToFirestore(ctx, emp));
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    updateState(
      (prev) => ({
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === updatedEmp.id ? updatedEmp : e
        ),
      }),
      {
        immediate: true,
        toast: { en: 'Employee updated', es: 'Empleado actualizado' },
      }
    );
    runCloudWrite((ctx) => upsertEmployeeToFirestore(ctx, updatedEmp));
  };

  const handleDeleteEmployee = (empId: string) => {
    updateState(
      (prev) => ({
        ...prev,
        employees: prev.employees.filter((e) => e.id !== empId),
      }),
      {
        immediate: true,
        toast: { en: 'Employee removed', es: 'Empleado eliminado' },
      }
    );
    runCloudWrite((ctx) => deleteEmployeeFromFirestore(ctx, empId));
  };

  const handleToggleEmployeeStatus = (empId: string) => {
    let updatedEmp: Employee | null = null;
    updateState(
      (prev) => ({
        ...prev,
        employees: prev.employees.map((e) => {
          if (e.id !== empId) return e;
          updatedEmp = { ...e, status: e.status === 'Activo' ? 'Inactivo' : 'Activo' };
          return updatedEmp;
        }),
      }),
      {
        immediate: true,
        toast: { en: 'Employee status updated', es: 'Estado del empleado actualizado' },
      }
    );
    if (updatedEmp) {
      const empToSave = updatedEmp;
      runCloudWrite((ctx) => upsertEmployeeToFirestore(ctx, empToSave));
    }
  };

  // Monthly Evaluation handler
  const handleAddEvaluation = (newEval: Omit<EvaluationRecord, 'id'>) => {
    const evaluation: EvaluationRecord = {
      ...newEval,
      id: `eval_${Date.now()}`,
    };
    updateState(
      (prev) => ({
        ...prev,
        evaluations: [evaluation, ...prev.evaluations],
      }),
      {
        immediate: true,
        toast: { en: 'Monthly evaluation saved', es: 'Evaluación mensual guardada' },
      }
    );
    runCloudWrite((ctx) => addEvaluationToFirestore(ctx, evaluation));
  };

  // Completed Training Logbook handler
  const handleAddTrainingSession = (newSession: Omit<TrainingSession, 'id'>) => {
    const session: TrainingSession = {
      ...newSession,
      id: `train_${Date.now()}`,
    };
    updateState(
      (prev) => ({
        ...prev,
        trainingSessions: [session, ...prev.trainingSessions],
      }),
      {
        immediate: true,
        toast: { en: 'Training logged & saved', es: 'Entrenamiento guardado en bitácora' },
      }
    );
    runCloudWrite((ctx) => addTrainingSessionToFirestore(ctx, session));
  };

  // Supervisor Feedback handlers
  const handleAddFeedback = (newFb: Omit<SupervisorFeedback, 'id' | 'read'>) => {
    const feedback: SupervisorFeedback = {
      ...newFb,
      id: `fb_${Date.now()}`,
      read: false,
    };
    updateState(
      (prev) => ({
        ...prev,
        supervisorFeedbacks: [feedback, ...prev.supervisorFeedbacks],
      }),
      {
        immediate: true,
        toast: { en: 'Feedback saved', es: 'Retroalimentación guardada' },
      }
    );
    runCloudWrite((ctx) => upsertSupervisorFeedbackToFirestore(ctx, feedback));
  };

  const handleMarkFeedbackRead = (fbId: string) => {
    let updatedFb: SupervisorFeedback | null = null;
    updateState(
      (prev) => ({
        ...prev,
        supervisorFeedbacks: prev.supervisorFeedbacks.map((f) => {
          if (f.id !== fbId) return f;
          updatedFb = { ...f, read: true };
          return updatedFb;
        }),
      }),
      { immediate: true }
    );
    if (updatedFb) {
      const fbToSave = updatedFb;
      runCloudWrite((ctx) => upsertSupervisorFeedbackToFirestore(ctx, fbToSave));
    }
  };

  // Standard Work visual review & coaching handlers
  const handleSaveVisualReview = (
    reviewData: Omit<VisualRoomReview, 'id' | 'createdAt'>,
    weaknessPayload?: { employeeId: string; description: string }
  ) => {
    const review: VisualRoomReview = {
      ...reviewData,
      id: `vis_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    let createdWeakness: EmployeeWeakness | null = null;

    updateState(
      (prev) => {
        let nextWeaknesses = prev.weaknesses;
        if (weaknessPayload) {
          const emp = prev.employees.find((e) => e.id === weaknessPayload.employeeId);
          createdWeakness = {
            id: `weak_${Date.now()}`,
            date: reviewData.date,
            roomId: emp?.room || 'General',
            employeeId: weaknessPayload.employeeId,
            employeeName: emp?.name || 'Employee',
            position: emp?.position || 'Segundo',
            weaknessDescription: weaknessPayload.description,
            category: categorizeWeakness(weaknessPayload.description),
            status: 'En proceso',
            createdAt: new Date().toISOString(),
          };
          nextWeaknesses = [createdWeakness, ...prev.weaknesses];
        }

        return {
          ...prev,
          visualReviews: [review, ...prev.visualReviews],
          weaknesses: nextWeaknesses,
        };
      },
      {
        immediate: true,
        toast: { en: 'Visual review saved', es: 'Revisión visual guardada' },
      }
    );
    runCloudWrite(async (ctx) => {
      await addVisualReviewToFirestore(ctx, review);
      if (createdWeakness) await addWeaknessToFirestore(ctx, createdWeakness);
    });
  };

  const handleSaveWeakness = (
    weaknessData: Omit<EmployeeWeakness, 'id' | 'createdAt'>,
    completedTrainingTopic?: string
  ) => {
    const newWeakness: EmployeeWeakness = {
      ...weaknessData,
      id: `weak_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    let createdTraining: TrainingSession | null = null;

    updateState(
      (prev) => {
        let nextSessions = prev.trainingSessions;
        if (completedTrainingTopic) {
          const emp = prev.employees.find((e) => e.id === weaknessData.employeeId);
          const trainerId = emp?.trainerId || (currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a');
          const trainerUser = prev.users.find((u) => u.role === trainerId);
          createdTraining = {
            id: `train_${Date.now()}`,
            date: weaknessData.date,
            employeeId: weaknessData.employeeId,
            employeeName: weaknessData.employeeName,
            employeePosition: weaknessData.position,
            shift: emp?.shift || (trainerId === 'trainer_b' ? 'Mon-Thu' : 'Shift A (Mon-Wed)'),
            trainerId,
            trainerName: trainerUser?.name || currentUser.name,
            competency: completedTrainingTopic,
            room: emp?.room,
            durationMinutes: 30,
            comments: weaknessData.weaknessDescription,
          };
          nextSessions = [createdTraining, ...prev.trainingSessions];
        }

        return {
          ...prev,
          weaknesses: [newWeakness, ...prev.weaknesses],
          trainingSessions: nextSessions,
        };
      },
      {
        immediate: true,
        toast: { en: 'Coaching record saved', es: 'Seguimiento guardado' },
      }
    );
    runCloudWrite(async (ctx) => {
      await addWeaknessToFirestore(ctx, newWeakness);
      if (createdTraining) await addTrainingSessionToFirestore(ctx, createdTraining);
    });
  };

  const handleSaveDailySummary = (summary: DailySummary) => {
    const replacedIds = appStateRef.current.dailySummaries
      .filter((s) => s.date === summary.date && s.trainerId === summary.trainerId)
      .map((s) => s.id);
    updateState(
      (prev) => ({
        ...prev,
        dailySummaries: [
          summary,
          ...prev.dailySummaries.filter(
            (s) => !(s.date === summary.date && s.trainerId === summary.trainerId)
          ),
        ],
      }),
      {
        immediate: true,
        toast: { en: 'Daily summary saved', es: 'Resumen del día guardado' },
      }
    );
    runCloudWrite((ctx) => upsertDailySummaryToFirestore(ctx, summary, replacedIds));
  };

  const handleAddObservation = (obs: Omit<ImprovementObservation, 'id' | 'createdAt'>) => {
    const newObs: ImprovementObservation = {
      ...obs,
      id: `obs_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState(
      (prev) => ({
        ...prev,
        observations: [newObs, ...prev.observations],
      }),
      {
        immediate: true,
        toast: { en: 'Observation added', es: 'Observación agregada' },
      }
    );
    runCloudWrite((ctx) => upsertObservationToFirestore(ctx, newObs));
  };

  const handleUpdateObservationStatus = (
    id: string,
    status: 'Pendiente' | 'En proceso' | 'Resuelto'
  ) => {
    let updatedObs: ImprovementObservation | null = null;
    updateState(
      (prev) => ({
        ...prev,
        observations: prev.observations.map((o) => {
          if (o.id !== id) return o;
          updatedObs = { ...o, status };
          return updatedObs;
        }),
      }),
      {
        immediate: true,
        toast: { en: 'Observation updated', es: 'Observación actualizada' },
      }
    );
    if (updatedObs) {
      const obsToSave = updatedObs;
      runCloudWrite((ctx) => upsertObservationToFirestore(ctx, obsToSave));
    }
  };

  const syncUserAssignedRooms = (users: UserProfile[], rooms: RoomDefinition[]): UserProfile[] => {
    return users.map((u) => {
      if (u.role === 'trainer_a' || u.role === 'trainer_b') {
        return {
          ...u,
          assignedRooms: rooms.filter((r) => r.trainer === u.role).map((r) => r.id),
        };
      }
      return u;
    });
  };

  // Keystone ADMIN handlers
  const handleUpdateConfig = (nextConfig: AppConfig, notify?: boolean) => {
    updateState(
      (prev) => ({
        ...prev,
        config: nextConfig,
      }),
      notify
        ? {
            immediate: true,
            toast: {
              en: 'Settings saved & updated everywhere',
              es: 'Configuración guardada y actualizada',
            },
          }
        : undefined
    );
    if (cloudConfigTimerRef.current) clearTimeout(cloudConfigTimerRef.current);
    if (notify) {
      runCloudWrite((ctx) => saveConfigToFirestore(ctx, nextConfig));
    } else {
      cloudConfigTimerRef.current = setTimeout(() => {
        runCloudWrite((ctx) => saveConfigToFirestore(ctx, nextConfig));
      }, 450);
    }
  };

  const handleUpdateRoom = (updatedRoom: RoomDefinition) => {
    let syncedTrainers: UserProfile[] = [];
    updateState(
      (prev) => {
        const nextRooms = prev.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
        const nextUsers = syncUserAssignedRooms(prev.users, nextRooms);
        syncedTrainers = nextUsers.filter((u) => u.role === 'trainer_a' || u.role === 'trainer_b');
        return {
          ...prev,
          rooms: nextRooms,
          users: nextUsers,
        };
      },
      {
        immediate: true,
        toast: {
          en: 'Room updated across all views',
          es: 'Cuarto actualizado en todas las vistas',
        },
      }
    );
    runCloudWrite(async (ctx) => {
      await upsertRoomToFirestore(ctx, updatedRoom);
      for (const u of syncedTrainers) await upsertAppUserToFirestore(ctx, u);
    });
  };

  const handleAddRoom = (newRoom: RoomDefinition) => {
    let syncedTrainers: UserProfile[] = [];
    updateState(
      (prev) => {
        const nextRooms = [...prev.rooms, newRoom];
        const nextUsers = syncUserAssignedRooms(prev.users, nextRooms);
        syncedTrainers = nextUsers.filter((u) => u.role === 'trainer_a' || u.role === 'trainer_b');
        return {
          ...prev,
          rooms: nextRooms,
          users: nextUsers,
        };
      },
      {
        immediate: true,
        toast: { en: 'Room added & updated', es: 'Cuarto agregado y actualizado' },
      }
    );
    runCloudWrite(async (ctx) => {
      await upsertRoomToFirestore(ctx, newRoom);
      for (const u of syncedTrainers) await upsertAppUserToFirestore(ctx, u);
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    let syncedTrainers: UserProfile[] = [];
    updateState(
      (prev) => {
        const nextRooms = prev.rooms.filter((r) => r.id !== roomId);
        const nextUsers = syncUserAssignedRooms(prev.users, nextRooms);
        syncedTrainers = nextUsers.filter((u) => u.role === 'trainer_a' || u.role === 'trainer_b');
        return {
          ...prev,
          rooms: nextRooms,
          users: nextUsers,
        };
      },
      {
        immediate: true,
        toast: { en: 'Room removed', es: 'Cuarto eliminado' },
      }
    );
    runCloudWrite(async (ctx) => {
      await deleteRoomFromFirestore(ctx, roomId);
      for (const u of syncedTrainers) await upsertAppUserToFirestore(ctx, u);
    });
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    const snapshotBefore = appStateRef.current;
    updateState(
      (prev) => {
        const isTrainer =
          updatedUser.role === 'trainer_a' || updatedUser.role === 'trainer_b';
        const isSupervisor = updatedUser.role === 'supervisor';

        return {
          ...prev,
          users: prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
          roomReviews: isTrainer
            ? prev.roomReviews.map((r) =>
                r.trainerId === updatedUser.role
                  ? { ...r, trainerName: updatedUser.name }
                  : r
              )
            : prev.roomReviews,
          evaluations: isTrainer
            ? prev.evaluations.map((e) =>
                e.trainerId === updatedUser.role
                  ? { ...e, trainerName: updatedUser.name }
                  : e
              )
            : prev.evaluations,
          trainingSessions: isTrainer
            ? prev.trainingSessions.map((s) =>
                s.trainerId === updatedUser.role
                  ? { ...s, trainerName: updatedUser.name }
                  : s
              )
            : prev.trainingSessions,
          dailySummaries: isTrainer
            ? prev.dailySummaries.map((d) =>
                d.trainerId === updatedUser.role
                  ? { ...d, trainerName: updatedUser.name }
                  : d
              )
            : prev.dailySummaries,
          visualReviews: isTrainer
            ? prev.visualReviews.map((v) =>
                v.trainerId === updatedUser.role
                  ? { ...v, trainerName: updatedUser.name }
                  : v
              )
            : prev.visualReviews,
          supervisorFeedbacks: isSupervisor
            ? prev.supervisorFeedbacks.map((fb) => ({
                ...fb,
                supervisorName: updatedUser.name,
              }))
            : prev.supervisorFeedbacks,
        };
      },
      {
        immediate: true,
        toast: {
          en: 'User & records updated',
          es: 'Usuario y registros actualizados',
        },
      }
    );
    runCloudWrite(async (ctx) => {
      await upsertAppUserToFirestore(ctx, updatedUser);
      if (
        updatedUser.role === 'trainer_a' ||
        updatedUser.role === 'trainer_b' ||
        updatedUser.role === 'supervisor'
      ) {
        await cascadeTrainerNameInFirestore(
          ctx,
          updatedUser.role,
          updatedUser.name,
          snapshotBefore
        );
      }
    });
  };

  const handleApproveRegistration = (regId: string) => {
    let createdUser: UserProfile | null = null;
    updateState(
      (prev) => {
        const reg = prev.pendingRegistrations.find((r) => r.id === regId);
        if (!reg) return prev;
        createdUser = {
          id: `user_${Date.now()}`,
          name: reg.name,
          email: reg.email,
          role: reg.requestedRole,
          title: reg.department,
          assignedRooms: [],
          avatar: reg.name.substring(0, 2).toUpperCase(),
          status: 'active',
        };
        return {
          ...prev,
          pendingRegistrations: prev.pendingRegistrations.map((r) =>
            r.id === regId ? { ...r, status: 'aprobado' } : r
          ),
          users: [...prev.users, createdUser],
        };
      },
      {
        immediate: true,
        toast: { en: 'Registration approved', es: 'Solicitud aprobada' },
      }
    );
    runCloudWrite(async (ctx) => {
      await updatePendingRegistrationStatusInFirestore(ctx, regId, 'aprobado');
      if (createdUser) await upsertAppUserToFirestore(ctx, createdUser);
    });
  };

  const handleRejectRegistration = (regId: string) => {
    updateState(
      (prev) => ({
        ...prev,
        pendingRegistrations: prev.pendingRegistrations.map((r) =>
          r.id === regId ? { ...r, status: 'rechazado' } : r
        ),
      }),
      {
        immediate: true,
        toast: { en: 'Registration rejected', es: 'Solicitud rechazada' },
      }
    );
    runCloudWrite((ctx) => updatePendingRegistrationStatusInFirestore(ctx, regId, 'rechazado'));
  };

  const handleToggleUserStatus = (userId: string) => {
    let updatedUser: UserProfile | null = null;
    updateState(
      (prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (u.id !== userId) return u;
          updatedUser = { ...u, status: u.status === 'active' ? 'inactive' : 'active' };
          return updatedUser;
        }),
      }),
      {
        immediate: true,
        toast: { en: 'User status updated', es: 'Estado de usuario actualizado' },
      }
    );
    if (updatedUser) {
      const userToSave = updatedUser;
      runCloudWrite((ctx) => upsertAppUserToFirestore(ctx, userToSave));
    }
  };

  const handleAddUser = (newUser: Omit<UserProfile, 'id'>) => {
    const user: UserProfile = {
      ...newUser,
      id: `user_${Date.now()}`,
    };
    updateState(
      (prev) => ({
        ...prev,
        users: [...prev.users, user],
      }),
      {
        immediate: true,
        toast: { en: 'User created & saved', es: 'Usuario creado y guardado' },
      }
    );
    runCloudWrite((ctx) => upsertAppUserToFirestore(ctx, user));
  };

  const handleDeleteUser = (userId: string) => {
    updateState(
      (prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
      }),
      {
        immediate: true,
        toast: { en: 'User deleted', es: 'Usuario eliminado' },
      }
    );
    runCloudWrite((ctx) => deleteAppUserFromFirestore(ctx, userId));
  };

  const handleStartEvaluation = (emp: Employee) => {
    setPreselectedEmpForEval(emp);
    setActiveTab('evaluations');
  };

  const handleStartTraining = (emp: Employee) => {
    setPreselectedEmpForTrain(emp);
    setActiveTab('trainings');
  };

  const targetTrainerForTasks = currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a';
  const myTasks = appState.tasks.filter((t) => t.trainerId === targetTrainerForTasks);
  const pendingTasksCount = myTasks.filter((t) => !t.completed && !t.isCreditedSupport).length;
  const pendingFeedbacksCount = appState.supervisorFeedbacks.filter(
    (f) => !f.read && f.targetTrainerId === targetTrainerForTasks
  ).length;
  const pendingRegistrationsCount = appState.pendingRegistrations.filter(
    (r) => r.status === 'pendiente'
  ).length;

  const isEn = language === 'en';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-x-hidden">
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        config={appState.config}
        users={appState.users}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        isAdminUnlocked={isAdminUnlocked}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onResetData={() => setIsResetModalOpen(true)}
        onToggleMobileMenu={() => setMobileMenuOpen(true)}
        firebaseUser={firebaseUser}
        isCloudConnected={isCloudConnected}
        authLoading={authLoading}
        onFirebaseSignIn={() => void handleFirebaseSignIn()}
        onFirebaseSignOut={() => void handleFirebaseSignOut()}
      />

      {(!firebaseUser && !isCloudBannerDismissed) && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900 px-4 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200 min-w-0">
              <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">
                {isEn
                  ? 'Firebase Auth & Cloud Firestore are ready. Sign in with Google to save and sync all Trainer Hub data in the cloud.'
                  : 'Firebase Auth y Cloud Firestore están listos. Inicia sesión con Google para guardar y sincronizar todos los datos en la nube.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void handleFirebaseSignIn()}
                disabled={authLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isEn ? 'Sign in with Google' : 'Iniciar sesión con Google'}</span>
              </button>
              <button
                onClick={() => setIsCloudBannerDismissed(true)}
                aria-label={isEn ? 'Dismiss cloud banner' : 'Ocultar aviso'}
                className="p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {(authError || cloudError) && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 px-4 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="truncate">
                {(cloudError || authError)?.includes('Free daily read units per project') ||
                (cloudError || authError)?.includes('Quota exceeded')
                  ? isEn
                    ? `Firestore daily free quota exceeded. Quota resets tomorrow, or upgrade here: https://console.firebase.google.com/project/${firebaseAppletConfig.projectId}/firestore/databases/${firebaseAppletConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`
                    : `Se alcanzó la cuota diaria gratuita de Firestore. Se restablece mañana o puedes revisarla aquí: https://console.firebase.google.com/project/${firebaseAppletConfig.projectId}/firestore/databases/${firebaseAppletConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`
                  : cloudError || authError}
              </span>
            </div>
            <button
              onClick={() => {
                clearAuthError();
                setCloudError(null);
              }}
              aria-label={isEn ? 'Close error notice' : 'Cerrar aviso de error'}
              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex w-full">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          config={appState.config}
          users={appState.users}
          language={language}
          isAdminUnlocked={isAdminUnlocked}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          counts={{
            pendingTasks: pendingTasksCount,
            pendingFeedbacks: pendingFeedbacksCount,
            pendingRegistrations: pendingRegistrationsCount,
          }}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              language={language}
              state={appState}
              currentUser={currentUser}
              currentRole={currentRole}
              onNavigate={setActiveTab}
              onToggleTaskComplete={handleToggleTaskComplete}
            />
          )}

          {activeTab === 'work_standard' && (
            <WorkStandardView
              language={language}
              config={appState.config}
              users={appState.users}
              tasks={appState.tasks}
              rooms={appState.rooms}
              employees={appState.employees}
              visualReviews={appState.visualReviews}
              weaknesses={appState.weaknesses}
              trainingSessions={appState.trainingSessions}
              observations={appState.observations}
              dailySummaries={appState.dailySummaries}
              currentUser={currentUser}
              currentRole={currentRole}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onSaveVisualReview={handleSaveVisualReview}
              onSaveWeakness={handleSaveWeakness}
              onSaveDailySummary={handleSaveDailySummary}
              onAddObservation={handleAddObservation}
              onUpdateObservationStatus={handleUpdateObservationStatus}
            />
          )}

          {activeTab === 'room_reviews' && (
            <RoomReviewsView
              language={language}
              config={appState.config}
              rooms={appState.rooms}
              reviews={appState.roomReviews}
              currentUser={currentUser}
              currentRole={currentRole}
              onAddReview={handleAddReview}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              language={language}
              config={appState.config}
              rooms={appState.rooms}
              users={appState.users}
              employees={appState.employees}
              evaluations={appState.evaluations}
              trainingSessions={appState.trainingSessions}
              currentUser={currentUser}
              currentRole={currentRole}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onToggleStatus={handleToggleEmployeeStatus}
              onStartEvaluation={handleStartEvaluation}
              onStartTraining={handleStartTraining}
            />
          )}

          {activeTab === 'evaluations' && (
            <EvaluationsView
              language={language}
              config={appState.config}
              rooms={appState.rooms}
              users={appState.users}
              evaluations={appState.evaluations}
              employees={appState.employees}
              currentUser={currentUser}
              currentRole={currentRole}
              onAddEvaluation={handleAddEvaluation}
              preselectedEmployee={preselectedEmpForEval}
              onClearPreselected={() => setPreselectedEmpForEval(null)}
            />
          )}

          {activeTab === 'trainings' && (
            <TrainingsView
              language={language}
              config={appState.config}
              users={appState.users}
              rooms={appState.rooms}
              sessions={appState.trainingSessions}
              employees={appState.employees}
              currentUser={currentUser}
              currentRole={currentRole}
              onAddSession={handleAddTrainingSession}
              preselectedEmployee={preselectedEmpForTrain}
              onClearPreselected={() => setPreselectedEmpForTrain(null)}
            />
          )}

          {activeTab === 'supervision' && (
            <SupervisionView
              language={language}
              state={appState}
              currentUser={currentUser}
              currentRole={currentRole}
              onAddFeedback={handleAddFeedback}
              onMarkFeedbackRead={handleMarkFeedbackRead}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView
              language={language}
              config={appState.config}
              rooms={appState.rooms}
              users={appState.users}
              pendingRegistrations={appState.pendingRegistrations}
              isAdminUnlocked={isAdminUnlocked}
              onUnlockAdmin={handleUnlockAdminFromView}
              onLockAdmin={handleLockAdmin}
              onUpdateConfig={handleUpdateConfig}
              onUpdateRoom={handleUpdateRoom}
              onAddRoom={handleAddRoom}
              onDeleteRoom={handleDeleteRoom}
              onUpdateUser={handleUpdateUser}
              onApproveRegistration={handleApproveRegistration}
              onRejectRegistration={handleRejectRegistration}
              onToggleUserStatus={handleToggleUserStatus}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </main>
      </div>

      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        language={language}
        expectedPassword={appState.config.adminPassword}
        onSuccess={handleAdminModalSuccess}
        onCancel={() => setIsAdminPasswordModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isResetModalOpen}
        title={isEn ? 'Reset Initial Data' : 'Restablecer Datos Iniciales'}
        message={
          isEn
            ? 'Are you sure you want to reset all rooms, employees, evaluations, and custom labels to their initial defaults?'
            : '¿Estás seguro de que deseas reiniciar cuartos, empleados, evaluaciones y nombres personalizados a su estado inicial?'
        }
        confirmLabel={isEn ? 'Reset All' : 'Restablecer Todo'}
        cancelLabel={isEn ? 'Cancel' : 'Cancelar'}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold shadow-lg border border-slate-700 dark:border-emerald-500"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
