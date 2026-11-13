import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
  SupervisorFeedback,
  TrainingSession,
  UserProfile,
  VisualRoomReview,
  WorkStandardTask,
} from '../types';
import { AppState } from './storage';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  buildAppUserPayload,
  buildDailySummaryPayload,
  buildEmployeePayload,
  buildEvaluationPayload,
  buildObservationPayload,
  buildPendingRegistrationPayload,
  buildRoomPayload,
  buildRoomReviewPayload,
  buildSupervisorFeedbackPayload,
  buildTaskPayload,
  buildTrainingSessionPayload,
  buildVisualReviewPayload,
  buildWeaknessPayload,
  buildWorkspaceConfigPayload,
  clampStr,
  DEFAULT_WORKSPACE_ID,
  normalizeDocId,
  sanitizeMemberUids,
  stripUndefined,
} from './firestorePayload';

export interface WorkspaceSessionContext {
  workspaceId: string;
  uid: string;
  ownerId: string;
  memberUids: string[];
  isAdmin: boolean;
  seeded: boolean;
}

function toIsoString(val: unknown, fallbackIso?: string): string {
  if (typeof fallbackIso === 'string' && fallbackIso.length > 0) return fallbackIso;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export async function ensureFirebaseWorkspaceSession(
  user: User,
  fallbackState: AppState,
  workspaceId = DEFAULT_WORKSPACE_ID
): Promise<WorkspaceSessionContext> {
  const uid = normalizeDocId(user.uid);
  const isBootstrapped =
    user.email === BOOTSTRAPPED_ADMIN_EMAIL && Boolean(user.emailVerified);

  // 1. Register /users/{uid} (public non-PII profile) and /users/{uid}/private/profile
  const userDocRef = doc(db, 'users', uid);
  try {
    const userSnap = await getDoc(userDocRef);
    const displayName = clampStr(user.displayName || user.email?.split('@')[0], 120, 'Trainer User');
    if (!userSnap.exists()) {
      await setDoc(userDocRef, {
        uid,
        displayName,
        role: isBootstrapped ? 'admin' : 'trainer_a',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userDocRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  const userPrivateRef = doc(db, 'users', uid, 'private', 'profile');
  try {
    await setDoc(userPrivateRef, {
      uid,
      email: clampStr(user.email, 180, 'user@keystone.com'),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/profile`);
  }

  // 2. Register /admins/{uid} if bootstrapped admin
  let isAdminUser = isBootstrapped;
  const adminRef = doc(db, 'admins', uid);
  try {
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      isAdminUser = true;
    } else if (isBootstrapped) {
      await setDoc(adminRef, {
        uid,
        grantedBy: 'system_bootstrap',
        createdAt: serverTimestamp(),
      });
      isAdminUser = true;
    }
  } catch (err) {
    if (isBootstrapped) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${uid}`);
    }
  }

  // 3. Ensure /workspaces/{workspaceId} and /workspaces/{workspaceId}/members/{uid}
  const wsRef = doc(db, 'workspaces', workspaceId);
  let ownerId = uid;
  let memberUids = [uid];
  let seeded = false;

  try {
    const wsSnap = await getDoc(wsRef);
    if (!wsSnap.exists()) {
      const wsPayload = buildWorkspaceConfigPayload(
        fallbackState.config,
        workspaceId,
        uid,
        [uid],
        serverTimestamp(),
        serverTimestamp()
      );
      await setDoc(wsRef, wsPayload);

      const memberRef = doc(db, 'workspaces', workspaceId, 'members', uid);
      await setDoc(memberRef, {
        uid,
        workspaceId,
        displayName: clampStr(user.displayName || 'Administrator', 120, 'Administrator'),
        appRole: isAdminUser ? 'admin' : 'trainer_a',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await seedWorkspaceCollections(workspaceId, uid, [uid], fallbackState, isAdminUser);
      seeded = true;
    } else {
      const wsData = wsSnap.data();
      ownerId = normalizeDocId(String(wsData.ownerId || uid));
      const existingMembers = Array.isArray(wsData.memberUids)
        ? (wsData.memberUids as string[])
        : [ownerId];
      memberUids = sanitizeMemberUids([...existingMembers, uid], ownerId);

      const memberRef = doc(db, 'workspaces', workspaceId, 'members', uid);
      const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists() && (isAdminUser || ownerId === uid)) {
        await setDoc(memberRef, {
          uid,
          workspaceId,
          displayName: clampStr(user.displayName || 'Trainer Hub User', 120, 'Trainer Hub User'),
          appRole: isAdminUser ? 'admin' : 'trainer_a',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (!existingMembers.includes(uid) && (isAdminUser || ownerId === uid)) {
        await updateDoc(wsRef, {
          memberUids,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${workspaceId}`);
  }

  return {
    workspaceId,
    uid,
    ownerId,
    memberUids,
    isAdmin: isAdminUser,
    seeded,
  };
}

async function commitBatchedWrites(
  ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }>,
  pathContext: string
): Promise<void> {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      batch.set(op.ref, op.data);
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, pathContext);
    }
  }
}

export async function seedWorkspaceCollections(
  workspaceId: string,
  ownerId: string,
  memberUids: string[],
  state: AppState,
  includePrivateContacts = true
): Promise<void> {
  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  const tNow = serverTimestamp();

  for (const r of state.rooms) {
    const data = buildRoomPayload(r, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'rooms', data.id), data });
  }
  for (const u of state.users) {
    const data = buildAppUserPayload(u, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'appUsers', data.id), data });
    if (includePrivateContacts && u.email) {
      ops.push({
        ref: doc(db, 'workspaces', workspaceId, 'appUsers', data.id, 'private', 'contact'),
        data: {
          appUserId: data.id,
          workspaceId,
          ownerId,
          email: clampStr(u.email, 180, 'user@keystone.com'),
          updatedAt: tNow,
        },
      });
    }
  }
  for (const emp of state.employees) {
    const data = buildEmployeePayload(emp, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'employees', data.id), data });
  }
  for (const rev of state.roomReviews) {
    const data = buildRoomReviewPayload(rev, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'roomReviews', data.id), data });
  }
  for (const task of state.tasks) {
    const data = buildTaskPayload(task, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'tasks', data.id), data });
  }
  for (const vr of state.visualReviews) {
    const data = buildVisualReviewPayload(vr, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'visualReviews', data.id), data });
  }
  for (const wk of state.weaknesses) {
    const data = buildWeaknessPayload(wk, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'weaknesses', data.id), data });
  }
  for (const obs of state.observations) {
    const data = buildObservationPayload(obs, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'observations', data.id), data });
  }
  for (const sum of state.dailySummaries) {
    const data = buildDailySummaryPayload(sum, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'dailySummaries', data.id), data });
  }
  for (const ev of state.evaluations) {
    const data = buildEvaluationPayload(ev, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'evaluations', data.id), data });
  }
  for (const ses of state.trainingSessions) {
    const data = buildTrainingSessionPayload(ses, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'trainingSessions', data.id), data });
  }
  for (const fb of state.supervisorFeedbacks) {
    const data = buildSupervisorFeedbackPayload(fb, workspaceId, ownerId, memberUids, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'supervisorFeedbacks', data.id), data });
  }
  for (const reg of state.pendingRegistrations) {
    const data = buildPendingRegistrationPayload(reg, workspaceId, ownerId, tNow, tNow);
    ops.push({ ref: doc(db, 'workspaces', workspaceId, 'pendingRegistrations', data.id), data });
  }

  await commitBatchedWrites(ops, `workspaces/${workspaceId}/seed`);
}

export async function resetWorkspaceInFirestore(
  ctx: WorkspaceSessionContext,
  freshState: AppState
): Promise<void> {
  const collectionsToClear = [
    'rooms',
    'appUsers',
    'employees',
    'roomReviews',
    'tasks',
    'visualReviews',
    'weaknesses',
    'observations',
    'dailySummaries',
    'evaluations',
    'trainingSessions',
    'supervisorFeedbacks',
    'pendingRegistrations',
  ];

  const deleteOps: ReturnType<typeof doc>[] = [];
  for (const colName of collectionsToClear) {
    const colPath = `workspaces/${ctx.workspaceId}/${colName}`;
    try {
      const q =
        colName === 'pendingRegistrations'
          ? query(collection(db, colPath), where('ownerId', '==', ctx.ownerId))
          : query(collection(db, colPath), where('memberUids', 'array-contains', ctx.uid));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        deleteOps.push(d.ref);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  }

  const CHUNK_SIZE = 350;
  for (let i = 0; i < deleteOps.length; i += CHUNK_SIZE) {
    const chunk = deleteOps.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workspaces/${ctx.workspaceId}/reset`);
    }
  }

  await saveConfigToFirestore(ctx, freshState.config);
  await seedWorkspaceCollections(ctx.workspaceId, ctx.uid, ctx.memberUids, freshState, true);
}

export function subscribeToWorkspace(
  ctx: WorkspaceSessionContext,
  onPatch: (patch: Partial<AppState>) => void
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  // 1. Workspace Config listener
  const wsPath = `workspaces/${ctx.workspaceId}`;
  unsubs.push(
    onSnapshot(
      doc(db, wsPath),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const cfg: AppConfig = {
          appName: String(d.appName || 'Trainer Hub'),
          appSubtitleEs: String(d.appSubtitleEs || ''),
          appSubtitleEn: String(d.appSubtitleEn || ''),
          adminPassword: String(d.adminPassword || 'Keystone2026'),
          trainerALabelEs: String(d.trainerALabelEs || ''),
          trainerALabelEn: String(d.trainerALabelEn || ''),
          trainerAScheduleEs: String(d.trainerAScheduleEs || ''),
          trainerAScheduleEn: String(d.trainerAScheduleEn || ''),
          trainerBLabelEs: String(d.trainerBLabelEs || ''),
          trainerBLabelEn: String(d.trainerBLabelEn || ''),
          trainerBScheduleEs: String(d.trainerBScheduleEs || ''),
          trainerBScheduleEn: String(d.trainerBScheduleEn || ''),
          supervisorLabelEs: String(d.supervisorLabelEs || 'Supervisor'),
          supervisorLabelEn: String(d.supervisorLabelEn || 'Supervisor'),
          adminLabel: String(d.adminLabel || 'Keystone ADMIN'),
          customLabelsEs: (d.customLabelsEs as Record<string, string>) || {},
          customLabelsEn: (d.customLabelsEn as Record<string, string>) || {},
        };
        onPatch({ config: cfg });
      },
      (err) => handleFirestoreError(err, OperationType.GET, wsPath)
    )
  );

  const subMemberQuery = (colName: string) =>
    query(
      collection(db, 'workspaces', ctx.workspaceId, colName),
      where('memberUids', 'array-contains', ctx.uid)
    );

  // 2. Rooms
  unsubs.push(
    onSnapshot(
      subMemberQuery('rooms'),
      (snap) => {
        const rooms: RoomDefinition[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.originalId || data.id),
            name: String(data.name),
            trainer: data.trainer === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            lineType: String(data.lineType || ''),
            standardTaktSeconds: Number(data.standardTaktSeconds) || 0,
            standardHourOutput: Number(data.standardHourOutput) || 0,
            isStickPack: Boolean(data.isStickPack),
          };
        });
        onPatch({ rooms });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/rooms`)
    )
  );

  // 3. App Users
  unsubs.push(
    onSnapshot(
      subMemberQuery('appUsers'),
      (snap) => {
        const users: UserProfile[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            name: String(data.name),
            email: '',
            role: data.role,
            title: String(data.title || ''),
            assignedRooms: Array.isArray(data.assignedRooms) ? (data.assignedRooms as string[]) : [],
            avatar: String(data.avatar || 'TH'),
            status: data.status === 'inactive' ? 'inactive' : 'active',
          };
        });
        onPatch({ users });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/appUsers`)
    )
  );

  // 4. Employees
  unsubs.push(
    onSnapshot(
      subMemberQuery('employees'),
      (snap) => {
        const employees: Employee[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            code: String(data.code),
            name: String(data.name),
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            area: String(data.area),
            room: String(data.room),
            position: data.position,
            status: data.status === 'Inactivo' ? 'Inactivo' : 'Activo',
            shift: data.shift,
            hireDate: String(data.hireDate),
            currentCompetencyLevel: Number(data.currentCompetencyLevel) || 1,
            notes: typeof data.notes === 'string' ? data.notes : undefined,
          };
        });
        onPatch({ employees });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/employees`)
    )
  );

  // 5. Room Reviews
  unsubs.push(
    onSnapshot(
      subMemberQuery('roomReviews'),
      (snap) => {
        const roomReviews: RoomReview[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            roomId: String(data.roomId),
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            trainerName: String(data.trainerName),
            date: String(data.date),
            shift: data.shift,
            checklist: data.checklist,
            completionPercentage: Number(data.completionPercentage) || 0,
            isCustomModified: Boolean(data.isCustomModified),
            notes: typeof data.notes === 'string' ? data.notes : undefined,
            createdAt: toIsoString(data.createdAt, data.createdAtIso as string | undefined),
          };
        });
        onPatch({ roomReviews });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/roomReviews`)
    )
  );

  // 6. Standard Work Tasks
  unsubs.push(
    onSnapshot(
      subMemberQuery('tasks'),
      (snap) => {
        const tasks: WorkStandardTask[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            date: String(data.date),
            startTime: String(data.startTime),
            endTime: String(data.endTime),
            title: String(data.title),
            titleEn: typeof data.titleEn === 'string' ? data.titleEn : undefined,
            description: typeof data.description === 'string' ? data.description : undefined,
            descriptionEn: typeof data.descriptionEn === 'string' ? data.descriptionEn : undefined,
            category: data.category,
            isModifiedSpecific: Boolean(data.isModifiedSpecific),
            customRoomNote: typeof data.customRoomNote === 'string' ? data.customRoomNote : undefined,
            employeesInvolved: Array.isArray(data.employeesInvolved)
              ? (data.employeesInvolved as string[])
              : undefined,
            completed: Boolean(data.completed),
            status: data.status,
            realStartTime: typeof data.realStartTime === 'string' ? data.realStartTime : undefined,
            realEndTime: typeof data.realEndTime === 'string' ? data.realEndTime : undefined,
            comments: typeof data.comments === 'string' ? data.comments : undefined,
            isCreditedSupport: Boolean(data.isCreditedSupport),
            supportReasons: Array.isArray(data.supportReasons) ? data.supportReasons : undefined,
            supportNotes: typeof data.supportNotes === 'string' ? data.supportNotes : undefined,
            evidences: Array.isArray(data.evidences) ? data.evidences : undefined,
          };
        });
        onPatch({ tasks });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/tasks`)
    )
  );

  // 7. Visual Reviews
  unsubs.push(
    onSnapshot(
      subMemberQuery('visualReviews'),
      (snap) => {
        const visualReviews: VisualRoomReview[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            date: String(data.date),
            scopeLabel: String(data.scopeLabel),
            isCustomRoomModified: Boolean(data.isCustomRoomModified),
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            trainerName: String(data.trainerName),
            round: data.round === 'Ronda 2' ? 'Ronda 2' : 'Ronda 1',
            checklist: data.checklist,
            observations: typeof data.observations === 'string' ? data.observations : undefined,
            employeeInvolvedId:
              typeof data.employeeInvolvedId === 'string' ? data.employeeInvolvedId : undefined,
            employeeInvolvedName:
              typeof data.employeeInvolvedName === 'string' ? data.employeeInvolvedName : undefined,
            needToStrengthen:
              typeof data.needToStrengthen === 'string' ? data.needToStrengthen : undefined,
            createdAt: toIsoString(data.createdAt, data.createdAtIso as string | undefined),
          };
        });
        onPatch({ visualReviews });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/visualReviews`)
    )
  );

  // 8. Weaknesses
  unsubs.push(
    onSnapshot(
      subMemberQuery('weaknesses'),
      (snap) => {
        const weaknesses: EmployeeWeakness[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            date: String(data.date),
            roomId: String(data.roomId),
            employeeId: String(data.employeeId),
            employeeName: String(data.employeeName),
            position: data.position,
            weaknessDescription: String(data.weaknessDescription),
            category: data.category,
            status: data.status,
            createdAt: toIsoString(data.createdAt, data.createdAtIso as string | undefined),
          };
        });
        onPatch({ weaknesses });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/weaknesses`)
    )
  );

  // 9. Observations
  unsubs.push(
    onSnapshot(
      subMemberQuery('observations'),
      (snap) => {
        const observations: ImprovementObservation[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            date: String(data.date),
            title: String(data.title),
            description: String(data.description),
            category: data.category,
            employeeId: typeof data.employeeId === 'string' ? data.employeeId : undefined,
            employeeName: typeof data.employeeName === 'string' ? data.employeeName : undefined,
            status: data.status,
            createdAt: toIsoString(data.createdAt, data.createdAtIso as string | undefined),
          };
        });
        onPatch({ observations });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/observations`)
    )
  );

  // 10. Daily Summaries
  unsubs.push(
    onSnapshot(
      subMemberQuery('dailySummaries'),
      (snap) => {
        const dailySummaries: DailySummary[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            date: String(data.date),
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            trainerName: String(data.trainerName),
            completedTasks: Number(data.completedTasks) || 0,
            partialTasks: Number(data.partialTasks) || 0,
            notCompletedTasks: Number(data.notCompletedTasks) || 0,
            pendingTasks: Number(data.pendingTasks) || 0,
            totalTasks: Number(data.totalTasks) || 0,
            compliancePercentage: Number(data.compliancePercentage) || 0,
            supportNotesCount: Number(data.supportNotesCount) || 0,
            evaluatedEmployees: Array.isArray(data.evaluatedEmployees)
              ? (data.evaluatedEmployees as string[])
              : [],
            trainingsConductedCount: Number(data.trainingsConductedCount) || 0,
            weaknessesCount: Number(data.weaknessesCount) || 0,
            improvementActionsCount: Number(data.improvementActionsCount) || 0,
            prioritiesForTomorrow: Array.isArray(data.prioritiesForTomorrow)
              ? (data.prioritiesForTomorrow as string[])
              : [],
            notes: typeof data.notes === 'string' ? data.notes : undefined,
            savedAt: String(data.savedAt || ''),
          };
        });
        onPatch({ dailySummaries });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/dailySummaries`)
    )
  );

  // 11. Monthly Evaluations
  unsubs.push(
    onSnapshot(
      subMemberQuery('evaluations'),
      (snap) => {
        const evaluations: EvaluationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            employeeId: String(data.employeeId),
            employeeName: String(data.employeeName),
            employeePosition: data.employeePosition,
            shift: data.shift,
            room: String(data.room),
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            trainerName: String(data.trainerName),
            evaluationMonth: String(data.evaluationMonth),
            date: String(data.date),
            scores: (data.scores as Record<string, number>) || {},
            sectionPercentages: data.sectionPercentages,
            overallPercentage: Number(data.overallPercentage) || 0,
            status: data.status,
            comments: String(data.comments || ''),
            reinforcementRecommendations: String(data.reinforcementRecommendations || ''),
          };
        });
        onPatch({ evaluations });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/evaluations`)
    )
  );

  // 12. Training Logbook
  unsubs.push(
    onSnapshot(
      subMemberQuery('trainingSessions'),
      (snap) => {
        const trainingSessions: TrainingSession[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            date: String(data.date),
            employeeId: String(data.employeeId),
            employeeName: String(data.employeeName),
            employeePosition: data.employeePosition,
            shift: data.shift,
            trainerId: data.trainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            trainerName: String(data.trainerName),
            competency: String(data.competency),
            room: typeof data.room === 'string' ? data.room : undefined,
            durationMinutes:
              typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined,
            comments: String(data.comments || ''),
          };
        });
        onPatch({ trainingSessions });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/trainingSessions`)
    )
  );

  // 13. Supervisor Feedbacks
  unsubs.push(
    onSnapshot(
      subMemberQuery('supervisorFeedbacks'),
      (snap) => {
        const supervisorFeedbacks: SupervisorFeedback[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            supervisorName: String(data.supervisorName),
            targetTrainerId: data.targetTrainerId === 'trainer_b' ? 'trainer_b' : 'trainer_a',
            date: String(data.date),
            type: data.type,
            title: String(data.title),
            message: String(data.message),
            read: Boolean(data.read),
          };
        });
        onPatch({ supervisorFeedbacks });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/supervisorFeedbacks`)
    )
  );

  // 14. Pending Registrations (strictly owner/bootstrapped admin query)
  const regQuery = query(
    collection(db, 'workspaces', ctx.workspaceId, 'pendingRegistrations'),
    where('ownerId', '==', ctx.ownerId)
  );
  unsubs.push(
    onSnapshot(
      regQuery,
      (snap) => {
        const pendingRegistrations: PendingRegistration[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id),
            name: String(data.name),
            email: String(data.email),
            requestedRole: data.requestedRole,
            department: String(data.department),
            date: String(data.date),
            status: data.status,
          };
        });
        onPatch({ pendingRegistrations });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${wsPath}/pendingRegistrations`)
    )
  );

  return () => {
    for (const u of unsubs) u();
  };
}

// -----------------------------------------------------------------------------
// Granular Mutation Helpers (called on user actions when Firebase is active)
// -----------------------------------------------------------------------------

export async function saveConfigToFirestore(
  ctx: WorkspaceSessionContext,
  config: AppConfig
): Promise<void> {
  const path = `workspaces/${ctx.workspaceId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId);
  try {
    const full = buildWorkspaceConfigPayload(
      config,
      ctx.workspaceId,
      ctx.ownerId,
      ctx.memberUids,
      serverTimestamp(),
      serverTimestamp()
    );
    const { createdAt: _c, ownerId: _o, id: _i, ...updatable } = full;
    await updateDoc(ref, updatable);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function upsertRoomToFirestore(
  ctx: WorkspaceSessionContext,
  room: RoomDefinition
): Promise<void> {
  const docId = normalizeDocId(room.id);
  const path = `workspaces/${ctx.workspaceId}/rooms/${docId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId, 'rooms', docId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        buildRoomPayload(room, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
      );
    } else {
      await updateDoc(
        ref,
        stripUndefined({
          name: clampStr(room.name, 120, docId),
          trainer: room.trainer === 'trainer_b' ? 'trainer_b' : 'trainer_a',
          lineType: clampStr(room.lineType, 100, 'General'),
          standardTaktSeconds: Math.min(10000, Math.max(0, Number(room.standardTaktSeconds) || 0)),
          standardHourOutput: Math.min(1000000, Math.max(0, Number(room.standardHourOutput) || 0)),
          isStickPack: Boolean(room.isStickPack),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteRoomFromFirestore(
  ctx: WorkspaceSessionContext,
  roomId: string
): Promise<void> {
  const docId = normalizeDocId(roomId);
  const path = `workspaces/${ctx.workspaceId}/rooms/${docId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', ctx.workspaceId, 'rooms', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function upsertAppUserToFirestore(
  ctx: WorkspaceSessionContext,
  user: UserProfile
): Promise<void> {
  const docId = normalizeDocId(user.id);
  const path = `workspaces/${ctx.workspaceId}/appUsers/${docId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId, 'appUsers', docId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        buildAppUserPayload(user, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
      );
    } else {
      const payload = buildAppUserPayload(
        user,
        ctx.workspaceId,
        ctx.ownerId,
        ctx.memberUids,
        serverTimestamp(),
        serverTimestamp()
      );
      await updateDoc(ref, {
        name: payload.name,
        role: payload.role,
        title: payload.title,
        assignedRooms: payload.assignedRooms,
        avatar: payload.avatar,
        status: payload.status,
        updatedAt: serverTimestamp(),
      });
    }
    if (user.email && user.email.includes('@')) {
      const privRef = doc(db, 'workspaces', ctx.workspaceId, 'appUsers', docId, 'private', 'contact');
      await setDoc(privRef, {
        appUserId: docId,
        workspaceId: ctx.workspaceId,
        ownerId: ctx.uid,
        email: clampStr(user.email, 180, 'user@keystone.com'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAppUserFromFirestore(
  ctx: WorkspaceSessionContext,
  userId: string
): Promise<void> {
  const docId = normalizeDocId(userId);
  const path = `workspaces/${ctx.workspaceId}/appUsers/${docId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', ctx.workspaceId, 'appUsers', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function upsertEmployeeToFirestore(
  ctx: WorkspaceSessionContext,
  emp: Employee
): Promise<void> {
  const docId = normalizeDocId(emp.id);
  const path = `workspaces/${ctx.workspaceId}/employees/${docId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId, 'employees', docId);
  try {
    const snap = await getDoc(ref);
    const full = buildEmployeePayload(
      emp,
      ctx.workspaceId,
      ctx.uid,
      ctx.memberUids,
      serverTimestamp(),
      serverTimestamp()
    );
    if (!snap.exists()) {
      await setDoc(ref, full);
    } else {
      const { id: _i, workspaceId: _w, ownerId: _o, createdAt: _c, memberUids: _m, ...updatable } = full;
      await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteEmployeeFromFirestore(
  ctx: WorkspaceSessionContext,
  empId: string
): Promise<void> {
  const docId = normalizeDocId(empId);
  const path = `workspaces/${ctx.workspaceId}/employees/${docId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', ctx.workspaceId, 'employees', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function upsertRoomReviewToFirestore(
  ctx: WorkspaceSessionContext,
  review: RoomReview,
  replacedIds: string[] = []
): Promise<void> {
  const docId = normalizeDocId(review.id);
  const path = `workspaces/${ctx.workspaceId}/roomReviews/${docId}`;
  try {
    for (const oldId of replacedIds) {
      await deleteDoc(doc(db, 'workspaces', ctx.workspaceId, 'roomReviews', normalizeDocId(oldId)));
    }
    await setDoc(
      doc(db, 'workspaces', ctx.workspaceId, 'roomReviews', docId),
      buildRoomReviewPayload(review, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function upsertTaskToFirestore(
  ctx: WorkspaceSessionContext,
  task: WorkStandardTask
): Promise<void> {
  const docId = normalizeDocId(task.id);
  const path = `workspaces/${ctx.workspaceId}/tasks/${docId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId, 'tasks', docId);
  try {
    const snap = await getDoc(ref);
    const full = buildTaskPayload(
      task,
      ctx.workspaceId,
      ctx.uid,
      ctx.memberUids,
      serverTimestamp(),
      serverTimestamp()
    );
    if (!snap.exists()) {
      await setDoc(ref, full);
    } else {
      const { id: _i, workspaceId: _w, ownerId: _o, trainerId: _t, date: _d, createdAt: _c, memberUids: _m, ...updatable } = full;
      await updateDoc(ref, { ...updatable, updatedAt: serverTimestamp() });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTaskFromFirestore(
  ctx: WorkspaceSessionContext,
  taskId: string
): Promise<void> {
  const docId = normalizeDocId(taskId);
  const path = `workspaces/${ctx.workspaceId}/tasks/${docId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', ctx.workspaceId, 'tasks', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addVisualReviewToFirestore(
  ctx: WorkspaceSessionContext,
  review: VisualRoomReview
): Promise<void> {
  const docId = normalizeDocId(review.id);
  const path = `workspaces/${ctx.workspaceId}/visualReviews/${docId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', ctx.workspaceId, 'visualReviews', docId),
      buildVisualReviewPayload(review, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function addWeaknessToFirestore(
  ctx: WorkspaceSessionContext,
  weakness: EmployeeWeakness
): Promise<void> {
  const docId = normalizeDocId(weakness.id);
  const path = `workspaces/${ctx.workspaceId}/weaknesses/${docId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', ctx.workspaceId, 'weaknesses', docId),
      buildWeaknessPayload(weakness, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function upsertObservationToFirestore(
  ctx: WorkspaceSessionContext,
  obs: ImprovementObservation
): Promise<void> {
  const docId = normalizeDocId(obs.id);
  const path = `workspaces/${ctx.workspaceId}/observations/${docId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId, 'observations', docId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        buildObservationPayload(obs, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
      );
    } else {
      await updateDoc(ref, {
        status: obs.status,
        description: clampStr(obs.description, 800, '-'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function upsertDailySummaryToFirestore(
  ctx: WorkspaceSessionContext,
  summary: DailySummary,
  replacedIds: string[] = []
): Promise<void> {
  const docId = normalizeDocId(summary.id);
  const path = `workspaces/${ctx.workspaceId}/dailySummaries/${docId}`;
  try {
    for (const oldId of replacedIds) {
      await deleteDoc(doc(db, 'workspaces', ctx.workspaceId, 'dailySummaries', normalizeDocId(oldId)));
    }
    await setDoc(
      doc(db, 'workspaces', ctx.workspaceId, 'dailySummaries', docId),
      buildDailySummaryPayload(summary, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function addEvaluationToFirestore(
  ctx: WorkspaceSessionContext,
  evaluation: EvaluationRecord
): Promise<void> {
  const docId = normalizeDocId(evaluation.id);
  const path = `workspaces/${ctx.workspaceId}/evaluations/${docId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', ctx.workspaceId, 'evaluations', docId),
      buildEvaluationPayload(evaluation, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function addTrainingSessionToFirestore(
  ctx: WorkspaceSessionContext,
  session: TrainingSession
): Promise<void> {
  const docId = normalizeDocId(session.id);
  const path = `workspaces/${ctx.workspaceId}/trainingSessions/${docId}`;
  try {
    await setDoc(
      doc(db, 'workspaces', ctx.workspaceId, 'trainingSessions', docId),
      buildTrainingSessionPayload(session, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function upsertSupervisorFeedbackToFirestore(
  ctx: WorkspaceSessionContext,
  fb: SupervisorFeedback
): Promise<void> {
  const docId = normalizeDocId(fb.id);
  const path = `workspaces/${ctx.workspaceId}/supervisorFeedbacks/${docId}`;
  const ref = doc(db, 'workspaces', ctx.workspaceId, 'supervisorFeedbacks', docId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        buildSupervisorFeedbackPayload(fb, ctx.workspaceId, ctx.uid, ctx.memberUids, serverTimestamp(), serverTimestamp())
      );
    } else {
      await updateDoc(ref, {
        read: Boolean(fb.read),
        supervisorName: clampStr(fb.supervisorName, 120, 'Jonathan de Jesús'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updatePendingRegistrationStatusInFirestore(
  ctx: WorkspaceSessionContext,
  regId: string,
  status: 'aprobado' | 'rechazado'
): Promise<void> {
  const docId = normalizeDocId(regId);
  const path = `workspaces/${ctx.workspaceId}/pendingRegistrations/${docId}`;
  try {
    await updateDoc(doc(db, 'workspaces', ctx.workspaceId, 'pendingRegistrations', docId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function cascadeTrainerNameInFirestore(
  ctx: WorkspaceSessionContext,
  role: 'trainer_a' | 'trainer_b' | 'supervisor',
  newName: string,
  state: AppState
): Promise<void> {
  const safeName = clampStr(newName, 120, 'User');
  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  if (role === 'trainer_a' || role === 'trainer_b') {
    for (const r of state.roomReviews.filter((x) => x.trainerId === role)) {
      ops.push({
        ref: doc(db, 'workspaces', ctx.workspaceId, 'roomReviews', normalizeDocId(r.id)),
        data: { trainerName: safeName, updatedAt: serverTimestamp() },
      });
    }
    for (const e of state.evaluations.filter((x) => x.trainerId === role)) {
      ops.push({
        ref: doc(db, 'workspaces', ctx.workspaceId, 'evaluations', normalizeDocId(e.id)),
        data: { trainerName: safeName, updatedAt: serverTimestamp() },
      });
    }
    for (const s of state.trainingSessions.filter((x) => x.trainerId === role)) {
      ops.push({
        ref: doc(db, 'workspaces', ctx.workspaceId, 'trainingSessions', normalizeDocId(s.id)),
        data: { trainerName: safeName, updatedAt: serverTimestamp() },
      });
    }
    for (const d of state.dailySummaries.filter((x) => x.trainerId === role)) {
      ops.push({
        ref: doc(db, 'workspaces', ctx.workspaceId, 'dailySummaries', normalizeDocId(d.id)),
        data: { trainerName: safeName, updatedAt: serverTimestamp() },
      });
    }
    for (const v of state.visualReviews.filter((x) => x.trainerId === role)) {
      ops.push({
        ref: doc(db, 'workspaces', ctx.workspaceId, 'visualReviews', normalizeDocId(v.id)),
        data: { trainerName: safeName, updatedAt: serverTimestamp() },
      });
    }
  } else if (role === 'supervisor') {
    for (const fb of state.supervisorFeedbacks) {
      ops.push({
        ref: doc(db, 'workspaces', ctx.workspaceId, 'supervisorFeedbacks', normalizeDocId(fb.id)),
        data: { supervisorName: safeName, updatedAt: serverTimestamp() },
      });
    }
  }

  for (let i = 0; i < ops.length; i += 350) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 350)) {
      batch.update(op.ref, op.data);
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `workspaces/${ctx.workspaceId}/cascade`);
    }
  }
}
