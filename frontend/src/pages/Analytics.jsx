import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <GlossyIcon icon={Sparkles} variant="gold" size={28} containerSize="w-14 h-14" className="animate-spin" />
          <p className="font-serif text-deep-wine font-medium">Aggregating database analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-dark-charcoal flex items-center gap-3">
          Productivity Analytics
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-300">
            Real Database Records
          </span>
        </h1>
        <p className="text-xs text-muted-brown">
          Rigorous performance evaluation, completion trajectory, and academic milestone metrics
        </p>
      </div>

      {/* Top Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-luxury p-5 rounded-3xl flex items-center gap-4">
          <GlossyIcon icon={Award} variant="gold" size={20} containerSize="w-11 h-11" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-brown block">
              Completion Rate
            </span>
            <span className="text-2xl font-bold text-deep-wine font-serif">
              {data?.overall_completion_rate || 0}%
            </span>
          </div>
        </div>

        <div className="card-luxury p-5 rounded-3xl flex items-center gap-4">
          <GlossyIcon icon={Clock} variant="burgundy" size={20} containerSize="w-11 h-11" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-brown block">
              Avg. Turnaround
            </span>
            <span className="text-2xl font-bold text-dark-charcoal font-serif">
              {data?.average_completion_minutes || 0}m
            </span>
          </div>
        </div>

        <div className="card-luxury p-5 rounded-3xl flex items-center gap-4">
          <GlossyIcon icon={CheckCircle2} variant="cream" size={20} containerSize="w-11 h-11" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-brown block">
              Completed Tasks
            </span>
            <span className="text-2xl font-bold text-emerald-800 font-serif">
              {data?.total_completed || 0}
            </span>
          </div>
        </div>

        <div className="card-luxury p-5 rounded-3xl flex items-center gap-4">
          <GlossyIcon icon={AlertTriangle} variant="gold" size={20} containerSize="w-11 h-11" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-brown block">
              Overdue Tasks
            </span>
            <span className="text-2xl font-bold text-red-700 font-serif">
              {data?.total_overdue || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Completion Trend (Area Chart) */}
        <div className="card-luxury p-6 rounded-3xl space-y-4">
          <div className="pb-2 border-b border-soft-border/60">
            <h3 className="font-serif text-lg font-bold text-deep-wine">Daily Productivity Trend</h3>
            <p className="text-xs text-muted-brown">Tasks created vs completed over the last 7 days</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily_trend || []}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#701C2C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#701C2C" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A059" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C5A059" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DECBB5" opacity={0.5} />
                <XAxis dataKey="date" stroke="#806D65" fontSize={11} />
                <YAxis stroke="#806D65" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF9F0',
                    borderColor: '#DECBB5',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#302626'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#701C2C"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#C5A059"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Comparison (Bar Chart) */}
        <div className="card-luxury p-6 rounded-3xl space-y-4">
          <div className="pb-2 border-b border-soft-border/60">
            <h3 className="font-serif text-lg font-bold text-deep-wine">Weekly Milestone Progress</h3>
            <p className="text-xs text-muted-brown">4-week historical completion distribution</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weekly_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DECBB5" opacity={0.5} />
                <XAxis dataKey="date" stroke="#806D65" fontSize={11} />
                <YAxis stroke="#806D65" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF9F0',
                    borderColor: '#DECBB5',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#302626'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="completed" name="Completed Tasks" fill="#8B2635" radius={[6, 6, 0, 0]} />
                <Bar dataKey="created" name="Created Tasks" fill="#DECBB5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Productivity Breakdown */}
      <div className="card-luxury p-6 rounded-3xl space-y-4">
        <div className="pb-2 border-b border-soft-border/60">
          <h3 className="font-serif text-lg font-bold text-deep-wine">Category Productivity Breakdown</h3>
          <p className="text-xs text-muted-brown">Task fulfillment across academic, work, and personal domains</p>
        </div>

        {data?.category_productivity && Object.keys(data.category_productivity).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(data.category_productivity).map(([cat, stats]) => {
              const rate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;
              return (
                <div key={cat} className="p-4 rounded-2xl bg-white/60 border border-soft-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-dark-charcoal">{cat}</span>
                    <span className="text-xs font-mono font-bold text-deep-wine">{rate}%</span>
                  </div>
                  <div className="w-full bg-warm-beige rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-deep-wine to-burgundy h-full rounded-full transition-all duration-500"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-brown pt-1">
                    <span>{stats.completed} done</span>
                    <span>{stats.pending} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-brown py-4 text-center">No category data recorded yet.</p>
        )}
      </div>
    </div>
  );
}
