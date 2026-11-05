import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, Folder, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function TaskModal({ isOpen, onClose, taskToEdit = null, onSaved }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('Medium');
  const [urgency, setUrgency] = useState(50);
  const [dueAt, setDueAt] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [category, setCategory] = useState('Study');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setImportance(taskToEdit.importance || 'Medium');
      setUrgency(taskToEdit.urgency || 50);
      setDueAt(taskToEdit.due_at ? new Date(taskToEdit.due_at).toISOString().slice(0, 16) : '');
      setEstimatedMinutes(taskToEdit.estimated_minutes || 30);
      setCategory(taskToEdit.category || 'Study');
      setTags(taskToEdit.tags || '');
    } else {
      setTitle('');
      setDescription('');
      setImportance('Medium');
      setUrgency(50);
      setDueAt('');
      setEstimatedMinutes(30);
      setCategory('Study');
      setTags('');
    }
    setError(null);
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      importance,
      urgency: Number(urgency),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      estimated_minutes: Number(estimatedMinutes),
      category,
      tags: tags.trim(),
      source: 'Manual'
    };

    try {
      if (taskToEdit) {
        await api.updateTask(taskToEdit.id, payload);
      } else {
        await api.createTask(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickDeadline = (hoursFromNow) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(0);
    setDueAt(d.toISOString().slice(0, 16));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-soft-ivory border border-soft-border rounded-3xl shadow-luxury-lg w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-deep-maroon to-burgundy text-soft-ivory flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold">
              {taskToEdit ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-gold-light/80">
              Multi-factor priority will automatically analyze this task
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-soft-ivory/80 hover:text-soft-ivory transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete AI Assignment 3"
              className="w-full px-4 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy focus:ring-1 focus:ring-burgundy outline-none text-sm text-dark-charcoal"
              required
            />
          </div>

          {/* Importance & Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
                Importance Level
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy outline-none text-sm text-dark-charcoal font-medium"
              >
                <option value="High">High Importance</option>
                <option value="Medium">Medium Importance</option>
                <option value="Low">Low Importance</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-dark-charcoal uppercase tracking-wider">
                  Urgency Score
                </label>
                <span className="text-xs font-bold text-burgundy">{urgency}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full accent-burgundy cursor-pointer h-2 bg-warm-beige rounded-lg"
              />
            </div>
          </div>

          {/* Due Date & Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
              Deadline (Date & Time)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy outline-none text-xs text-dark-charcoal"
                />
                <Calendar size={15} className="absolute left-3 top-2.5 text-muted-brown pointer-events-none" />
              </div>
              {dueAt && (
                <button
                  type="button"
                  onClick={() => setDueAt('')}
                  className="px-2 text-xs text-muted-brown hover:text-red-700"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Quick presets */}
            <div className="flex gap-1.5 mt-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => setQuickDeadline(6)}
                className="px-2 py-0.5 rounded-md bg-warm-beige hover:bg-soft-border text-dark-charcoal border border-soft-border/60"
              >
                +6 Hours
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(24)}
                className="px-2 py-0.5 rounded-md bg-warm-beige hover:bg-soft-border text-dark-charcoal border border-soft-border/60"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(48)}
                className="px-2 py-0.5 rounded-md bg-warm-beige hover:bg-soft-border text-dark-charcoal border border-soft-border/60"
              >
                In 2 Days
              </button>
            </div>
          </div>

          {/* Duration & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
                Estimated Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="720"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy outline-none text-sm text-dark-charcoal font-medium"
                />
                <Clock size={15} className="absolute left-3 top-3 text-muted-brown" />
                <span className="absolute right-3 top-2.5 text-xs text-muted-brown">mins</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy outline-none text-sm text-dark-charcoal font-medium"
                >
                  <option value="Study">Study / Academic</option>
                  <option value="Work">Work / Project</option>
                  <option value="Health">Health / Fitness</option>
                  <option value="Personal">Personal</option>
                  <option value="General">General</option>
                </select>
                <Folder size={15} className="absolute left-3 top-3 text-muted-brown" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
              Tags (comma-separated)
            </label>
            <div className="relative">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="ai, assignment, capstone"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy outline-none text-xs text-dark-charcoal"
              />
              <Tag size={14} className="absolute left-3 top-2.5 text-muted-brown" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, references, or links..."
              className="w-full px-4 py-2 rounded-xl bg-warm-beige/40 border border-soft-border focus:border-burgundy outline-none text-xs text-dark-charcoal resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-soft-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-brown hover:text-dark-charcoal transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-burgundy flex items-center gap-2"
            >
              {isSubmitting ? 'Calculating & Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
