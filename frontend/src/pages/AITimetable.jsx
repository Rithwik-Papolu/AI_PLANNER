import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Sparkles,
  Coffee,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Clock,
  Layers,
  Calendar,
  Check
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function AITimetable() {
  const [timetable, setTimetable] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [planningStyle, setPlanningStyle] = useState('balanced');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('Task duration overrun');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    fetchTimetable(selectedDate);
  }, [selectedDate]);

  const fetchTimetable = async (date) => {
    setLoading(true);
    try {
      const data = await api.getTimetable(date);
      setTimetable(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generateTimetable({
        target_date: selectedDate,
        planning_style: planningStyle,
        force_regenerate: true
      });
      setTimetable(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAdaptiveReschedule = async () => {
    setRescheduling(true);
    try {
      const res = await api.reschedule({
        target_date: selectedDate,
        reason: rescheduleReason
      });
      setTimetable(res.updated_timetable);
      setShowRescheduleModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRescheduling(false);
    }
  };

  const handleToggleBlockStatus = async (blockIndex) => {
    if (!timetable) return;
    const newSchedule = [...timetable.schedule];
    const curr = newSchedule[blockIndex];
    curr.status = curr.status === 'completed' ? 'scheduled' : 'completed';

    try {
      const updated = await api.updateTimetable(timetable.id, {
        schedule: newSchedule,
        explanation: timetable.explanation
      });
      setTimetable(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-6xl mx-auto w-full">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-dark-charcoal flex items-center gap-3">
            AI Daily Timetable
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-burgundy/15 text-burgundy font-mono font-bold border border-burgundy/30">
              Greedy Interval Optimization
            </span>
          </h1>
          <p className="text-xs text-muted-brown">
            Constraint-satisfaction scheduling with break allocations and adaptive drift rescheduling
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-soft-ivory border border-soft-border text-xs text-dark-charcoal outline-none font-medium"
          />

          <select
            value={planningStyle}
            onChange={(e) => setPlanningStyle(e.target.value)}
            className="px-3 py-2 rounded-xl bg-soft-ivory border border-soft-border text-xs text-dark-charcoal outline-none font-medium"
          >
            <option value="balanced">Balanced Mode</option>
            <option value="deep_work">Deep Work (120m)</option>
            <option value="frequent_breaks">Frequent Breaks</option>
          </select>

          <button
            onClick={() => setShowRescheduleModal(true)}
            disabled={!timetable}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-soft-ivory hover:bg-warm-beige text-deep-wine border border-burgundy/30 shadow-sm transition-all disabled:opacity-50"
            title="Adapt schedule to delays"
          >
            <RotateCcw size={14} />
            <span>Adaptive Reschedule</span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-burgundy"
          >
            <Sparkles size={14} className={generating ? 'animate-spin text-gold-light' : 'text-gold-light'} />
            <span>{generating ? 'Generating Schedule...' : 'Generate Timetable'}</span>
          </button>
        </div>
      </div>

      {/* Rationale & Efficiency Summary */}
      {timetable && (
        <div className="bg-gradient-to-r from-deep-maroon via-deep-wine to-burgundy text-soft-ivory p-6 rounded-3xl shadow-luxury border border-gold/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span className="font-serif text-lg font-bold text-soft-ivory flex items-center gap-2">
              <CalendarClock size={20} className="text-gold-light" />
              {timetable.title}
            </span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span>Total Focus Time: <strong>{timetable.total_planned_minutes}m</strong></span>
              <span>Schedule Efficiency: <strong className="text-gold-light">{timetable.efficiency_score}%</strong></span>
            </div>
          </div>

          <p className="text-xs text-soft-ivory/85 leading-relaxed">
            💡 {timetable.explanation}
          </p>
        </div>
      )}

      {/* Scheduled Timeline Blocks */}
      {loading ? (
        <div className="py-16 text-center text-muted-brown">
          <GlossyIcon icon={Sparkles} variant="gold" size={24} containerSize="w-12 h-12" className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Evaluating constraints and scheduling tasks...</p>
        </div>
      ) : !timetable || timetable.schedule.length === 0 ? (
        <div className="card-luxury p-12 text-center text-muted-brown rounded-3xl space-y-3">
          <GlossyIcon icon={CalendarClock} variant="cream" size={28} containerSize="w-14 h-14" className="mx-auto" />
          <h3 className="font-serif text-lg font-bold text-dark-charcoal">No Timetable for {selectedDate}</h3>
          <p className="text-xs max-w-md mx-auto">
            Click "Generate Timetable" to intelligently assemble your day's schedule respecting your working hours, priority scores, and rest intervals.
          </p>
          <button onClick={handleGenerate} className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-burgundy inline-flex items-center gap-2">
            <Sparkles size={14} className="text-gold-light" />
            <span>Generate Today's Timetable</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative pl-6 sm:pl-8 space-y-3 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-burgundy/20">
            {timetable.schedule.map((block, idx) => {
              const isTask = block.block_type === 'task';
              const isLunch = block.block_type === 'lunch';
              const isBreak = block.block_type === 'break';
              const isCompleted = block.status === 'completed';

              return (
                <div
                  key={idx}
                  className={`card-luxury p-4 rounded-2xl flex items-center justify-between gap-4 transition-all relative ${
                    isLunch
                      ? 'bg-amber-50/60 border-amber-200'
                      : isBreak
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : isCompleted
                      ? 'bg-warm-beige/30 opacity-70'
                      : 'hover:border-burgundy/40'
                  }`}
                >
                  {/* Timeline indicator node */}
                  <span
                    className={`absolute -left-[1.85rem] sm:-left-[2.35rem] w-4 h-4 rounded-full border-2 bg-soft-ivory flex items-center justify-center ${
                      isLunch
                        ? 'border-amber-600'
                        : isBreak
                        ? 'border-emerald-600'
                        : isCompleted
                        ? 'border-emerald-700 bg-emerald-700'
                        : 'border-burgundy'
                    }`}
                  />

                  {/* Left: Time and Title */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-warm-beige/80 border border-soft-border/70 flex items-center justify-center shrink-0">
                      {isLunch ? (
                        <Utensils size={18} className="text-amber-700" />
                      ) : isBreak ? (
                        <Coffee size={18} className="text-emerald-700" />
                      ) : (
                        <CalendarClock size={18} className="text-deep-wine" />
                      )}
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-burgundy">
                          {block.start_time} - {block.end_time}
                        </span>
                        <span className="text-[10px] text-muted-brown">({block.duration_minutes}m)</span>
                      </div>
                      <h4
                        className={`text-sm font-semibold text-dark-charcoal truncate ${
                          isCompleted ? 'line-through text-muted-brown' : ''
                        }`}
                      >
                        {block.title}
                      </h4>
                      {block.notes && (
                        <p className="text-[11px] text-muted-brown truncate">{block.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions and Score */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isTask && block.priority_score !== null && (
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-deep-wine block">
                          {block.priority_score?.toFixed(1)}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-muted-brown block">
                          Priority
                        </span>
                      </div>
                    )}

                    {isTask && (
                      <button
                        onClick={() => handleToggleBlockStatus(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1 ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-soft-ivory hover:bg-warm-beige text-dark-charcoal border-soft-border'
                        }`}
                      >
                        <Check size={13} />
                        <span>{isCompleted ? 'Finished' : 'Mark Done'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unscheduled Tasks Section */}
          {timetable.unscheduled_tasks?.length > 0 && (
            <div className="card-luxury p-5 rounded-2xl border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle size={16} className="text-amber-700" />
                <h4 className="font-serif font-bold text-sm">
                  Deferred Tasks ({timetable.unscheduled_tasks.length})
                </h4>
              </div>
              <p className="text-xs text-amber-800/80">
                These tasks could not fit into today's working window without violating your end-of-day boundary. They are safely deferred to your next working session to prevent cognitive burnout.
              </p>
              <div className="space-y-1.5">
                {timetable.unscheduled_tasks.map((task, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-soft-ivory border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-dark-charcoal">{task.title}</span>
                    <span className="text-muted-brown font-mono">{task.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adaptive Reschedule Dialog */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-soft-ivory border border-soft-border rounded-3xl shadow-luxury-lg w-full max-w-md p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-deep-wine">Adaptive Reschedule</h3>
            <p className="text-xs text-muted-brown">
              When circumstances change, the scheduler shifts remaining pending blocks to accommodate delays while preserving completed milestones.
            </p>

            <div>
              <label className="block text-xs font-semibold text-dark-charcoal mb-1">
                Select Rescheduling Trigger:
              </label>
              <select
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-warm-beige/40 border border-soft-border text-xs text-dark-charcoal outline-none"
              >
                <option value="Task took longer than planned">Task took longer than planned</option>
                <option value="Urgent unscheduled assignment arrived">Urgent unscheduled assignment arrived</option>
                <option value="Interrupted / Emergency meeting">Interrupted / Emergency meeting</option>
                <option value="Fatigue break adjustment">Fatigue break adjustment</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-brown hover:text-dark-charcoal"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduling}
                onClick={handleAdaptiveReschedule}
                className="px-5 py-2 rounded-xl text-xs font-semibold btn-burgundy flex items-center gap-1.5"
              >
                <RotateCcw size={13} className={rescheduling ? 'animate-spin' : ''} />
                <span>{rescheduling ? 'Repairing Schedule...' : 'Confirm Reschedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
