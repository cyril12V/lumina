import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Wallet,
  Users,
  Calendar,
  CheckSquare,
  Bell,
  User
} from 'lucide-react';
import FinanceDashboard from './finance/FinanceDashboard';
import DashboardHome from './DashboardHome';
import EspaceClientDashboard from './espace-client/EspaceClientDashboard';
import CalendarView from './calendar/CalendarView';
import TasksManager from './tasks/TasksManager';
import ProfileSettings from './profile/ProfileSettings';
import { auth, notifications } from '../lib/api';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadCount, setUnreadCount] = useState(0);
  const user = auth.getUser();

  useEffect(() => {
    loadUnreadCount();
    // Refresh unread count every minute
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await notifications.getUnreadCount();
      setUnreadCount(data?.count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.split(' ');
      return parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'US';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'tasks', label: 'Taches', icon: CheckSquare },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'espace-client', label: 'Espace Client', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-[#F3F2EE] font-sans">
      {/* SIDEBAR */}
      <aside className="w-24 md:w-64 bg-white border-r border-zinc-200 flex flex-col items-center md:items-stretch py-8 transition-all">
        {/* LOGO AREA */}
        <div className="px-6 mb-12 flex items-center gap-3">
          <div className="w-10 h-10 bg-vibrant rounded-full flex-shrink-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <span className="hidden md:block text-2xl font-display tracking-tighter uppercase text-black">Lumina</span>
        </div>

        {/* NAV LINKS */}
        <nav className="flex-grow space-y-2 px-4">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-center md:justify-start gap-4 px-4 py-4 rounded-2xl transition-all ${
                  activeTab === item.id
                    ? 'bg-vibrant text-white shadow-lg shadow-vibrant/20 font-bold'
                    : 'text-zinc-400 hover:bg-zinc-50 hover:text-black'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden md:block text-[11px] uppercase tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* USER PROFILE BOTTOM */}
        <div className="px-4 mt-auto space-y-2">
          {/* Notifications button */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-center md:justify-start gap-4 px-4 py-4 rounded-2xl transition-all relative ${
              activeTab === 'profile' && unreadCount > 0
                ? 'bg-vibrant text-white'
                : 'text-zinc-400 hover:text-black hover:bg-zinc-50'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="hidden md:block text-[11px] uppercase tracking-widest">Notifications</span>
          </button>

          {/* Profile/Settings button */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-center md:justify-start gap-4 px-4 py-4 rounded-2xl transition-all ${
              activeTab === 'profile'
                ? 'bg-vibrant text-white shadow-lg shadow-vibrant/20 font-bold'
                : 'text-zinc-400 hover:bg-zinc-50 hover:text-black'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="hidden md:block text-[11px] uppercase tracking-widest">Profil</span>
          </button>

          <div className="pt-4 border-t border-zinc-100">
            <button
              onClick={onLogout}
              className="w-full p-4 bg-zinc-50 rounded-3xl flex items-center gap-4 hover:bg-zinc-100 transition-all border border-zinc-200"
            >
              <div className="w-8 h-8 rounded-full bg-vibrant/10 text-vibrant flex items-center justify-center font-bold text-xs uppercase">
                {getInitials()}
              </div>
              <div className="hidden md:flex flex-col items-start overflow-hidden">
                <span className="text-[10px] font-bold text-black uppercase truncate w-full">
                  {user?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
                </span>
                <span className="text-[9px] text-zinc-400 uppercase font-bold truncate">
                  Abonnement Studio
                </span>
              </div>
              <LogOut className="hidden md:block w-4 h-4 ml-auto text-zinc-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow overflow-y-auto bg-[#F3F2EE]">
        {activeTab === 'dashboard' && <DashboardHome />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'tasks' && <TasksManager />}
        {activeTab === 'finance' && <FinanceDashboard />}
        {activeTab === 'espace-client' && <EspaceClientDashboard />}
        {activeTab === 'profile' && <ProfileSettings />}
      </main>
    </div>
  );
};

export default Dashboard;
