import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import {
  AppConfig,
  Language,
  RoomDefinition,
  RoomReview,
  RoomReviewChecklist,
  ShiftType,
  UserProfile,
  UserRole,
} from '../types';
import { calculateRoomChecklistPercentage } from '../utils/metrics';
import { formatShiftLabel, getLabel } from '../utils/i18n';

interface RoomReviewsViewProps {
  language: Language;
  config: AppConfig;
  rooms: RoomDefinition[];
  reviews: RoomReview[];
  currentUser: UserProfile;
  currentRole: UserRole;
  onAddReview: (review: Omit<RoomReview, 'id' | 'createdAt'>) => void;
}

const CHECKLIST_ITEMS: {
  key: keyof RoomReviewChecklist;
  labelEs: string;
  labelEn: string;
}[] = [
  { key: 'hourByHour', labelEs: 'Hora x Hora', labelEn: 'Hour by Hour' },
  { key: 'kpis', labelEs: 'KPIs', labelEn: 'KPIs' },
  { key: 'tpms', labelEs: 'TPMs', labelEn: 'TPMs' },
  { key: 'fiveS', labelEs: '5S', labelEn: '5S' },
  { key: 'startRightEndRight', labelEs: 'Start Right / End Right', labelEn: 'Start Right / End Right' },
  { key: 'taktTime', labelEs: 'Takt Time', labelEn: 'Takt Time' },
];

