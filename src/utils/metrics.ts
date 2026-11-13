import {
  EmployeePosition,
  RoomDefinition,
  RoomReviewChecklist,
  WorkStandardTask,
} from '../types';
import { MONTHLY_COMPETENCIES } from './i18n';

export const TRAINER_A_ROOMS = ['P09', 'P10', 'P11', 'P12', 'P13', 'P18'];
export const TRAINER_B_ROOMS = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P16', 'Pack Outs'];

export const ALL_ROOMS = [
  ...TRAINER_B_ROOMS.slice(0, 7),
  ...TRAINER_A_ROOMS,
  TRAINER_B_ROOMS[7],
  'Pack Outs',
];

export function getTrainerRooms(
  trainerId: 'trainer_a' | 'trainer_b',
  rooms?: RoomDefinition[]
): string[] {
  if (rooms && rooms.length > 0) {
    return rooms.filter((r) => r.trainer === trainerId).map((r) => r.id);
  }
  return trainerId === 'trainer_a' ? TRAINER_A_ROOMS : TRAINER_B_ROOMS;
}

export function isRoomInTrainerScope(
  roomId: string,
  trainerId: 'trainer_a' | 'trainer_b',
  rooms?: RoomDefinition[]
): boolean {
  return getTrainerRooms(trainerId, rooms).includes(roomId);
}

export function calculateRoomChecklistPercentage(checklist: RoomReviewChecklist): number {
  const values = [
    checklist.hourByHour,
    checklist.kpis,
    checklist.tpms,
    checklist.fiveS,
    checklist.startRightEndRight,
    checklist.taktTime,
  ];
  const passed = values.filter(Boolean).length;
  return Math.round((passed / 6) * 100);
}

export function calculateMonthlyEvaluationScore(
  scores: Record<string, number>
): {
  overallPercentage: number;
  sectionPercentages: {
    deacom: number;
    interpersonal: number;
    intellectual: number;
  };
  status: 'Competente' | 'En Desarrollo' | 'Requiere Refuerzo';
  maxPossible: number;
  actualTotal: number;
  evaluatedCount: number;
  totalCompetencies: number;
} {
  const categories = ['deacom', 'interpersonal', 'intellectual'] as const;
  const sectionTotals: Record<string, { actual: number; max: number }> = {
    deacom: { actual: 0, max: 0 },
    interpersonal: { actual: 0, max: 0 },
    intellectual: { actual: 0, max: 0 },
  };

  let actualTotal = 0;
  let evaluatedCount = 0;
  const totalCompetencies = MONTHLY_COMPETENCIES.length;
  const maxPossible = totalCompetencies * 4;

  for (const comp of MONTHLY_COMPETENCIES) {
    sectionTotals[comp.category].max += 4;
    const val = scores[comp.id];
    if (typeof val === 'number' && val > 0) {
      const clamped = Math.min(4, Math.max(1, val));
      actualTotal += clamped;
      sectionTotals[comp.category].actual += clamped;
      evaluatedCount++;
    }
  }

  const sectionPercentages = {
    deacom: sectionTotals.deacom.max
      ? Math.round((sectionTotals.deacom.actual / sectionTotals.deacom.max) * 100)
      : 0,
    interpersonal: sectionTotals.interpersonal.max
      ? Math.round((sectionTotals.interpersonal.actual / sectionTotals.interpersonal.max) * 100)
      : 0,
    intellectual: sectionTotals.intellectual.max
      ? Math.round((sectionTotals.intellectual.actual / sectionTotals.intellectual.max) * 100)
      : 0,
  };

  const overallPercentage = maxPossible > 0 ? Math.round((actualTotal / maxPossible) * 100) : 0;

  let status: 'Competente' | 'En Desarrollo' | 'Requiere Refuerzo' = 'En Desarrollo';
  if (overallPercentage >= 85) {
    status = 'Competente';
  } else if (overallPercentage < 70) {
    status = 'Requiere Refuerzo';
  }

  return {
    overallPercentage,
    sectionPercentages,
    status,
    maxPossible,
    actualTotal,
    evaluatedCount,
    totalCompetencies,
  };
}

export function isEligibleForMonthlyEvaluation(position: EmployeePosition): boolean {
  return position === 'Líder' || position === 'Segundo';
}

export function calculateWorkStandardCompliance(tasks: WorkStandardTask[]): {
  total: number;
  completed: number;
  partial: number;
  supportCount: number;
  pending: number;
  percentage: number;
} {
  const total = tasks.length;
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      partial: 0,
      supportCount: 0,
      pending: 0,
      percentage: 100,
    };
  }

  let completed = 0;
  let partial = 0;
  let supportCount = 0;
  let pending = 0;

  for (const t of tasks) {
    const hasSupport =
      t.isCreditedSupport ||
      (t.supportReasons && t.supportReasons.length > 0);

    if (t.status === 'Completado' || (t.completed && !t.status)) {
      completed++;
    } else if (t.status === 'Parcialmente completado') {
      partial++;
    } else if (hasSupport) {
      supportCount++;
    } else {
      pending++;
    }
  }

  const effectivePoints = completed + partial * 0.5 + supportCount;
  const percentage = Math.min(100, Math.round((effectivePoints / total) * 100));

  return {
    total,
    completed,
    partial,
    supportCount,
    pending,
    percentage,
  };
}

export function categorizeWeakness(
  description: string
):
  | 'Setup de máquina'
  | 'Uso de DEACOM'
  | 'Inspección de producto'
  | '5S y limpieza'
  | 'GMP y seguridad'
  | 'Liderazgo y HxH' {
  const d = description.toLowerCase();
  if (d.includes('setup') || d.includes('ajuste') || d.includes('mordaza') || d.includes('máquina'))
    return 'Setup de máquina';
  if (d.includes('deacom') || d.includes('lote') || d.includes('scrap') || d.includes('real time'))
    return 'Uso de DEACOM';
  if (d.includes('inspección') || d.includes('fuga') || d.includes('defecto') || d.includes('stick'))
    return 'Inspección de producto';
  if (d.includes('5s') || d.includes('limpieza') || d.includes('orden')) return '5S y limpieza';
  if (d.includes('líder') || d.includes('hxh') || d.includes('prioridad') || d.includes('personal'))
    return 'Liderazgo y HxH';
  return 'GMP y seguridad';
}
