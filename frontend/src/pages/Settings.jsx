import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  Globe,
  Mic,
  Sliders,
  Utensils
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function Settings() {
  const [prefs, setPrefs] = useState({
    user_name: 'Rithwik',
    working_start: '09:00',
    working_end: '18:00',
    lunch_start: '13:00',
    lunch_duration_minutes: 60,
    break_minutes: 15,
    timezone: 'Asia/Kolkata',
    daily_available_minutes: 480,
    preferred_planning_style: 'balanced',
    default_task_duration: 30,
    wake_word_enabled: true,
    wake_word: 'Hey Planner',
    ai_model: 'llama3.2',
    reminder_lead_minutes: 30
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    api.getPreferences()
      .then(setPrefs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field, value) => {
    setPrefs(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await api.updatePreferences(prefs);
      setPrefs(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <GlossyIcon icon={Sparkles} variant="gold" size={24} containerSize="w-12 h-12" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-dark-charcoal flex items-center gap-3">
          Settings & Personalization
        </h1>
        <p className="text-xs text-muted-brown">
          Configure work hours, cognitive rest breaks, local AI model parameters, and wake-word controls
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Identity & Profile */}
        <div className="card-luxury p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-deep-wine flex items-center gap-2">
            <Sliders size={18} />
            <span>Profile & Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Display Name</label>
              <input
                type="text"
                value={prefs.user_name || ''}
                onChange={(e) => handleChange('user_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Timezone</label>
              <div className="relative">
                <input
                  type="text"
                  value={prefs.timezone || 'Asia/Kolkata'}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
                />
                <Globe size={15} className="absolute left-3 top-3 text-muted-brown" />
              </div>
            </div>
          </div>
        </div>

        {/* Working Hours & Scheduling Constraints */}
        <div className="card-luxury p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-deep-wine flex items-center gap-2">
            <Clock size={18} />
            <span>Working Hours & Interval Scheduling</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Work Day Start</label>
              <input
                type="time"
                value={prefs.working_start || '09:00'}
                onChange={(e) => handleChange('working_start', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Work Day End</label>
              <input
                type="time"
                value={prefs.working_end || '18:00'}
                onChange={(e) => handleChange('working_end', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Lunch Start Time</label>
              <div className="relative">
                <input
                  type="time"
                  value={prefs.lunch_start || '13:00'}
                  onChange={(e) => handleChange('lunch_start', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
                />
                <Utensils size={15} className="absolute left-3 top-3 text-muted-brown" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Lunch Duration (mins)</label>
              <input
                type="number"
                min="15"
                max="120"
                value={prefs.lunch_duration_minutes || 60}
                onChange={(e) => handleChange('lunch_duration_minutes', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Focus Rest Break (mins)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={prefs.break_minutes || 15}
                onChange={(e) => handleChange('break_minutes', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Preferred Planning Style</label>
              <select
                value={prefs.preferred_planning_style || 'balanced'}
                onChange={(e) => handleChange('preferred_planning_style', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy font-medium"
              >
                <option value="balanced">Balanced (90m focus + 15m break)</option>
                <option value="deep_work">Deep Work (120m focus session)</option>
                <option value="frequent_breaks">Pomodoro / Frequent (50m focus)</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI & Voice Assistant Controls */}
        <div className="card-luxury p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-deep-wine flex items-center gap-2">
            <Mic size={18} />
            <span>Voice Assistant & Local AI Configuration</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Wake Word Activation Phrase</label>
              <input
                type="text"
                value={prefs.wake_word || 'Hey Planner'}
                onChange={(e) => handleChange('wake_word', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-dark-charcoal mb-1">Local Ollama Model</label>
              <input
                type="text"
                value={prefs.ai_model || 'llama3.2'}
                onChange={(e) => handleChange('ai_model', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border outline-none focus:border-burgundy font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold bg-emerald-100 px-3.5 py-2 rounded-xl">
              <Check size={16} />
              <span>Preferences saved persistently to SQLite database.</span>
            </div>
          ) : (
            <span className="text-xs text-muted-brown">All configurations take effect immediately.</span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold btn-burgundy flex items-center gap-2 shadow-sm"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
