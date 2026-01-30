import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  MessageSquare,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { notifications } from '../../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
  link?: string;
}

const NotificationsPage: React.FC = () => {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notifications.list(filter === 'unread');
      setNotificationsList(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notifications.markAsRead(id);
      setNotificationsList(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notifications.markAllAsRead();
      setNotificationsList(prev =>
        prev.map(n => ({ ...n, is_read: 1 }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notifications.delete(id);
      setNotificationsList(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearRead = async () => {
    if (!confirm('Supprimer toutes les notifications lues ?')) return;
    try {
      await notifications.clearRead();
      setNotificationsList(prev => prev.filter(n => n.is_read === 0));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-5 h-5" />;
      case 'calendar': return <Calendar className="w-5 h-5" />;
      case 'payment': return <Wallet className="w-5 h-5" />;
      case 'team': return <Users className="w-5 h-5" />;
      case 'message': return <MessageSquare className="w-5 h-5" />;
      case 'alert': return <AlertCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-100 text-blue-600';
      case 'calendar': return 'bg-purple-100 text-purple-600';
      case 'payment': return 'bg-green-100 text-green-600';
      case 'team': return 'bg-amber-100 text-amber-600';
      case 'message': return 'bg-pink-100 text-pink-600';
      case 'alert': return 'bg-red-100 text-red-600';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'A l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notificationsList.filter(n => n.is_read === 0).length;

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display uppercase tracking-tighter text-black">
            Notifications
          </h1>
          <p className="text-zinc-500 text-sm">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-600 hover:text-vibrant transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer lu
            </button>
          )}
          <button
            onClick={handleClearRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-600 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer lues
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            filter === 'all'
              ? 'bg-black text-white'
              : 'bg-white border border-zinc-200 text-zinc-500 hover:text-black'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
            filter === 'unread'
              ? 'bg-black text-white'
              : 'bg-white border border-zinc-200 text-zinc-500 hover:text-black'
          }`}
        >
          Non lues
          {unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-vibrant text-white text-[10px] rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-vibrant" />
        </div>
      ) : notificationsList.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-zinc-500">
            {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificationsList.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-2xl border p-4 transition-all ${
                notification.is_read === 0
                  ? 'border-vibrant/30 shadow-sm'
                  : 'border-zinc-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${getIconColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-bold text-sm ${notification.is_read === 0 ? 'text-black' : 'text-zinc-600'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">{notification.message}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {notification.is_read === 0 && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-vibrant hover:underline"
                      >
                        <Check className="w-3 h-3" />
                        Marquer lu
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
