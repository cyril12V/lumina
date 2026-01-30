import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Users,
  Calendar,
  Plus,
  ChevronRight,
  Sparkles,
  Wallet,
  FileText,
  CheckSquare,
  Clock,
  TrendingUp,
  Bell,
  Link2,
  Image,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import { auth, sessions, clients, finance, tasks, espaceClient, notifications } from '../lib/api';

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalClients: 0,
    upcomingSessions: 0,
    activeLinks: 0,
    pendingSignatures: 0,
    pendingTasks: 0,
    unreadNotifications: 0,
    revenue: 0,
    unpaidInvoices: 0,
  });
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [recentLinks, setRecentLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.getUser();
    setUser(currentUser);
    if (currentUser?.id) {
      loadAllStats(currentUser.id);
    }
  }, []);

  const loadAllStats = async (userId: string) => {
    try {
      setLoading(true);
      const [
        sessionsData,
        clientsData,
        invoicesData,
        tasksData,
        linksData,
        notifData
      ] = await Promise.all([
        sessions.list(userId),
        clients.list(userId),
        finance.listDocuments('invoice').catch(() => []),
        tasks.getMyTasks('pending').catch(() => []),
        espaceClient.listLinks(userId).catch(() => []),
        notifications.getUnreadCount().catch(() => ({ count: 0 }))
      ]);

      const now = new Date();
      const upcoming = sessionsData
        .filter((s: any) => new Date(s.date) >= now && s.status !== 'completed')
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const revenue = invoicesData
        .filter((d: any) => d.status === 'paid')
        .reduce((sum: number, d: any) => sum + (d.total_ttc || 0), 0);

      const unpaid = invoicesData
        .filter((d: any) => d.status !== 'paid' && d.status !== 'cancelled' && d.status !== 'draft')
        .reduce((sum: number, d: any) => sum + ((d.total_ttc || 0) - (d.amount_paid || 0)), 0);

      const activeLinks = linksData.filter((l: any) => !l.is_revoked);
      const pendingSig = linksData.filter((l: any) => l.contract_status === 'pending_signature');

      setStats({
        totalSessions: sessionsData.length,
        totalClients: clientsData.length,
        upcomingSessions: upcoming.length,
        activeLinks: activeLinks.length,
        pendingSignatures: pendingSig.length,
        pendingTasks: tasksData.length,
        unreadNotifications: notifData?.count || 0,
        revenue,
        unpaidInvoices: unpaid,
      });

      setUpcomingList(upcoming.slice(0, 5));
      setRecentClients(clientsData.slice(0, 5));
      setRecentLinks(activeLinks.slice(0, 4));
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'Photographe';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-vibrant border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1400px]">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display uppercase tracking-tighter text-black">
          {getGreeting()}, <span className="text-vibrant italic">{firstName}</span>
        </h1>
        <p className="text-zinc-500 text-sm font-medium mt-1">
          Voici un aperçu de votre activité
        </p>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Séances', value: stats.totalSessions, icon: Camera, color: 'vibrant', route: '/dashboard/calendar' },
          { label: 'Clients', value: stats.totalClients, icon: Users, color: 'emerald', route: '/dashboard/espace-client' },
          { label: 'À venir', value: stats.upcomingSessions, icon: Calendar, color: 'amber', route: '/dashboard/calendar' },
          { label: 'Liens actifs', value: stats.activeLinks, icon: Link2, color: 'blue', route: '/dashboard/espace-client' },
          { label: 'À signer', value: stats.pendingSignatures, icon: FileText, color: 'orange', route: '/dashboard/espace-client' },
          { label: 'Tâches', value: stats.pendingTasks, icon: CheckSquare, color: 'purple', route: '/dashboard/tasks' },
        ].map((stat) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            vibrant: 'bg-vibrant/10 text-vibrant group-hover:bg-vibrant group-hover:text-white',
            emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white',
            amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white',
            blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white',
            orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white',
            purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white',
          };
          return (
            <div
              key={stat.label}
              onClick={() => navigate(stat.route)}
              className="bg-white p-5 rounded-[20px] border border-zinc-100 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className={`p-2.5 rounded-xl w-fit mb-3 transition-colors ${colorMap[stat.color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-display text-black">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Finance Banner + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div
          onClick={() => navigate('/dashboard/finance')}
          className="lg:col-span-2 bg-vibrant rounded-[24px] p-6 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-vibrant/20 transition-all"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-20 h-20" />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Chiffre d'affaires</p>
              <p className="text-3xl font-display">{formatCurrency(stats.revenue)}</p>
            </div>
            {stats.unpaidInvoices > 0 && (
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">En attente</p>
                <p className="text-lg font-bold">{formatCurrency(stats.unpaidInvoices)}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 text-white/70 text-sm group-hover:text-white transition-colors">
            <Wallet className="w-4 h-4" />
            <span>Voir les finances</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => navigate('/dashboard/notifications')}
          className="bg-white rounded-[24px] p-6 border border-zinc-100 cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
            </div>
            {stats.unreadNotifications > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {stats.unreadNotifications}
              </span>
            )}
          </div>
          <p className="text-2xl font-display text-black">{stats.unreadNotifications}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">Notifications</p>
          <p className="text-sm text-zinc-500 mt-2">
            {stats.unreadNotifications > 0
              ? `${stats.unreadNotifications} non lue${stats.unreadNotifications > 1 ? 's' : ''}`
              : 'Tout est à jour'}
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-white rounded-[24px] border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="font-bold text-lg">Prochaines séances</h2>
            <button
              onClick={() => navigate('/dashboard/calendar')}
              className="text-[10px] font-bold uppercase tracking-widest text-vibrant flex items-center gap-1 hover:translate-x-0.5 transition-transform"
            >
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {upcomingList.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Aucune séance à venir</p>
              <button
                onClick={() => navigate('/dashboard/calendar')}
                className="mt-3 text-sm text-vibrant font-medium hover:underline"
              >
                Planifier une séance
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {upcomingList.map((session: any) => (
                <div key={session.id} className="px-6 py-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-vibrant/10 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-vibrant uppercase">
                        {new Date(session.date).toLocaleDateString('fr-FR', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-vibrant">
                        {new Date(session.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.title}</p>
                      <p className="text-xs text-zinc-400">
                        {formatTime(session.date)}
                        {session.location ? ` · ${session.location}` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      session.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                      session.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {session.status === 'confirmed' ? 'Confirmé' : session.status === 'pending' ? 'En attente' : session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Workflows */}
        <div className="bg-white rounded-[24px] border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="font-bold text-lg">Espace client</h2>
            <button
              onClick={() => navigate('/dashboard/espace-client')}
              className="text-[10px] font-bold uppercase tracking-widest text-vibrant flex items-center gap-1 hover:translate-x-0.5 transition-transform"
            >
              Gérer <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentLinks.length === 0 ? (
            <div className="p-8 text-center">
              <Link2 className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Aucun lien client actif</p>
              <button
                onClick={() => navigate('/dashboard/espace-client')}
                className="mt-3 text-sm text-vibrant font-medium hover:underline"
              >
                Créer un lien
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentLinks.map((link: any) => {
                const getState = () => {
                  if (link.contract_status === 'signed') return { label: 'Signé', cls: 'bg-green-50 text-green-600' };
                  if (link.contract_status === 'pending_signature') return { label: 'À signer', cls: 'bg-orange-50 text-orange-600' };
                  if (link.questionnaire_status === 'validated') return { label: 'Questionnaire OK', cls: 'bg-blue-50 text-blue-600' };
                  if (link.questionnaire_status === 'draft') return { label: 'En cours', cls: 'bg-yellow-50 text-yellow-600' };
                  return { label: 'En attente', cls: 'bg-zinc-100 text-zinc-500' };
                };
                const state = getState();
                return (
                  <div key={link.id} className="px-6 py-4 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-vibrant/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-vibrant font-bold">
                          {link.client_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{link.client_name}</p>
                        <p className="text-xs text-zinc-400">{formatDate(link.created_at)}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${state.cls}`}>
                        {state.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Nouvelle séance', icon: Camera, route: '/dashboard/calendar', color: 'bg-vibrant text-white' },
          { label: 'Nouveau client', icon: Users, route: '/dashboard/espace-client', color: 'bg-emerald-500 text-white' },
          { label: 'Créer un devis', icon: FileText, route: '/dashboard/finance', color: 'bg-amber-500 text-white' },
          { label: 'Voir les tâches', icon: CheckSquare, route: '/dashboard/tasks', color: 'bg-purple-500 text-white' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className={`${action.color} p-4 rounded-2xl flex items-center gap-3 hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardHome;
