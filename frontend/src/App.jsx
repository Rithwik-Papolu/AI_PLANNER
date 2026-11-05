import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TaskModal from './components/TaskModal';
import AITaskIntakeModal from './components/AITaskIntakeModal';

// Pages
import Dashboard from './pages/Dashboard';
import MyTasks from './pages/MyTasks';
import AIChatbot from './pages/AIChatbot';
import VoiceAssistant from './pages/VoiceAssistant';
import AITimetable from './pages/AITimetable';
import CalendarView from './pages/CalendarView';
import Analytics from './pages/Analytics';
import TaskHistory from './pages/TaskHistory';
import Settings from './pages/Settings';

export default function App() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isAIIntakeModalOpen, setIsAIIntakeModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenNewTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Router>
      <div className="flex h-screen bg-warm-beige overflow-hidden text-dark-charcoal font-sans selection:bg-deep-wine selection:text-white">
        {/* Luxury Deep Burgundy Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <Header
            onOpenTaskModal={handleOpenNewTask}
            onOpenAIIntakeModal={() => setIsAIIntakeModalOpen(true)}
          />

          {/* Page Routing Outlet */}
          <main className="flex-1 flex overflow-hidden">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    key={refreshKey}
                    onOpenTaskModal={handleOpenNewTask}
                    onOpenAIIntakeModal={() => setIsAIIntakeModalOpen(true)}
                  />
                }
              />
              <Route
                path="/tasks"
                element={
                  <MyTasks
                    key={refreshKey}
                    onOpenTaskModal={handleOpenNewTask}
                    onOpenAIIntakeModal={() => setIsAIIntakeModalOpen(true)}
                    onEditTask={handleEditTask}
                  />
                }
              />
              <Route path="/chat" element={<AIChatbot />} />
              <Route path="/voice" element={<VoiceAssistant />} />
              <Route path="/timetable" element={<AITimetable />} />
              <Route
                path="/calendar"
                element={
                  <CalendarView
                    onOpenTaskModal={handleOpenNewTask}
                    onEditTask={handleEditTask}
                  />
                }
              />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/history" element={<TaskHistory />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>

        {/* Global Manual Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          taskToEdit={taskToEdit}
          onSaved={handleRefresh}
        />

        {/* Global AI Natural Language Intake Modal */}
        <AITaskIntakeModal
          isOpen={isAIIntakeModalOpen}
          onClose={() => setIsAIIntakeModalOpen(false)}
          onTasksSaved={handleRefresh}
        />
      </div>
    </Router>
  );
}
