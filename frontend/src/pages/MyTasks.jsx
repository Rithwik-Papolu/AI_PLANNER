import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Sparkles,
  Check,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  Info,
  ChevronDown,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function MyTasks({ onOpenTaskModal, onOpenAIIntakeModal, onEditTask }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, categoryFilter, importanceFilter, sortBy, sortOrder]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getTasks({
        status: statusFilter,
        category: categoryFilter,
        importance: importanceFilter,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.status === 'Completed') {
        await api.reopenTask(task.id);
      } else {
        await api.completeTask(task.id);
      }
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.recalculatePriorities();
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-dark-charcoal">Task Management</h1>
          <p className="text-xs text-muted-brown">
            Manual and AI natural-language task coordination with explainable prioritization
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-soft-ivory hover:bg-warm-beige text-deep-wine border border-soft-border shadow-sm transition-all"
            title="Recalculate priority ranking"
          >
            <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
            <span>Recalculate</span>
          </button>
          <button
            onClick={onOpenTaskModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-soft-ivory hover:bg-warm-beige text-deep-wine border border-burgundy/30 shadow-sm transition-all"
          >
            <Plus size={14} />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={onOpenAIIntakeModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-burgundy"
          >
            <Sparkles size={14} className="text-gold-light" />
            <span>AI Intake</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="card-luxury p-4 rounded-2xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title, category, tags or description..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-warm-beige/30 border border-soft-border focus:border-burgundy outline-none text-xs text-dark-charcoal"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-muted-brown" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-deep-wine text-soft-ivory hover:bg-burgundy transition-all"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-soft-border/50">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-brown font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 rounded-lg bg-soft-ivory border border-soft-border outline-none text-xs text-dark-charcoal font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-brown font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 rounded-lg bg-soft-ivory border border-soft-border outline-none text-xs text-dark-charcoal font-medium"
            >
              <option value="all">All Categories</option>
              <option value="Study">Study</option>
              <option value="Work">Work</option>
              <option value="Health">Health</option>
              <option value="Personal">Personal</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Importance Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-brown font-medium">Importance:</span>
            <select
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value)}
              className="px-2 py-1 rounded-lg bg-soft-ivory border border-soft-border outline-none text-xs text-dark-charcoal font-medium"
            >
              <option value="all">All Tiers</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-muted-brown font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 rounded-lg bg-soft-ivory border border-soft-border outline-none text-xs text-dark-charcoal font-medium"
            >
              <option value="priority">Priority Score</option>
              <option value="due_at">Deadline</option>
              <option value="created_at">Date Created</option>
              <option value="title">Title (A-Z)</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2 py-1 rounded-lg bg-soft-ivory border border-soft-border text-xs text-dark-charcoal"
              title="Toggle sort direction"
            >
              {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-16 text-center text-muted-brown">
          <GlossyIcon icon={Sparkles} variant="gold" size={24} containerSize="w-12 h-12" className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Fetching tasks and priority scores...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card-luxury p-12 text-center text-muted-brown rounded-3xl space-y-3">
          <GlossyIcon icon={CheckCircle2} variant="cream" size={28} containerSize="w-14 h-14" className="mx-auto" />
          <h3 className="font-serif text-lg font-bold text-dark-charcoal">No tasks match your filter.</h3>
          <p className="text-xs max-w-md mx-auto">
            Try adjusting your search criteria or create a new task using manual entry or AI natural intake.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isOverdue = task.status === 'Overdue';
            const isExpanded = expandedBreakdownId === task.id;
            const details = task.priority_details;

            return (
              <div
                key={task.id}
                className={`card-luxury p-5 rounded-2xl transition-all ${
                  isCompleted ? 'opacity-65 bg-warm-beige/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'border-burgundy/50 hover:border-burgundy text-transparent hover:text-burgundy/60'
                      }`}
                    >
                      <Check size={13} />
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-semibold text-base text-dark-charcoal ${
                            isCompleted ? 'line-through text-muted-brown' : ''
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Status badge */}
                        {isOverdue && !isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                            Overdue
                          </span>
                        )}
                        {task.importance === 'High' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-deep-wine/10 text-deep-wine border border-deep-wine/20">
                            High Importance
                          </span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warm-beige text-muted-brown">
                          {task.category}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-brown line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-brown pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-burgundy" />
                          {task.estimated_minutes} mins
                        </span>
                        {task.due_at && (
                          <span className={`flex items-center gap-1 ${isOverdue && !isCompleted ? 'text-red-700 font-semibold' : ''}`}>
                            <Calendar size={13} className="text-burgundy" />
                            Due: {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {task.tags && (
                          <span className="text-[11px] text-muted-brown">Tags: {task.tags}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Priority Score Pill & Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Clickable Priority Score button */}
                    <button
                      onClick={() => setExpandedBreakdownId(isExpanded ? null : task.id)}
                      className="px-3 py-1.5 rounded-xl bg-warm-beige/60 hover:bg-warm-beige border border-burgundy/20 text-right group flex items-center gap-2 transition-all shadow-sm"
                      title="Click to view explainable mathematical score breakdown"
                    >
                      <div>
                        <div className="text-xs font-bold text-deep-wine font-mono">
                          {task.priority_score.toFixed(1)}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-brown font-semibold block">
                          Score
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-muted-brown group-hover:text-deep-wine transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-2 rounded-lg text-muted-brown hover:text-deep-wine hover:bg-warm-beige transition-all"
                        title="Edit task details"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 rounded-lg text-muted-brown hover:text-red-700 hover:bg-red-50 transition-all"
                        title="Delete task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Explainable Factor Decomposition Accordion */}
                {isExpanded && details && (
                  <div className="mt-4 pt-4 border-t border-soft-border/70 bg-warm-beige/40 p-4 rounded-xl text-xs space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-deep-wine flex items-center gap-1.5">
                        <Info size={14} />
                        Explainable Priority Formula Breakdown
                      </span>
                      <span className="text-[10px] text-muted-brown font-mono">
                        (I×0.35) + (U×0.30) + (D×0.20) + (P×0.15)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-lg bg-soft-ivory border border-soft-border">
                        <span className="text-[10px] text-muted-brown uppercase block">Importance (35%)</span>
                        <span className="font-bold text-sm text-dark-charcoal font-mono">
                          {details.importance_score}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-soft-ivory border border-soft-border">
                        <span className="text-[10px] text-muted-brown uppercase block">Urgency (30%)</span>
                        <span className="font-bold text-sm text-dark-charcoal font-mono">
                          {details.urgency_score}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-soft-ivory border border-soft-border">
                        <span className="text-[10px] text-muted-brown uppercase block">Deadline (20%)</span>
                        <span className="font-bold text-sm text-dark-charcoal font-mono">
                          {details.deadline_score}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-soft-ivory border border-soft-border">
                        <span className="text-[10px] text-muted-brown uppercase block">Time Pressure (15%)</span>
                        <span className="font-bold text-sm text-dark-charcoal font-mono">
                          {details.pressure_score}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-brown bg-soft-ivory/80 p-2.5 rounded-lg border border-soft-border/50 leading-relaxed">
                      💡 <strong>Algorithm Explanation:</strong> {details.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
