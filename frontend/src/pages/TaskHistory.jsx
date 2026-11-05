import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Filter,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function TaskHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, [actionFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        limit: 100
      });
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const act = action.toUpperCase();
    if (act.includes('COMPLETE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (act.includes('CREATE')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (act.includes('REOPEN')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (act.includes('UPDATE')) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else if (act.includes('RESCHEDULE')) {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    }
    return 'bg-warm-beige text-dark-charcoal border-soft-border';
  };

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-dark-charcoal flex items-center gap-3">
            Task History & Activity Audit
          </h1>
          <p className="text-xs text-muted-brown">
            Immutable chronological audit trail of all task mutations, priority recalculations, and reschedules
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-brown">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-soft-ivory border border-soft-border text-xs text-dark-charcoal font-medium outline-none"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="COMPLETE">Completed</option>
            <option value="REOPEN">Reopened</option>
            <option value="RESCHEDULE">Rescheduled</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-brown">
          <GlossyIcon icon={Sparkles} variant="gold" size={24} containerSize="w-12 h-12" className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Fetching audit records...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="card-luxury p-12 text-center text-muted-brown rounded-3xl space-y-3">
          <GlossyIcon icon={HistoryIcon} variant="cream" size={28} containerSize="w-14 h-14" className="mx-auto" />
          <h3 className="font-serif text-lg font-bold text-dark-charcoal">No Activity Records Found</h3>
          <p className="text-xs">
            As tasks are created, scheduled, prioritized, and updated, their audit records will appear here.
          </p>
        </div>
      ) : (
        <div className="card-luxury rounded-3xl overflow-hidden shadow-sm">
          <div className="divide-y divide-soft-border/60">
            {history.map((record) => (
              <div key={record.id} className="p-4 hover:bg-white/40 transition-all flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${getActionBadge(record.action)}`}>
                      {record.action}
                    </span>
                    {record.task_id && (
                      <span className="text-muted-brown font-mono text-[11px]">
                        Task ID #{record.task_id}
                      </span>
                    )}
                  </div>

                  {record.reason && (
                    <p className="font-medium text-dark-charcoal text-sm">{record.reason}</p>
                  )}

                  {(record.old_value || record.new_value) && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-brown pt-0.5">
                      {record.old_value && (
                        <span className="bg-warm-beige/50 px-2 py-0.5 rounded font-mono truncate max-w-xs">
                          Old: {record.old_value}
                        </span>
                      )}
                      {record.old_value && record.new_value && <ArrowRight size={12} />}
                      {record.new_value && (
                        <span className="bg-warm-beige/80 px-2 py-0.5 rounded font-mono text-deep-wine font-semibold truncate max-w-xs">
                          New: {record.new_value}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 text-muted-brown text-[11px] font-mono">
                  {new Date(record.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
