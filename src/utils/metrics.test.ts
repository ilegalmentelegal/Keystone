import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRoomInTrainerScope,
  calculateRoomChecklistPercentage,
  calculateMonthlyEvaluationScore,
  calculateWorkStandardCompliance,
  isEligibleForMonthlyEvaluation,
} from './metrics';
import { MONTHLY_COMPETENCIES } from './i18n';
import { WorkStandardTask } from '../types';

test('isRoomInTrainerScope correctly segments Stick Pack vs Cuartos rooms', () => {
  assert.equal(isRoomInTrainerScope('P09', 'trainer_a'), true);
  assert.equal(isRoomInTrainerScope('P18', 'trainer_a'), true);
  assert.equal(isRoomInTrainerScope('P01', 'trainer_a'), false);

  assert.equal(isRoomInTrainerScope('P01', 'trainer_b'), true);
  assert.equal(isRoomInTrainerScope('Pack Outs', 'trainer_b'), true);
  assert.equal(isRoomInTrainerScope('P10', 'trainer_b'), false);
});

test('calculateRoomChecklistPercentage computes exact 6-item completion percentage', () => {
  assert.equal(
    calculateRoomChecklistPercentage({
      hourByHour: true,
      kpis: true,
      tpms: true,
      fiveS: true,
      startRightEndRight: true,
      taktTime: true,
    }),
    100
  );

  assert.equal(
    calculateRoomChecklistPercentage({
      hourByHour: true,
      kpis: true,
      tpms: true,
      fiveS: false,
      startRightEndRight: false,
      taktTime: false,
    }),
    50
  );

  assert.equal(
    calculateRoomChecklistPercentage({
      hourByHour: false,
      kpis: false,
      tpms: false,
      fiveS: false,
      startRightEndRight: false,
      taktTime: false,
    }),
    0
  );
});

test('MONTHLY_COMPETENCIES contains exact DEACOM (8), Interpersonal (11), Intellectual (12) items', () => {
  const deacom = MONTHLY_COMPETENCIES.filter((c) => c.category === 'deacom');
  const interpersonal = MONTHLY_COMPETENCIES.filter((c) => c.category === 'interpersonal');
  const intellectual = MONTHLY_COMPETENCIES.filter((c) => c.category === 'intellectual');

  assert.equal(deacom.length, 8);
  assert.equal(interpersonal.length, 11);
  assert.equal(intellectual.length, 12);
  assert.equal(MONTHLY_COMPETENCIES.length, 31);
});

test('calculateMonthlyEvaluationScore computes overall and section percentages accurately', () => {
  const scores: Record<string, number> = {};
  for (const c of MONTHLY_COMPETENCIES) {
    if (c.category === 'deacom') scores[c.id] = 4; // 100%
    if (c.category === 'interpersonal') scores[c.id] = 3; // 75%
    if (c.category === 'intellectual') scores[c.id] = 2; // 50%
  }

  const result = calculateMonthlyEvaluationScore(scores);
  assert.equal(result.sectionPercentages.deacom, 100);
  assert.equal(result.sectionPercentages.interpersonal, 75);
  assert.equal(result.sectionPercentages.intellectual, 50);
  // (8*4 + 11*3 + 12*2) = 32 + 33 + 24 = 89 / 124 = 72%
  assert.equal(result.actualTotal, 89);
  assert.equal(result.maxPossible, 124);
  assert.equal(result.overallPercentage, 72);
  assert.equal(result.status, 'En Desarrollo');
});

test('isEligibleForMonthlyEvaluation restricts evaluations to Lider and Segundo', () => {
  assert.equal(isEligibleForMonthlyEvaluation('Líder'), true);
  assert.equal(isEligibleForMonthlyEvaluation('Segundo'), true);
  assert.equal(isEligibleForMonthlyEvaluation('Operador'), false);
});

test('calculateWorkStandardCompliance computes general daily tasks compliance', () => {
  const tasks: WorkStandardTask[] = [
    {
      id: '1',
      trainerId: 'trainer_a',
      date: '2026-11-12',
      startTime: '08:30',
      endTime: '09:00',
      title: 'Prioridades',
      category: 'Documentación y cierre',
      completed: true,
      status: 'Completado',
    },
    {
      id: '2',
      trainerId: 'trainer_a',
      date: '2026-11-12',
      startTime: '09:00',
      endTime: '10:00',
      title: 'Revisión visual 1',
      category: 'Revisión general',
      completed: false,
      status: 'Parcialmente completado',
    },
    {
      id: '3',
      trainerId: 'trainer_a',
      date: '2026-11-12',
      startTime: '10:00',
      endTime: '11:00',
      title: 'Entrenamientos',
      category: 'Entrenamiento',
      completed: false,
      status: 'No completado',
      supportReasons: ['Apoyo en producción'],
      isCreditedSupport: true,
    },
    {
      id: '4',
      trainerId: 'trainer_a',
      date: '2026-11-12',
      startTime: '11:00',
      endTime: '12:00',
      title: 'Evaluación',
      category: 'Evaluación',
      completed: false,
      status: 'Pendiente',
    },
  ];

  const compliance = calculateWorkStandardCompliance(tasks);
  assert.equal(compliance.total, 4);
  assert.equal(compliance.completed, 1);
  assert.equal(compliance.partial, 1);
  assert.equal(compliance.supportCount, 1);
  assert.equal(compliance.pending, 1);
  assert.equal(compliance.percentage, 63);
});
