import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Flame,
  Check,
  Calendar,
  RefreshCw,
  Plus
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function Dashboard({ onOpenTaskModal, onOpenAIIntakeModal }) {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, tasksData] = await Promise.all([
        api.getDashboardStats(),
        api.getTasks({ sort_by: 'priority', sort_order: 'desc' })
      ]);
      setStats(statsData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.status === 'Completed') {
        await api.reopenTask(task.id);
      } else {
        await api.completeTask(task.id);
      }
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.recalculatePriorities();
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <GlossyIcon icon={Sparkles} variant="gold" size={28} containerSize="w-14 h-14" className="animate-spin" />
          <p className="font-serif text-deep-wine font-medium">Assembling executive dashboard...</p>
        </div>
      </div>
    );
  }

  const COLORS = {
    High: '#701C2C',    // Deep Wine
    Medium: '#8B2635',  // Burgundy
    Low: '#DECBB5'      // Soft Beige
  };

  const priorityPieData = stats?.priority_distribution
    ? Object.entries(stats.priority_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const recTask = stats?.recommended_next_task;

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto">
      {/* Top Banner: Greeting & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-light-cream via-soft-ivory to-warm-beige p-6 rounded-3xl border border-soft-border/80 shadow-luxury">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-burgundy">
            <Flame size={14} className="text-gold" />
            <span>AI Mini-Capstone Project</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-dark-charcoal">
            Welcome, {stats?.timezone ? 'Scholar' : 'Rithwik'}
          </h1>
          <p className="text-xs text-muted-brown max-w-xl">
            Your personal planning agent has evaluated your active workload and computed optimal priorities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-soft-ivory hover:bg-warm-beige text-deep-wine border border-burgundy/30 shadow-sm transition-all"
            title="Recalculate multi-factor priority scores"
          >
            <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
            <span>Recalculate Scores</span>
          </button>
          <button
            onClick={onOpenTaskModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold btn-burgundy"
          >
            <Plus size={15} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Tasks */}
        <div className="card-luxury p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-brown">Total</span>
            <GlossyIcon icon={ListTodo} variant="cream" size={14} containerSize="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-bold text-dark-charcoal">{stats?.total_tasks || 0}</span>
            <span className="text-[10px] text-muted-brown block mt-0.5">All tracked tasks</span>
          </div>
        </div>

        {/* Completed */}
        <div className="card-luxury p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-brown">Completed</span>
            <GlossyIcon icon={CheckCircle2} variant="cream" size={14} containerSize="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-800">{stats?.completed_tasks || 0}</span>
            <span className="text-[10px] text-emerald-700/80 block mt-0.5">Finished milestones</span>
          </div>
        </div>

        {/* Pending */}
        <div className="card-luxury p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-brown">Pending</span>
            <GlossyIcon icon={Clock} variant="burgundy" size={14} containerSize="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-bold text-burgundy">{stats?.pending_tasks || 0}</span>
            <span className="text-[10px] text-muted-brown block mt-0.5">Ready for work</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="card-luxury p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-brown">Overdue</span>
            <GlossyIcon icon={AlertTriangle} variant="gold" size={14} containerSize="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-bold text-red-700">{stats?.overdue_tasks || 0}</span>
            <span className="text-[10px] text-red-600/80 block mt-0.5">Requires immediate action</span>
          </div>
        </div>

        {/* Daily Productivity % */}
        <div className="card-luxury p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-brown">Today's Rate</span>
            <GlossyIcon icon={TrendingUp} variant="accent" size={14} containerSize="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-bold text-deep-wine">
              {stats?.daily_productivity_percentage || 0}%
            </span>
            <span className="text-[10px] text-muted-brown block mt-0.5">Daily completion</span>
          </div>
        </div>

        {/* Weekly Productivity % */}
        <div className="card-luxury p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-brown">Weekly Rate</span>
            <GlossyIcon icon={Flame} variant="gold" size={14} containerSize="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-bold text-dark-charcoal">
              {stats?.weekly_productivity_percentage || 0}%
            </span>
            <span className="text-[10px] text-muted-brown block mt-0.5">7-day average</span>
          </div>
        </div>
      </div>

      {/* AI Recommended Next Task Card */}
      <div className="bg-gradient-to-br from-deep-maroon via-deep-wine to-burgundy text-soft-ivory p-7 rounded-3xl shadow-luxury-lg border border-gold/30 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gold-light bg-gold/20 px-3 py-1 rounded-full border border-gold/30 flex items-center gap-1.5">
                <Sparkles size={12} />
                Intelligent AI Recommendation
              </span>
              {recTask && (
                <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-soft-ivory font-mono">
                  Score: {recTask.priority_score.toFixed(1)}/100
                </span>
              )}
            </div>

            {recTask ? (
              <>
                <h2 className="font-serif text-2xl font-bold text-soft-ivory tracking-wide">
                  {recTask.title}
                </h2>
                <p className="text-xs text-soft-ivory/85 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/10 max-w-3xl">
                  {stats?.recommendation_reason || 'Identified as the highest-yield next activity by multi-factor weighted scoring.'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-soft-ivory/80 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-gold-light" />
                    Est. Duration: {recTask.estimated_minutes} mins
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gold-light" />
                    Deadline: {recTask.due_at ? new Date(recTask.due_at).toLocaleString() : 'Flexible'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 text-gold-light text-[11px] font-medium">
                    Category: {recTask.category}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-2">
                <h3 className="font-serif text-lg font-semibold text-soft-ivory">
                  All Clear! No pending tasks require attention right now.
                </h3>
                <p className="text-xs text-soft-ivory/70 mt-1">
                  Use manual entry or natural language intake to add upcoming projects, study assignments, or goals.
                </p>
              </div>
            )}
          </div>

          {recTask && (
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
              <button
                onClick={() => handleToggleComplete(recTask)}
                className="px-5 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-light to-gold text-deep-maroon hover:brightness-105 transition-all shadow-glossy-gold flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>Mark Completed</span>
              </button>
              <button
                onClick={onOpenTaskModal}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-soft-ivory border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Add More Tasks</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Pending Tasks vs Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High Priority Active Tasks */}
        <div className="lg:col-span-2 card-luxury p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-soft-border/60">
            <div>
              <h3 className="font-serif text-lg font-bold text-deep-wine">Active Task Queue</h3>
              <p className="text-xs text-muted-brown">
                Ranked continuously by the Explainable Weighted Priority Engine
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-muted-brown bg-warm-beige px-2.5 py-1 rounded-full">
              {tasks.filter(t => t.status !== 'Completed').length} Pending
            </span>
          </div>

          {tasks.filter(t => t.status !== 'Completed').length === 0 ? (
            <div className="py-12 text-center text-muted-brown space-y-3">
              <GlossyIcon icon={CheckCircle2} variant="cream" size={24} containerSize="w-12 h-12" className="mx-auto" />
              <p className="text-sm font-medium">Your task queue is empty.</p>
              <button
                onClick={onOpenAIIntakeModal}
                className="text-xs text-deep-wine font-semibold underline underline-offset-4 hover:text-burgundy"
              >
                Create tasks using AI Natural Language Intake
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {tasks
                .filter(t => t.status !== 'Completed')
                .slice(0, 6)
                .map((task) => {
                  const isOverdue = task.status === 'Overdue';
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl bg-white/60 hover:bg-white border border-soft-border/70 hover:border-burgundy/30 transition-all shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="mt-0.5 w-5 h-5 rounded-lg border-2 border-burgundy/40 hover:border-burgundy flex items-center justify-center text-transparent hover:text-burgundy/60 transition-all"
                        >
                          <Check size={12} />
                        </button>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-dark-charcoal truncate">
                              {task.title}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-brown">
                            <span>{task.category}</span>
                            <span>•</span>
                            <span>{task.estimated_minutes}m</span>
                            {task.due_at && (
                              <>
                                <span>•</span>
                                <span className={isOverdue ? 'text-red-700 font-medium' : ''}>
                                  Due {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Priority Score Badge */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-deep-wine font-mono">
                          {task.priority_score.toFixed(1)}
                        </div>
                        <span className="text-[10px] text-muted-brown uppercase tracking-wider block">
                          Priority
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Col: Priority Distribution Chart */}
        <div className="card-luxury p-6 rounded-3xl flex flex-col justify-between">
          <div className="pb-2 border-b border-soft-border/60">
            <h3 className="font-serif text-lg font-bold text-deep-wine">Priority Distribution</h3>
            <p className="text-xs text-muted-brown">Breakdown by importance tier</p>
          </div>

          <div className="h-56 relative flex items-center justify-center my-2">
            {priorityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {priorityPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.name] || '#8B2635'}
                        stroke="#FFF9F0"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFF9F0',
                      borderColor: '#DECBB5',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#302626'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-brown">No task distribution data yet</p>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-2 pt-2 border-t border-soft-border/50 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-deep-wine" />
                <span className="text-dark-charcoal font-medium">High Importance</span>
              </div>
              <span className="font-mono text-muted-brown">{stats?.priority_distribution?.High || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy" />
                <span className="text-dark-charcoal font-medium">Medium Importance</span>
              </div>
              <span className="font-mono text-muted-brown">{stats?.priority_distribution?.Medium || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-soft-border" />
                <span className="text-dark-charcoal font-medium">Low Importance</span>
              </div>
              <span className="font-mono text-muted-brown">{stats?.priority_distribution?.Low || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
