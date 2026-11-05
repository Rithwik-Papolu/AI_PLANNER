import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Plus
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function CalendarView({ onOpenTaskModal, onEditTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [selectedDayTasks, setSelectedDayTasks] = useState(null);
  const [selectedDayDateStr, setSelectedDayDateStr] = useState('');

  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => {});
  }, []);

  // Compute days in month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get tasks due on specific date (YYYY-MM-DD)
  const getTasksForDate = (dateStr) => {
    return tasks.filter(t => {
      if (!t.due_at) return false;
      const tDate = new Date(t.due_at).toISOString().slice(0, 10);
      return tDate === dateStr;
    });
  };

  // Generate month grid cells
  const monthCells = [];
  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    monthCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: new Date(year, month - 1, prevMonthDays - i).toISOString().slice(0, 10)
    });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = new Date(year, month, d).toISOString().slice(0, 10);
    monthCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr: dStr
    });
  }
  // Next month leading days to complete grid (42 cells = 6 rows)
  const remaining = 42 - monthCells.length;
  for (let d = 1; d <= remaining; d++) {
    monthCells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: new Date(year, month + 1, d).toISOString().slice(0, 10)
    });
  }

  const handleCellClick = (cell) => {
    const dueTasks = getTasksForDate(cell.dateStr);
    setSelectedDayDateStr(cell.dateStr);
    setSelectedDayTasks(dueTasks);
  };

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-dark-charcoal flex items-center gap-3">
            Academic Calendar & Deadlines
          </h1>
          <p className="text-xs text-muted-brown">
            Interactive multi-view deadline tracking with automated reminder sync
          </p>
        </div>

        {/* View Mode & Add */}
        <div className="flex items-center gap-3">
          <div className="bg-soft-ivory p-1 rounded-xl border border-soft-border flex items-center gap-1 text-xs">
            {['month', 'week', 'day'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-deep-wine to-burgundy text-soft-ivory shadow-sm'
                    : 'text-muted-brown hover:text-dark-charcoal'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenTaskModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold btn-burgundy"
          >
            <Plus size={14} />
            <span>Schedule Task</span>
          </button>
        </div>
      </div>

      {/* Calendar Controls & Month Title */}
      <div className="card-luxury p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl hover:bg-warm-beige text-dark-charcoal transition-all border border-soft-border"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl hover:bg-warm-beige text-dark-charcoal transition-all border border-soft-border"
          >
            <ChevronRight size={16} />
          </button>
          <span className="font-serif text-lg font-bold text-deep-wine ml-2">
            {monthNames[month]} {year}
          </span>
        </div>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-xs font-semibold text-deep-wine hover:underline px-3 py-1.5 rounded-lg bg-warm-beige/60"
        >
          Today
        </button>
      </div>

      {/* Main Calendar View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Month Calendar Grid (3 Cols) */}
        <div className="lg:col-span-3 card-luxury p-5 rounded-3xl space-y-3">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 text-center font-semibold text-xs text-muted-brown uppercase tracking-wider pb-2 border-b border-soft-border/50">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {monthCells.map((cell, index) => {
              const dayTasks = getTasksForDate(cell.dateStr);
              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);
              const isSelected = cell.dateStr === selectedDayDateStr;

              return (
                <div
                  key={index}
                  onClick={() => handleCellClick(cell)}
                  className={`min-h-[5.5rem] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? isSelected
                        ? 'bg-deep-wine/10 border-deep-wine ring-2 ring-deep-wine/30'
                        : isToday
                        ? 'bg-gold-light/20 border-gold shadow-sm'
                        : 'bg-white/60 hover:bg-white border-soft-border/70'
                      : 'bg-warm-beige/20 text-muted-brown/50 border-transparent hover:bg-warm-beige/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                        isToday ? 'bg-burgundy text-white shadow-sm' : 'text-dark-charcoal'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-bold text-burgundy font-mono">
                        {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Micro task tags */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                          t.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'Overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-warm-beige text-deep-wine border border-burgundy/20'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-muted-brown block text-right font-medium">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Side Sheet (1 Col) */}
        <div className="card-luxury p-6 rounded-3xl space-y-4">
          <div className="pb-3 border-b border-soft-border/70">
            <h3 className="font-serif text-lg font-bold text-deep-wine flex items-center gap-2">
              <CalendarIcon size={18} />
              <span>Day Details</span>
            </h3>
            <p className="text-xs text-muted-brown">
              {selectedDayDateStr ? `Events for ${selectedDayDateStr}` : 'Select a date on the calendar'}
            </p>
          </div>

          {!selectedDayDateStr ? (
            <div className="py-12 text-center text-xs text-muted-brown space-y-2">
              <Clock size={20} className="mx-auto text-muted-brown" />
              <p>Click on any date to inspect scheduled milestones and deadlines.</p>
            </div>
          ) : selectedDayTasks?.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-brown space-y-3">
              <CheckCircle2 size={24} className="mx-auto text-emerald-700" />
              <p className="font-medium text-dark-charcoal">No tasks due on this date.</p>
              <button
                onClick={onOpenTaskModal}
                className="text-xs text-deep-wine font-semibold underline underline-offset-4"
              >
                Schedule task for this day
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
              {selectedDayTasks?.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-soft-border hover:border-burgundy/40 transition-all text-xs space-y-1.5 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-dark-charcoal text-sm">{task.title}</span>
                    <span className="text-[10px] font-mono text-deep-wine font-bold">
                      {task.priority_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-brown text-[11px]">
                    <span>{task.category}</span>
                    <span>•</span>
                    <span>{task.estimated_minutes}m</span>
                    <span>•</span>
                    <span className={task.status === 'Completed' ? 'text-emerald-700 font-semibold' : ''}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
