import React, { useState } from 'react';
import { Sparkles, X, Check, Edit2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function AITaskIntakeModal({ isOpen, onClose, onTasksSaved }) {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [previewTasks, setPreviewTasks] = useState([]);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setExtractedData(null);

    try {
      const res = await api.extractNLPTasks(query.trim());
      setExtractedData(res);
      setPreviewTasks(res.extracted_tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to extract tasks.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTaskField = (index, field, value) => {
    setPreviewTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePreviewTask = (index) => {
    setPreviewTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmAndSave = async () => {
    if (previewTasks.length === 0) return;
    setIsSaving(true);
    setError(null);

    try {
      await api.confirmExtractedTasks(previewTasks);
      onTasksSaved();
      onClose();
      // Reset
      setQuery('');
      setExtractedData(null);
      setPreviewTasks([]);
    } catch (err) {
      setError(err.message || 'Failed to save confirmed tasks.');
    } finally {
      setIsSaving(false);
    }
  };

  const exampleQueries = [
    "Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM.",
    "Urgent meeting with project advisor at 4pm today for 45 minutes, high priority",
    "Study operating systems for 90 minutes and review linear algebra notes tomorrow morning"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-soft-ivory border border-soft-border rounded-3xl shadow-luxury-lg w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-deep-maroon via-deep-wine to-burgundy text-soft-ivory flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold-light">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">AI Natural-Language Task Intake</h2>
              <p className="text-xs text-gold-light/80">
                Method 2: Automatic entity extraction with preview & confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-soft-ivory/80 hover:text-soft-ivory transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Natural Language Prompt Input */}
          <form onSubmit={handleAnalyze} className="space-y-3">
            <label className="block text-xs font-semibold text-dark-charcoal uppercase tracking-wider">
              Type or paste your natural language planning request:
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM."
                className="w-full px-4 py-3 rounded-2xl bg-warm-beige/40 border border-soft-border focus:border-burgundy focus:ring-1 focus:ring-burgundy outline-none text-sm text-dark-charcoal resize-none shadow-inner"
              />
            </div>

            {/* Example Prompts */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-muted-brown font-medium">Examples:</span>
              {exampleQueries.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuery(ex)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-warm-beige hover:bg-soft-border text-deep-wine border border-burgundy/20 transition-all truncate max-w-xs"
                >
                  "{ex.slice(0, 38)}..."
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isAnalyzing || !query.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-burgundy flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles size={14} className="animate-spin text-gold-light" />
                    <span>Extracting Entities...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze & Preview Tasks</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Tasks Preview Table */}
          {extractedData && (
            <div className="pt-4 border-t border-soft-border/80 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-sm text-deep-wine">
                    Extracted Task Preview ({previewTasks.length} Identified)
                  </h3>
                  <p className="text-[11px] text-muted-brown">
                    Verify or edit the extracted details before saving. No data is stored without confirmation.
                  </p>
                </div>
              </div>

              {/* Missing information prompts */}
              {extractedData.missing_information_prompts?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <span className="font-semibold block">Clarifications & Missing Info:</span>
                  {extractedData.missing_information_prompts.map((p, idx) => (
                    <div key={idx} className="text-[11px] flex items-center gap-1.5 text-amber-800">
                      <span>•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Cards */}
              <div className="space-y-2.5">
                {previewTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-warm-beige/30 border border-soft-border flex flex-col gap-2 hover:border-burgundy/40 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => handleUpdateTaskField(idx, 'title', e.target.value)}
                        className="font-semibold text-sm text-dark-charcoal bg-transparent border-b border-transparent hover:border-soft-border focus:border-burgundy outline-none flex-1"
                      />
                      <button
                        onClick={() => handleRemovePreviewTask(idx)}
                        className="text-muted-brown hover:text-red-700 p-1"
                        title="Remove task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-brown block">Importance:</span>
                        <select
                          value={task.importance}
                          onChange={(e) => handleUpdateTaskField(idx, 'importance', e.target.value)}
                          className="w-full bg-soft-ivory border border-soft-border/70 rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-brown block">Duration (min):</span>
                        <input
                          type="number"
                          value={task.estimated_minutes}
                          onChange={(e) => handleUpdateTaskField(idx, 'estimated_minutes', Number(e.target.value))}
                          className="w-full bg-soft-ivory border border-soft-border/70 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-brown block">Category:</span>
                        <select
                          value={task.category}
                          onChange={(e) => handleUpdateTaskField(idx, 'category', e.target.value)}
                          className="w-full bg-soft-ivory border border-soft-border/70 rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="Study">Study</option>
                          <option value="Work">Work</option>
                          <option value="Health">Health</option>
                          <option value="Personal">Personal</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-brown flex items-center justify-between pt-1">
                      <span>Deadline: {task.due_at ? new Date(task.due_at).toLocaleString() : 'None specified'}</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        Confidence: {(task.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm & Save Button */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-brown hover:text-dark-charcoal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || previewTasks.length === 0}
                  onClick={handleConfirmAndSave}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold btn-burgundy flex items-center gap-2"
                >
                  <Check size={15} />
                  <span>{isSaving ? 'Saving to Database...' : `Confirm & Save ${previewTasks.length} Task(s)`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
