import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Mic,
  CalendarClock,
  Calendar,
  BarChart3,
  History,
  Settings,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import GlossyIcon from './GlossyIcon';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'My Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'AI Chatbot', path: '/chat', icon: MessageSquare, badge: 'Llama 3.2' },
  { name: 'Voice Assistant', path: '/voice', icon: Mic, badge: 'Hey Planner' },
  { name: 'AI Timetable', path: '/timetable', icon: CalendarClock },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Task History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-deep-maroon text-soft-ivory flex flex-col shrink-0 border-r border-burgundy/50 shadow-luxury-lg z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-burgundy/40 flex items-center gap-3">
        <GlossyIcon icon={Sparkles} variant="gold" size={22} containerSize="w-11 h-11" />
        <div>
          <h1 className="font-serif text-xl font-bold tracking-wide text-soft-ivory flex items-center gap-1.5">
            AI PLANNER
          </h1>
          <p className="text-[11px] uppercase tracking-wider text-gold-light/80 font-medium">
            Intelligent Agent
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-burgundy to-deep-wine text-soft-ivory shadow-glossy border border-gold/30'
                  : 'text-soft-ivory/80 hover:bg-white/5 hover:text-soft-ivory'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <GlossyIcon
                    icon={item.icon}
                    size={16}
                    containerSize="w-8 h-8"
                    variant={isActive ? 'gold' : 'cream'}
                    className={isActive ? 'ring-2 ring-gold/40' : 'opacity-80 group-hover:opacity-100'}
                  />
                  <span className={`tracking-wide ${isActive ? 'font-semibold text-soft-ivory' : ''}`}>
                    {item.name}
                  </span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      isActive
                        ? 'bg-gold/20 text-gold-light border-gold/40'
                        : 'bg-white/10 text-soft-ivory/60 border-white/15'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-burgundy/40 bg-deep-wine/30">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-black/20 border border-gold/20">
          <ShieldCheck size={16} className="text-gold shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="text-soft-ivory font-medium block">Zero-Cost Offline Core</span>
            <span className="text-gold-light/70">Ollama + SQLite Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
