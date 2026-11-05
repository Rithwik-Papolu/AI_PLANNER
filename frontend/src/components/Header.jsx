import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  X,
  Volume2
} from 'lucide-react';
import GlossyIcon from './GlossyIcon';
import { api } from '../api/client';

export default function Header({ onOpenTaskModal, onOpenAIIntakeModal }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [userPrefs, setUserPrefs] = useState({ user_name: 'Rithwik', timezone: 'Asia/Kolkata' });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch reminders and user profile
  useEffect(() => {
    fetchReminders();
    api.getPreferences()
      .then(setUserPrefs)
      .catch(() => {});
  }, []);

  const fetchReminders = () => {
    api.getReminders()
      .then(setReminders)
      .catch(() => {});
  };

  const handleDismissReminder = async (id, e) => {
    e.stopPropagation();
    try {
      await api.dismissReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const pendingReminders = reminders.filter(r => !r.is_sent);

  return (
    <header className="h-20 bg-light-cream/90 backdrop-blur-md border-b border-soft-border/80 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
      {/* Date & Time Widget */}
      <div className="flex items-center gap-3">
        <GlossyIcon icon={Clock} variant="cream" size={18} containerSize="w-9 h-9" />
        <div>
          <div className="text-sm font-semibold text-dark-charcoal tracking-wide flex items-center gap-2">
            <span>{formattedTime}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-warm-beige text-muted-brown font-mono font-normal">
              {userPrefs.timezone || 'Asia/Kolkata'}
            </span>
          </div>
          <div className="text-xs text-muted-brown flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Quick Add Manual Task */}
        <button
          onClick={onOpenTaskModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-soft-ivory hover:bg-warm-beige text-deep-wine border border-burgundy/30 shadow-sm hover:shadow transition-all"
        >
          <Plus size={15} />
          <span>New Task</span>
        </button>

        {/* AI Natural Language Intake */}
        <button
          onClick={onOpenAIIntakeModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-burgundy"
        >
          <Sparkles size={15} className="text-gold-light" />
          <span>AI Natural Intake</span>
        </button>

        {/* Notifications & Reminders Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsReminderOpen(!isReminderOpen)}
            className="relative p-2.5 rounded-xl bg-soft-ivory hover:bg-warm-beige border border-soft-border text-dark-charcoal transition-all shadow-sm"
            title="Notifications & Reminders"
          >
            <Bell size={18} className="text-deep-wine" />
            {pendingReminders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-burgundy text-white text-[10px] font-bold flex items-center justify-center border-2 border-light-cream shadow-sm">
                {pendingReminders.length}
              </span>
            )}
          </button>

          {/* Reminder Popup */}
          {isReminderOpen && (
            <div className="absolute right-0 mt-3 w-84 bg-soft-ivory border border-soft-border rounded-2xl shadow-luxury-lg py-3 px-4 z-50 text-left">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-soft-border/60">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-burgundy" />
                  <span className="font-serif font-bold text-sm text-deep-wine">Active Reminders</span>
                </div>
                <button
                  onClick={() => setIsReminderOpen(false)}
                  className="p-1 rounded-full text-muted-brown hover:text-dark-charcoal hover:bg-warm-beige"
                >
                  <X size={14} />
                </button>
              </div>

              {pendingReminders.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-brown">
                  No pending reminders. All clear!
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {pendingReminders.map(rem => (
                    <div
                      key={rem.id}
                      className="p-2.5 rounded-xl bg-warm-beige/50 border border-soft-border/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="font-semibold text-deep-wine flex items-center gap-1.5">
                          {rem.reminder_type === 'overdue' ? (
                            <AlertTriangle size={13} className="text-red-700 shrink-0" />
                          ) : (
                            <Clock size={13} className="text-burgundy shrink-0" />
                          )}
                          <span>{rem.task_title}</span>
                        </div>
                        <p className="text-muted-brown text-[11px] leading-snug">{rem.message}</p>
                      </div>
                      <button
                        onClick={(e) => handleDismissReminder(rem.id, e)}
                        className="text-muted-brown hover:text-deep-wine p-1"
                        title="Dismiss reminder"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-soft-border/80">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-deep-wine to-burgundy text-gold-light font-serif font-bold text-sm flex items-center justify-center shadow-glossy border border-gold/40">
            {userPrefs.user_name ? userPrefs.user_name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <span className="font-semibold text-dark-charcoal block leading-tight">{userPrefs.user_name || 'Rithwik'}</span>
            <span className="text-[10px] text-muted-brown">Student Planner</span>
          </div>
        </div>
      </div>
    </header>
  );
}
