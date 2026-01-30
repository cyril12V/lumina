import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  X,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { calendar, auth } from '../../lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  all_day: number;
  location?: string;
  event_type: string;
  user_name?: string;
  is_visible_to_clients: number;
  color?: string;
}

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

type CalendarMode = 'public' | 'internal';

const CalendarView: React.FC = () => {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('internal');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [publicDate, setPublicDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    all_day: false,
    location: '',
    event_type: 'shooting',
    assigned_user_id: '',
    is_visible_to_clients: true,
    color: '#E63946'
  });

  const user = auth.getUser();

  const eventTypes = [
    { value: 'shooting', label: 'Séance photo', color: '#E63946' },
    { value: 'meeting', label: 'Rendez-vous', color: '#457B9D' },
    { value: 'editing', label: 'Retouche', color: '#2A9D8F' },
    { value: 'delivery', label: 'Livraison', color: '#F4A261' },
    { value: 'personal', label: 'Personnel', color: '#6C757D' },
    { value: 'busy', label: 'Occupé', color: '#495057' }
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const start = new Date(currentDate);
      start.setDate(1);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(currentDate);
      end.setMonth(end.getMonth() + 1, 0);
      end.setDate(end.getDate() + (7 - end.getDay()) % 7);

      const [eventsData, availabilityData] = await Promise.all([
        calendar.getEvents(start.toISOString(), end.toISOString(), user?.id),
        calendar.getAvailability(user?.id)
      ]);

      setEvents(eventsData || []);
      setAvailability(availabilityData || []);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (date: Date, setDate: (d: Date) => void, direction: number) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + direction);
    setDate(newDate);
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Monday-based week
    const startDay = (firstDay.getDay() + 6) % 7;
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_datetime);
      const eventEnd = new Date(event.end_datetime);
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      return eventStart <= dateEnd && eventEnd >= dateStart;
    });
  };

  const getPublicEventsForDate = (date: Date) => {
    return getEventsForDate(date).filter(e => e.is_visible_to_clients);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date, refDate: Date) => {
    return date.getMonth() === refDate.getMonth();
  };

  const handleCreateEvent = async () => {
    try {
      await calendar.createEvent({
        ...newEvent,
        is_visible_to_clients: newEvent.is_visible_to_clients ? 1 : 0
      });
      setShowEventModal(false);
      setNewEvent({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        all_day: false,
        location: '',
        event_type: 'shooting',
        assigned_user_id: '',
        is_visible_to_clients: true,
        color: '#E63946'
      });
      loadData();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    try {
      await calendar.deleteEvent(eventId);
      setSelectedEvent(null);
      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const openNewEventModal = (date?: Date) => {
    const startDate = date || new Date();
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    setNewEvent({
      ...newEvent,
      start_datetime: startDate.toISOString().slice(0, 16),
      end_datetime: endDate.toISOString().slice(0, 16)
    });
    setShowEventModal(true);
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/public/calendar/${user?.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Compact mini calendar for public view
  const renderMiniCalendar = (
    date: Date,
    setDate: (d: Date) => void,
    isPublic: boolean
  ) => {
    const days = getMonthDays(date);
    const accentColor = isPublic ? '#22C55E' : '#2D3FE7';

    return (
      <div className={`bg-white rounded-2xl border ${isPublic ? 'border-green-200' : 'border-zinc-200'} overflow-hidden h-full flex flex-col`}>
        {/* Calendar header with label */}
        <div className={`px-4 py-3 border-b ${isPublic ? 'border-green-100 bg-green-50/50' : 'border-zinc-100 bg-zinc-50/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="w-4 h-4 text-green-600" />
              ) : (
                <Shield className="w-4 h-4 text-[#2D3FE7]" />
              )}
              <span className={`text-xs font-bold uppercase tracking-wider ${isPublic ? 'text-green-700' : 'text-[#2D3FE7]'}`}>
                {isPublic ? 'Calendrier public' : 'Calendrier interne'}
              </span>
            </div>
            {isPublic && (
              <button
                onClick={copyPublicLink}
                className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 bg-green-100 px-2 py-1 rounded-lg font-medium"
                title="Copier le lien public"
              >
                {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedLink ? 'Copié !' : 'Lien'}
              </button>
            )}
          </div>
          <p className={`text-[11px] ${isPublic ? 'text-green-600' : 'text-zinc-500'}`}>
            {isPublic
              ? 'Visible par vos clients — montre vos créneaux occupés / libres'
              : 'Privé — tous vos événements, notes et détails personnels'
            }
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => navigateMonth(date, setDate, -1)}
            className="p-1.5 hover:bg-zinc-100 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-500" />
          </button>
          <span className="text-sm font-bold text-zinc-900">
            {months[date.getMonth()]} {date.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth(date, setDate, 1)}
            className="p-1.5 hover:bg-zinc-100 rounded-lg"
          >
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-zinc-400 uppercase py-1">
              {day.charAt(0)}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 px-2 pb-2 flex-1">
          {days.map((day, index) => {
            const dayEvents = isPublic ? getPublicEventsForDate(day) : getEventsForDate(day);
            const isCurrent = isCurrentMonth(day, date);
            const isTodayDate = isToday(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={index}
                onClick={() => {
                  if (!isPublic) {
                    setSelectedDayEvents(day);
                  }
                }}
                className={`relative flex flex-col items-center py-1 cursor-pointer rounded-lg transition-colors ${
                  !isCurrent ? 'opacity-30' : ''
                } ${!isPublic ? 'hover:bg-zinc-50' : ''}`}
              >
                <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium ${
                  isTodayDate
                    ? `text-white`
                    : isCurrent
                      ? 'text-zinc-800'
                      : 'text-zinc-400'
                }`}
                style={isTodayDate ? { backgroundColor: accentColor } : undefined}
                >
                  {day.getDate()}
                </div>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: isPublic ? '#EF4444' : (ev.color || '#E63946') }}
                      />
                    ))}
                  </div>
                )}
                {isPublic && hasEvents && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend / info footer */}
        {isPublic ? (
          <div className="px-4 py-3 border-t border-green-100 bg-green-50/30">
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-zinc-600">Créneau occupé</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-zinc-600">Disponible</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1.5">
              Les clients ne voient pas les détails, uniquement "Occupé" ou "Disponible"
            </p>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
            <div className="flex flex-wrap gap-2 text-[11px]">
              {eventTypes.map(et => (
                <div key={et.value} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: et.color }}></div>
                  <span className="text-zinc-500">{et.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to show day events on click
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const setSelectedDayEvents = (day: Date) => {
    setSelectedDay(day);
  };

  // Internal detailed day panel
  const renderDayPanel = () => {
    const day = selectedDay || new Date();
    const dayEvents = getEventsForDate(day);

    return (
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50">
          <h3 className="font-bold text-zinc-900">
            {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {dayEvents.length === 0 ? 'Aucun événement' : `${dayEvents.length} événement(s)`}
          </p>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Journée libre</p>
              <button
                onClick={() => openNewEventModal(day)}
                className="mt-3 text-xs text-[#2D3FE7] hover:text-[#2D3FE7]/80 font-medium flex items-center gap-1 mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un événement
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dayEvents.map(event => {
                const eventType = eventTypes.find(t => t.value === event.event_type);
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-3 rounded-xl cursor-pointer hover:shadow-md transition-all border border-zinc-100"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: event.color || '#E63946'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-zinc-900">{event.title}</span>
                      {event.is_visible_to_clients ? (
                        <span title="Visible clients"><Eye className="w-3.5 h-3.5 text-green-500" /></span>
                      ) : (
                        <span title="Privé"><EyeOff className="w-3.5 h-3.5 text-zinc-300" /></span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                        backgroundColor: `${event.color || '#E63946'}15`,
                        color: event.color || '#E63946'
                      }}>
                        {eventType?.label}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => openNewEventModal(day)}
                className="w-full py-2 text-xs text-[#2D3FE7] hover:bg-[#2D3FE7]/5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un événement
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Public day panel (what clients see)
  const renderPublicDayPanel = () => {
    const day = selectedDay || new Date();
    const publicEvents = getPublicEventsForDate(day);

    return (
      <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-green-100 bg-green-50/50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-600" />
            <h3 className="font-bold text-zinc-900 text-sm">
              Aperçu client — {day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </h3>
          </div>
          <p className="text-[11px] text-green-600 mt-0.5">
            Voici ce que vos clients verront
          </p>
        </div>

        <div className="p-4 max-h-[300px] overflow-y-auto">
          {publicEvents.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-700">Créneau disponible</p>
              <p className="text-xs text-zinc-400 mt-1">Le client peut réserver ce jour</p>
            </div>
          ) : (
            <div className="space-y-2">
              {publicEvents.map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-red-50 border border-red-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <span className="font-medium text-sm text-red-700">Occupé</span>
                  </div>
                  <p className="text-xs text-red-500 mt-1 ml-4.5">
                    Créneau non disponible
                  </p>
                </div>
              ))}
              {publicEvents.length < getEventsForDate(day).length && (
                <div className="bg-zinc-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-zinc-400">
                    + {getEventsForDate(day).length - publicEvents.length} événement(s) privé(s) non affichés
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Event Modal
  const renderEventModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Nouvel événement</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Ajoutez un événement à votre calendrier</p>
          </div>
          <button
            onClick={() => setShowEventModal(false)}
            className="p-2 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Titre *</label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              placeholder="Ex: Séance photo mariage Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Type d'événement</label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setNewEvent({
                    ...newEvent,
                    event_type: type.value,
                    color: type.color
                  })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                    newEvent.event_type === type.value
                      ? 'border-current'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                  style={newEvent.event_type === type.value ? { borderColor: type.color, color: type.color, backgroundColor: `${type.color}10` } : undefined}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                  <span className={newEvent.event_type === type.value ? '' : 'text-zinc-700'}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Début *</label>
              <input
                type="datetime-local"
                value={newEvent.start_datetime}
                onChange={(e) => setNewEvent({ ...newEvent, start_datetime: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Fin *</label>
              <input
                type="datetime-local"
                value={newEvent.end_datetime}
                onChange={(e) => setNewEvent({ ...newEvent, end_datetime: e.target.value })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Lieu</label>
            <input
              type="text"
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              placeholder="Ex: Studio, extérieur, domicile client..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              placeholder="Notes supplémentaires..."
            />
          </div>

          <div className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
            newEvent.is_visible_to_clients ? 'border-green-300 bg-green-50' : 'border-zinc-200 bg-zinc-50'
          }`}>
            <input
              type="checkbox"
              id="is_visible_to_clients"
              checked={newEvent.is_visible_to_clients}
              onChange={(e) => setNewEvent({ ...newEvent, is_visible_to_clients: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="is_visible_to_clients" className="cursor-pointer">
              <div className="flex items-center gap-1.5">
                {newEvent.is_visible_to_clients ? (
                  <Globe className="w-4 h-4 text-green-600" />
                ) : (
                  <Shield className="w-4 h-4 text-zinc-500" />
                )}
                <span className="text-sm font-medium text-zinc-800">
                  {newEvent.is_visible_to_clients ? 'Visible sur le calendrier public' : 'Événement privé'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {newEvent.is_visible_to_clients
                  ? 'Les clients verront ce créneau comme "Occupé" (sans détails)'
                  : 'Seul vous pouvez voir cet événement'
                }
              </p>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
          <button
            onClick={() => setShowEventModal(false)}
            className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleCreateEvent}
            disabled={!newEvent.title || !newEvent.start_datetime || !newEvent.end_datetime}
            className="px-6 py-2.5 bg-[#2D3FE7] text-white rounded-xl font-bold hover:bg-[#2D3FE7]/90 disabled:opacity-50 transition-all"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );

  // Event Details Modal
  const renderEventDetailsModal = () => {
    if (!selectedEvent) return null;
    const eventType = eventTypes.find(t => t.value === selectedEvent.event_type);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full">
          <div
            className="p-6 rounded-t-2xl"
            style={{ backgroundColor: `${selectedEvent.color || '#E63946'}10` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedEvent.color || '#E63946' }}
                />
                <span className="text-sm font-medium text-zinc-600">
                  {eventType?.label || selectedEvent.event_type}
                </span>
                {selectedEvent.is_visible_to_clients ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" /> Privé
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-white/50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold mt-3">{selectedEvent.title}</h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-zinc-700">
              <Clock className="w-5 h-5 text-zinc-400" />
              <div>
                <div className="font-medium">
                  {new Date(selectedEvent.start_datetime).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </div>
                <div className="text-sm text-zinc-500">
                  {formatTime(selectedEvent.start_datetime)} - {formatTime(selectedEvent.end_datetime)}
                </div>
              </div>
            </div>

            {selectedEvent.location && (
              <div className="flex items-center gap-3 text-zinc-700">
                <MapPin className="w-5 h-5 text-zinc-400" />
                <span>{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.user_name && (
              <div className="flex items-center gap-3 text-zinc-700">
                <User className="w-5 h-5 text-zinc-400" />
                <span>{selectedEvent.user_name}</span>
              </div>
            )}

            {selectedEvent.description && (
              <div className="pt-3 border-t border-zinc-200">
                <p className="text-sm text-zinc-600">{selectedEvent.description}</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-zinc-200 flex justify-between">
            <button
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium"
            >
              Supprimer
            </button>
            <button
              onClick={() => setSelectedEvent(null)}
              className="px-6 py-2 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D3FE7]"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display tracking-tight uppercase text-black">
            Calendrier
          </h1>
          <p className="text-zinc-500 mt-1">Gérez vos rendez-vous et partagez vos disponibilités</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setPublicDate(new Date());
            }}
            className="px-4 py-3 text-sm font-medium text-[#2D3FE7] hover:bg-[#2D3FE7]/5 rounded-xl border border-zinc-200"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => openNewEventModal()}
            className="flex items-center gap-2 bg-[#2D3FE7] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2D3FE7]/90 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouvel événement
          </button>
        </div>
      </div>

      {/* Explanation bar */}
      <div className="bg-gradient-to-r from-[#2D3FE7]/5 via-transparent to-green-500/5 rounded-2xl p-4 mb-6 border border-zinc-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-4 h-4 text-[#2D3FE7]" />
            <span className="text-xs text-zinc-700">
              <strong className="text-[#2D3FE7]">Interne</strong> — Votre agenda complet avec tous les détails. Visible uniquement par vous.
            </span>
          </div>
          <div className="w-px h-6 bg-zinc-200"></div>
          <div className="flex items-center gap-2 flex-1">
            <Globe className="w-4 h-4 text-green-600" />
            <span className="text-xs text-zinc-700">
              <strong className="text-green-600">Public</strong> — Ce que vos clients voient. Les créneaux marqués "visibles" apparaissent comme "Occupé".
            </span>
          </div>
        </div>
      </div>

      {/* Two calendars side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Internal Calendar */}
        <div>
          {renderMiniCalendar(currentDate, setCurrentDate, false)}
        </div>

        {/* Public Calendar */}
        <div>
          {renderMiniCalendar(publicDate, setPublicDate, true)}
        </div>
      </div>

      {/* Day detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internal day detail */}
        <div>
          {renderDayPanel()}
        </div>

        {/* Public day preview */}
        <div>
          {renderPublicDayPanel()}
        </div>
      </div>

      {/* Modals */}
      {showEventModal && renderEventModal()}
      {selectedEvent && renderEventDetailsModal()}
    </div>
  );
};

export default CalendarView;