export const RoomReviewsView: React.FC<RoomReviewsViewProps> = ({
  language,
  config,
  rooms,
  reviews,
  currentUser,
  currentRole,
  onAddReview,
}) => {
  const isEn = language === 'en';
  const isSupervisor = currentRole === 'supervisor';
  const effectiveTrainer = currentRole === 'trainer_b' ? 'trainer_b' : 'trainer_a';

  const scopedRooms =
    currentRole === 'supervisor' || currentRole === 'admin'
      ? rooms
      : rooms.filter((r) => r.trainer === effectiveTrainer);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(scopedRooms[0]?.id || rooms[0]?.id || 'P09');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [reviewDate, setReviewDate] = useState('2026-11-12');
  const [reviewShift, setReviewShift] = useState<ShiftType>(
    effectiveTrainer === 'trainer_a' ? 'Shift A (Mon-Wed)' : 'Mon-Thu'
  );
  const [checklist, setChecklist] = useState<RoomReviewChecklist>({
    hourByHour: true,
    kpis: true,
    tpms: true,
    fiveS: true,
    startRightEndRight: true,
    taktTime: true,
  });
  const [notes, setNotes] = useState('');

  const selectedRoom =
    rooms.find((r) => r.id === selectedRoomId) || scopedRooms[0] || rooms[0];
  const roomReviewsHistory = reviews.filter((r) => r.roomId === selectedRoom?.id);
  const latestReview = roomReviewsHistory[0];

  const handleOpenReview = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    const trainerForRoom = room?.trainer || effectiveTrainer;
    setSelectedRoomId(roomId);
    setReviewShift(trainerForRoom === 'trainer_a' ? 'Shift A (Mon-Wed)' : 'Mon-Thu');

    const existing = reviews.find((r) => r.roomId === roomId);
    if (existing) {
      setChecklist({ ...existing.checklist });
      setNotes(existing.notes || '');
    } else {
      setChecklist({
        hourByHour: false,
        kpis: false,
        tpms: false,
        fiveS: false,
        startRightEndRight: false,
        taktTime: false,
      });
      setNotes('');
    }
    setIsReviewModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const completionPercentage = calculateRoomChecklistPercentage(checklist);
    onAddReview({
      roomId: selectedRoom.id,
      trainerId: selectedRoom.trainer,
      trainerName: currentUser.name,
      date: reviewDate,
      shift: reviewShift,
      checklist,
      completionPercentage,
      notes: notes.trim() || undefined,
    });
    setIsReviewModalOpen(false);
  };

  const handleQuickToggleItem = (itemKey: keyof RoomReviewChecklist) => {
    if (isSupervisor || !selectedRoom) return;
    const baseChecklist: RoomReviewChecklist = latestReview
      ? { ...latestReview.checklist }
      : {
          hourByHour: false,
          kpis: false,
          tpms: false,
          fiveS: false,
          startRightEndRight: false,
          taktTime: false,
        };
    const nextChecklist = {
      ...baseChecklist,
      [itemKey]: !baseChecklist[itemKey],
    };
    onAddReview({
      roomId: selectedRoom.id,
      trainerId: selectedRoom.trainer,
      trainerName: currentUser.name,
      date: latestReview?.date || reviewDate,
      shift:
        latestReview?.shift ||
        (selectedRoom.trainer === 'trainer_a' ? 'Shift A (Mon-Wed)' : 'Mon-Thu'),
      checklist: nextChecklist,
      completionPercentage: calculateRoomChecklistPercentage(nextChecklist),
      notes: latestReview?.notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {getLabel('room_reviews_title', language, config)}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Completion checkboxes only (Filled / Not Filled): Hour by Hour, KPIs, TPMs, 5S, Start Right / End Right, Takt Time.'
                : 'Casillas de completado (Sí lo llenó / No lo llenó): Hora x Hora, KPIs, TPMs, 5S, Start Right / End Right y Takt Time.'}
            </p>
          </div>

          {!isSupervisor && selectedRoom && (
            <button
              onClick={() => handleOpenReview(selectedRoom.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isEn ? `Review ${selectedRoom.id}` : `Revisar Cuarto ${selectedRoom.id}`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Room List + Active Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Scoped Rooms */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {isEn ? 'Assigned Rooms' : 'Cuartos Asignados'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {scopedRooms.length} {isEn ? 'rooms' : 'cuartos'}
            </span>
          </div>

          <div className="mt-3 space-y-1.5 max-h-[600px] overflow-y-auto">
            {scopedRooms.map((room) => {
              const rev = reviews.find((r) => r.roomId === room.id);
              const isSelected = selectedRoom?.id === room.id;
              const pct = rev ? rev.completionPercentage : 0;

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {room.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        pct === 100
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : rev
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {rev ? `${pct}%` : isEn ? 'Pending' : 'Pend.'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-1">
                    {room.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {rev
                      ? `${Math.round((pct / 100) * 6)}/6 ${isEn ? 'filled' : 'llenados'}`
                      : isEn
                      ? 'Not reviewed yet'
                      : 'Sin revisar hoy'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: 6 Checkboxes + History */}
        <div className="lg:col-span-3 space-y-6">
          {selectedRoom && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedRoom.name}
                    </h2>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {selectedRoom.lineType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {latestReview
                      ? `${isEn ? 'Last reviewed' : 'Última revisión'}: ${latestReview.date} · ${formatShiftLabel(latestReview.shift, language)} · ${latestReview.trainerName}`
                      : isEn
                      ? 'No review recorded yet for this room.'
                      : 'Aún no hay revisión registrada para este cuarto.'}
                  </p>
                </div>

                {!isSupervisor && (
                  <button
                    onClick={() => handleOpenReview(selectedRoom.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
                  >
                    {isEn ? 'New Review' : 'Nueva Revisión'}
                  </button>
                )}
              </div>

              {/* 6 Checkboxes Grid */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = latestReview ? latestReview.checklist[item.key] : false;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={isSupervisor}
                      onClick={() => handleQuickToggleItem(item.key)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                        checked
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                      } ${!isSupervisor ? 'hover:border-blue-400 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {isEn ? item.labelEn : item.labelEs}
                        </div>
                        <div
                          className={`text-[11px] font-semibold mt-0.5 ${
                            checked
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {checked
                            ? isEn
                              ? 'Filled / Completed'
                              : 'Sí lo llenó'
                            : isEn
                            ? 'Not Filled'
                            : 'No lo llenó'}
                        </div>
                      </div>
                      {checked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 dark:text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {latestReview?.notes && (
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-800 dark:text-slate-100">
                    {isEn ? 'Notes: ' : 'Notas: '}
                  </strong>
                  {latestReview.notes}
                </div>
              )}
            </div>
          )}

          {/* Review History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {isEn
                  ? `Review History — ${selectedRoom?.id}`
                  : `Historial de Revisiones — ${selectedRoom?.id}`}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {roomReviewsHistory.length}
              </span>
            </div>

            {roomReviewsHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isEn ? 'No reviews recorded yet.' : 'Sin revisiones registradas.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {roomReviewsHistory.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {rev.date}
                        </span>
                        <span className="text-slate-400">
                          · {formatShiftLabel(rev.shift, language)}
                        </span>
                        <span className="text-slate-500">· {rev.trainerName}</span>
                      </div>
                      {rev.notes && (
                        <div className="mt-1 text-slate-600 dark:text-slate-400">{rev.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] ${
                          rev.completionPercentage === 100
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {Math.round((rev.completionPercentage / 100) * 6)}/6 ({rev.completionPercentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Room Review Checkboxes */}
      {isReviewModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Room Review' : 'Revisión de Cuarto'}: {selectedRoom.name}
                </h3>
                <span className="text-xs text-slate-500">
                  {isEn
                    ? 'Check what was filled out and leave unchecked what was not.'
                    : 'Marca las casillas de lo que sí se llenó y deja sin marcar lo que no.'}
                </span>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Review Date' : 'Fecha de Revisión'}
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Shift' : 'Turno'}
                  </label>
                  <select
                    value={reviewShift}
                    onChange={(e) => setReviewShift(e.target.value as ShiftType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {selectedRoom.trainer === 'trainer_a' ? (
                      <>
                        <option value="Shift A (Mon-Wed)">{formatShiftLabel('Shift A (Mon-Wed)', language)}</option>
                        <option value="Shift B (Thu-Sat)">{formatShiftLabel('Shift B (Thu-Sat)', language)}</option>
                      </>
                    ) : (
                      <option value="Mon-Thu">{formatShiftLabel('Mon-Thu', language)}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* 6 Checkboxes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{isEn ? 'Completion Checklist' : 'Casillas de Completado'}</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {calculateRoomChecklistPercentage(checklist)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CHECKLIST_ITEMS.map((item) => {
                    const checked = checklist[item.key];
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setChecklist({ ...checklist, [item.key]: e.target.checked })
                            }
                            className="w-4 h-4 rounded text-emerald-600"
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {isEn ? item.labelEn : item.labelEs}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold">
                          {checked
                            ? isEn
                              ? 'Yes'
                              : 'Sí'
                            : isEn
                            ? 'No'
                            : 'No'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'General Notes (Optional)' : 'Observaciones Generales (Opcional)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEn ? 'Optional comments...' : 'Comentarios opcionales...'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 rounded-lg"
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isEn ? 'Save Review' : 'Guardar Revisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
