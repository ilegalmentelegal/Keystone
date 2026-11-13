import React, { useState } from 'react';
import {
  Lightbulb,
  Plus,
  X,
  Filter,
} from 'lucide-react';
import { Employee, ImprovementObservation, Language } from '../../types';

interface ImprovementNotesSectionProps {
  language: Language;
  observations: ImprovementObservation[];
  employees: Employee[];
  onAddObservation: (obs: Omit<ImprovementObservation, 'id' | 'createdAt'>) => void;
  onUpdateObservationStatus: (
    id: string,
    status: 'Pendiente' | 'En proceso' | 'Resuelto'
  ) => void;
}

export const ImprovementNotesSection: React.FC<ImprovementNotesSectionProps> = ({
  language,
  observations,
  employees,
  onAddObservation,
  onUpdateObservationStatus,
}) => {
  const isEn = language === 'en';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ImprovementObservation['category']>('Liderazgo');
  const [employeeId, setEmployeeId] = useState('');

  const selectedEmployeeObj = employees.find((e) => e.id === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onAddObservation({
      date: '2026-11-12',
      title: title.trim(),
      description: description.trim(),
      category,
      employeeId: employeeId || undefined,
      employeeName: selectedEmployeeObj?.name || undefined,
      status: 'Pendiente',
    });

    setTitle('');
    setDescription('');
    setEmployeeId('');
    setIsModalOpen(false);
  };

  const filtered = observations.filter((o) => {
    if (filterCategory !== 'all' && o.category !== filterCategory) return false;
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Improvement Opportunities & Observations' : 'Oportunidades de Mejora y Observaciones'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Log general observations during the shift and track their resolution.'
              : 'Registra observaciones generales de la jornada y da seguimiento a su resolución.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? 'Add Observation' : 'Agregar Observación'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="all">{isEn ? 'All categories' : 'Todas las categorías'}</option>
          <option value="Liderazgo">{isEn ? 'Leadership' : 'Liderazgo'}</option>
          <option value="DEACOM">DEACOM</option>
          <option value="Calidad / Defectos">{isEn ? 'Quality / Defects' : 'Calidad / Defectos'}</option>
          <option value="5S / Limpieza">{isEn ? '5S / Cleanliness' : '5S / Limpieza'}</option>
          <option value="Setup / Máquina">{isEn ? 'Setup / Machine' : 'Setup / Máquina'}</option>
          <option value="Procedimientos">{isEn ? 'Procedures' : 'Procedimientos'}</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="all">{isEn ? 'All statuses' : 'Todos los estados'}</option>
          <option value="Pendiente">{isEn ? 'Pending' : 'Pendiente'}</option>
          <option value="En proceso">{isEn ? 'In progress' : 'En proceso'}</option>
          <option value="Resuelto">{isEn ? 'Resolved' : 'Resuelto'}</option>
        </select>

        <span className="text-[11px] text-slate-400 ml-auto">
          {filtered.length} {isEn ? 'records' : 'registros'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((obs) => (
          <div
            key={obs.id}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {obs.category}
                </span>

                <select
                  value={obs.status}
                  onChange={(e) =>
                    onUpdateObservationStatus(
                      obs.id,
                      e.target.value as 'Pendiente' | 'En proceso' | 'Resuelto'
                    )
                  }
                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer border ${
                    obs.status === 'Resuelto'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                      : obs.status === 'En proceso'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                  }`}
                >
                  <option value="Pendiente">{isEn ? 'Pending' : 'Pendiente'}</option>
                  <option value="En proceso">{isEn ? 'In progress' : 'En proceso'}</option>
                  <option value="Resuelto">{isEn ? 'Resolved' : 'Resuelto'}</option>
                </select>
              </div>

              <h4 className="mt-2 font-bold text-slate-900 dark:text-white leading-tight">
                {obs.title}
              </h4>
              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                {obs.description}
              </p>

              {obs.employeeName && (
                <div className="mt-2 text-[11px] text-slate-500 font-medium">
                  {isEn ? 'Employee:' : 'Empleado:'} {obs.employeeName}
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <span className="font-mono text-slate-400 text-[10px]">{obs.date}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Add Improvement Observation' : 'Registrar Oportunidad de Mejora'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Title *' : 'Título *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Category' : 'Categoría'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ImprovementObservation['category'])
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Liderazgo">{isEn ? 'Leadership' : 'Liderazgo'}</option>
                    <option value="DEACOM">DEACOM</option>
                    <option value="Calidad / Defectos">{isEn ? 'Quality / Defects' : 'Calidad / Defectos'}</option>
                    <option value="5S / Limpieza">{isEn ? '5S / Cleanliness' : '5S / Limpieza'}</option>
                    <option value="Setup / Máquina">{isEn ? 'Setup / Machine' : 'Setup / Máquina'}</option>
                    <option value="Procedimientos">{isEn ? 'Procedures' : 'Procedimientos'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Employee (Optional)' : 'Empleado (Opcional)'}
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">{isEn ? 'General' : 'General'}</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Description *' : 'Descripción *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Save Observation' : 'Guardar Observación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
