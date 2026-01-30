import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Play,
  Pause,
  MoreVertical,
  Workflow,
  Filter,
  Zap,
  Settings,
  ArrowRight,
  ArrowDown,
  Trash2,
  Info,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Target,
  Sparkles,
  GripVertical,
  BookOpen
} from 'lucide-react';
import { tasks as tasksApi, team, auth, sessions as sessionsApi } from '../../lib/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  assigned_to_name?: string;
  deadline?: string;
  estimated_duration_minutes?: number;
  session_id?: string;
  session_title?: string;
  created_at: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  trigger_event: string;
  steps?: any[];
}

interface TeamMember {
  id: string;
  user_id: string;
  full_name?: string;
  email: string;
  role: string;
}

const TasksManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'workflows'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [filter, setFilter] = useState({
    status: '',
    assigned_to: '',
    priority: ''
  });

  const user = auth.getUser();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    deadline: '',
    estimated_duration_minutes: 60,
    session_id: ''
  });

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger_event: 'manual',
    steps: [{ name: '', assignee_role: 'photographer', duration_minutes: 60, delay_days: 0 }]
  });

  const priorities = [
    { value: 'low', label: 'Basse', color: '#6C757D', bg: '#F3F4F6' },
    { value: 'medium', label: 'Moyenne', color: '#F4A261', bg: '#FFF7ED' },
    { value: 'high', label: 'Haute', color: '#E63946', bg: '#FEF2F2' },
    { value: 'urgent', label: 'Urgente', color: '#DC2626', bg: '#FEE2E2' }
  ];

  const statuses = [
    { value: 'pending', label: 'En attente', icon: Circle, color: '#9CA3AF', desc: 'La tâche est créée mais pas encore commencée' },
    { value: 'in_progress', label: 'En cours', icon: Play, color: '#3B82F6', desc: 'Vous travaillez activement dessus' },
    { value: 'completed', label: 'Terminée', icon: CheckCircle2, color: '#22C55E', desc: 'Le travail est fini' },
    { value: 'cancelled', label: 'Annulée', icon: X, color: '#EF4444', desc: 'La tâche n\'est plus nécessaire' }
  ];

  const triggerEvents = [
    { value: 'manual', label: 'Déclenchement manuel', icon: '👆', desc: 'Vous lancez le workflow manuellement quand vous voulez' },
    { value: 'session_created', label: 'Nouvelle séance créée', icon: '📸', desc: 'Se déclenche automatiquement dès qu\'une nouvelle séance est ajoutée' },
    { value: 'session_completed', label: 'Séance terminée', icon: '✅', desc: 'Se lance quand vous marquez une séance comme terminée' },
    { value: 'contract_signed', label: 'Contrat signé', icon: '📝', desc: 'Se lance dès qu\'un client signe son contrat' },
    { value: 'payment_received', label: 'Paiement reçu', icon: '💰', desc: 'Se déclenche à la réception d\'un paiement' },
    { value: 'gallery_delivered', label: 'Galerie livrée', icon: '🖼️', desc: 'Se lance quand vous envoyez la galerie au client' }
  ];

  const roles = [
    { value: 'owner', label: 'Propriétaire' },
    { value: 'admin', label: 'Admin' },
    { value: 'photographer', label: 'Photographe' },
    { value: 'retoucher', label: 'Retoucheur' },
    { value: 'assistant', label: 'Assistant' }
  ];

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, workflowsData, teamData, sessionsData] = await Promise.all([
        tasksApi.list(filter),
        tasksApi.getWorkflowTemplates(),
        team.getMyTeam(),
        sessionsApi.list(user?.id)
      ]);

      setTasks(tasksData || []);
      setWorkflows(workflowsData || []);
      setTeamMembers(teamData?.members || []);
      setSessions(sessionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      await tasksApi.create({
        ...newTask,
        team_id: user?.team_id,
        created_by: user?.id
      });
      setShowTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: '',
        deadline: '',
        estimated_duration_minutes: 60,
        session_id: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await tasksApi.update(taskId, { status });
      loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await tasksApi.delete(taskId);
      setSelectedTask(null);
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      await tasksApi.createWorkflowTemplate({
        ...newWorkflow,
        team_id: user?.team_id
      });
      setShowWorkflowModal(false);
      setNewWorkflow({
        name: '',
        description: '',
        trigger_event: 'manual',
        steps: [{ name: '', assignee_role: 'photographer', duration_minutes: 60, delay_days: 0 }]
      });
      loadData();
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleExecuteWorkflow = async (templateId: string) => {
    try {
      await tasksApi.executeWorkflow(templateId, {});
      loadData();
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  const addWorkflowStep = () => {
    setNewWorkflow({
      ...newWorkflow,
      steps: [
        ...newWorkflow.steps,
        { name: '', assignee_role: 'photographer', duration_minutes: 60, delay_days: 0 }
      ]
    });
  };

  const updateWorkflowStep = (index: number, field: string, value: any) => {
    const steps = [...newWorkflow.steps];
    steps[index] = { ...steps[index], [field]: value };
    setNewWorkflow({ ...newWorkflow, steps });
  };

  const removeWorkflowStep = (index: number) => {
    setNewWorkflow({
      ...newWorkflow,
      steps: newWorkflow.steps.filter((_, i) => i !== index)
    });
  };

  const getPriorityInfo = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[0];
  };

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Stats
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' && t.status !== 'cancelled').length
  };

  // Guide modal
  const renderGuide = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-[#2D3FE7]/5 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D3FE7]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#2D3FE7]" />
            </div>
            <h3 className="text-lg font-bold">Comment utiliser les Tâches & Workflows ?</h3>
          </div>
          <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-zinc-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* TASKS SECTION */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-5 h-5 text-[#2D3FE7]" />
              <h4 className="text-base font-bold text-zinc-900">Les Tâches</h4>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-zinc-700">
                Les tâches sont votre <strong>to-do list professionnelle</strong>. Chaque tâche représente un travail à faire : retoucher des photos, envoyer une galerie, préparer du matériel, etc.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-zinc-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="text-xs font-bold text-zinc-700">Priorité</span>
                  </div>
                  <p className="text-xs text-zinc-500">Classez vos tâches par urgence : basse, moyenne, haute ou urgente</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-zinc-200">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-700">Assignation</span>
                  </div>
                  <p className="text-xs text-zinc-500">Assignez une tâche à un membre de votre équipe (retoucheur, assistant...)</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-zinc-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-bold text-zinc-700">Date limite</span>
                  </div>
                  <p className="text-xs text-zinc-500">Fixez une deadline. Les tâches en retard apparaissent en rouge</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-zinc-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-3 h-3 text-purple-500" />
                    <span className="text-xs font-bold text-zinc-700">Séance liée</span>
                  </div>
                  <p className="text-xs text-zinc-500">Reliez une tâche à une séance photo pour mieux vous organiser</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Astuce :</strong> Cliquez sur l'icône ronde à gauche d'une tâche pour faire avancer son statut :
                  En attente → En cours → Terminée
                </p>
              </div>
            </div>
          </div>

          {/* WORKFLOWS SECTION */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-purple-600" />
              <h4 className="text-base font-bold text-zinc-900">Les Workflows (automatisations)</h4>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-zinc-700">
                Un workflow est un <strong>enchaînement d'étapes automatiques</strong>. Au lieu de créer les mêmes tâches à chaque séance, vous créez un modèle une seule fois, et il génère toutes les tâches pour vous.
              </p>

              <div className="bg-white rounded-lg p-4 border border-zinc-200">
                <p className="text-xs font-bold text-zinc-700 mb-3">Exemple concret :</p>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">1</div>
                    <div className="w-0.5 h-6 bg-purple-200"></div>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">2</div>
                    <div className="w-0.5 h-6 bg-purple-200"></div>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">3</div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Tri et sélection des photos</p>
                      <p className="text-xs text-zinc-500">Photographe - J+0 - 2h estimées</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Retouche des photos sélectionnées</p>
                      <p className="text-xs text-zinc-500">Retoucheur - J+2 - 4h estimées</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Envoi de la galerie au client</p>
                      <p className="text-xs text-zinc-500">Photographe - J+7 - 30min estimées</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="text-xs text-purple-800">
                  <strong>Déclencheur :</strong> Choisissez quand le workflow se lance. Par exemple, "Séance terminée" créera automatiquement toutes les tâches de retouche dès qu'une séance est marquée comme terminée. "Manuel" = vous le lancez vous-même quand vous voulez.
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="text-xs text-purple-800">
                  <strong>J+ (jours) :</strong> Le délai avant que la tâche soit créée après le déclencheur. J+0 = immédiat, J+2 = 2 jours après, etc.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200">
          <button
            onClick={() => setShowGuide(false)}
            className="w-full py-3 bg-[#2D3FE7] text-white rounded-xl font-bold hover:bg-[#2D3FE7]/90"
          >
            J'ai compris !
          </button>
        </div>
      </div>
    </div>
  );

  // Tasks tab content
  const renderTasksTab = () => (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-zinc-900">{taskStats.total}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Total</div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-zinc-400">{taskStats.pending}</div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <Circle className="w-3 h-3" /> En attente
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-blue-500">{taskStats.inProgress}</div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <Play className="w-3 h-3 text-blue-500" /> En cours
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="text-2xl font-bold text-green-500">{taskStats.completed}</div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" /> Terminées
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${taskStats.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-200'}`}>
          <div className={`text-2xl font-bold ${taskStats.overdue > 0 ? 'text-red-500' : 'text-zinc-300'}`}>{taskStats.overdue}</div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <AlertCircle className={`w-3 h-3 ${taskStats.overdue > 0 ? 'text-red-500' : ''}`} /> En retard
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-zinc-200">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="text-sm border-none focus:ring-0 bg-transparent pr-6"
          >
            <option value="">Tous les statuts</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-zinc-200">
          <User className="w-4 h-4 text-zinc-400" />
          <select
            value={filter.assigned_to}
            onChange={(e) => setFilter({ ...filter, assigned_to: e.target.value })}
            className="text-sm border-none focus:ring-0 bg-transparent pr-6"
          >
            <option value="">Tous les membres</option>
            {teamMembers.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-zinc-200">
          <AlertCircle className="w-4 h-4 text-zinc-400" />
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className="text-sm border-none focus:ring-0 bg-transparent pr-6"
          >
            <option value="">Toutes les priorités</option>
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {(filter.status || filter.assigned_to || filter.priority) && (
          <button
            onClick={() => setFilter({ status: '', assigned_to: '', priority: '' })}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tasks list */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <ListChecks className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Aucune tâche pour le moment</h3>
            <p className="text-zinc-500 mb-1 text-sm">Les tâches vous aident à suivre votre travail :</p>
            <p className="text-zinc-400 text-sm mb-6">retouche photo, livraison galerie, préparation matériel...</p>
            <button
              onClick={() => setShowTaskModal(true)}
              className="px-6 py-3 bg-[#2D3FE7] text-white rounded-xl font-bold hover:bg-[#2D3FE7]/90 transition-all"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Créer ma première tâche
              </span>
            </button>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <div className="w-5">Statut</div>
              <div className="w-2"></div>
              <div>Tâche</div>
              <div className="hidden md:block">Assigné</div>
              <div className="hidden md:block">Durée</div>
              <div className="hidden md:block">Deadline</div>
              <div className="w-5"></div>
            </div>
            <div className="divide-y divide-zinc-100">
              {tasks.map(task => {
                const statusInfo = getStatusInfo(task.status);
                const priorityInfo = getPriorityInfo(task.priority);
                const StatusIcon = statusInfo.icon;
                const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3.5 hover:bg-zinc-50 cursor-pointer transition-colors ${
                      task.status === 'completed' ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Status toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus = task.status === 'completed' ? 'pending' :
                          task.status === 'pending' ? 'in_progress' : 'completed';
                        handleUpdateTaskStatus(task.id, nextStatus);
                      }}
                      className="flex-shrink-0"
                      title={`Statut : ${statusInfo.label} — Cliquer pour changer`}
                      style={{ color: statusInfo.color }}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </button>

                    {/* Priority indicator */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      title={`Priorité : ${priorityInfo.label}`}
                      style={{ backgroundColor: priorityInfo.color }}
                    />

                    {/* Task info */}
                    <div className="min-w-0">
                      <div className={`font-medium text-sm ${task.status === 'completed' ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                        {task.title}
                      </div>
                      {task.session_title && (
                        <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3" />
                          {task.session_title}
                        </div>
                      )}
                    </div>

                    {/* Assigned to */}
                    <div className="hidden md:block">
                      {task.assigned_to_name ? (
                        <div className="flex items-center gap-1.5" title={task.assigned_to_name}>
                          <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            {task.assigned_to_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-zinc-500 hidden lg:inline">{task.assigned_to_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-300">-</span>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="hidden md:flex items-center gap-1 text-xs text-zinc-500" title="Durée estimée">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(task.estimated_duration_minutes)}
                    </div>

                    {/* Due date */}
                    <div className="hidden md:block">
                      {task.deadline ? (
                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                          isOverdue ? 'bg-red-50 text-red-600 font-medium' : 'text-zinc-500'
                        }`} title={isOverdue ? 'En retard !' : 'Date limite'}>
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(task.deadline)}
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-300">-</span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Workflows tab content
  const renderWorkflowsTab = () => (
    <div className="space-y-6">
      {/* Explanation banner */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Qu'est-ce qu'un workflow ?</h3>
            <p className="text-sm text-zinc-600 mb-3">
              Un workflow est un <strong>modèle de tâches automatiques</strong>. Vous le créez une fois, et il génère automatiquement toutes les tâches nécessaires au bon moment.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-xs bg-white/80 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200">
                📸 Ex: Séance terminée → Tri + Retouche + Envoi galerie
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-white/80 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200">
                📝 Ex: Contrat signé → Préparer matériel + Repérage lieu
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Comment ça fonctionne ?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center mx-auto mb-3">1</div>
            <p className="text-sm font-medium text-zinc-900 mb-1">Créez un workflow</p>
            <p className="text-xs text-zinc-500">Définissez le nom, le déclencheur et les étapes à suivre</p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center mx-auto mb-3">2</div>
            <p className="text-sm font-medium text-zinc-900 mb-1">Choisissez le déclencheur</p>
            <p className="text-xs text-zinc-500">Manuel, après une séance, après signature d'un contrat, etc.</p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center mx-auto mb-3">3</div>
            <p className="text-sm font-medium text-zinc-900 mb-1">Les tâches se créent seules</p>
            <p className="text-xs text-zinc-500">Chaque étape devient une tâche assignée avec deadline automatique</p>
          </div>
        </div>
      </div>

      {/* Workflows list */}
      <div>
        <h4 className="font-bold text-zinc-900 mb-4">
          Mes workflows ({workflows.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map(workflow => {
            const trigger = triggerEvents.find(t => t.value === workflow.trigger_event);
            return (
              <div
                key={workflow.id}
                className="bg-white rounded-2xl border border-zinc-200 p-6 hover:shadow-lg hover:border-purple-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg">
                      {trigger?.icon || '⚡'}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{workflow.name}</h4>
                      <p className="text-xs text-purple-600 font-medium">
                        {trigger?.label}
                      </p>
                    </div>
                  </div>
                </div>

                {workflow.description && (
                  <p className="text-sm text-zinc-500 mb-4">{workflow.description}</p>
                )}

                <div className="flex items-center gap-3 mb-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-lg">
                    <ListChecks className="w-3.5 h-3.5" />
                    {workflow.steps?.length || 0} étape(s)
                  </span>
                  <span className="flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    {workflow.steps?.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) || 0} min au total
                  </span>
                </div>

                {workflow.trigger_event === 'manual' ? (
                  <button
                    onClick={() => handleExecuteWorkflow(workflow.id)}
                    className="w-full py-2.5 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Lancer maintenant
                  </button>
                ) : (
                  <div className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl font-medium flex items-center justify-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4" />
                    Automatique
                  </div>
                )}
              </div>
            );
          })}

          {/* Add workflow card */}
          <button
            onClick={() => setShowWorkflowModal(true)}
            className="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 p-6 hover:border-purple-400 hover:bg-purple-50/50 transition-all flex flex-col items-center justify-center min-h-[220px] group"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-200 group-hover:bg-purple-100 flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-7 h-7 text-zinc-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <span className="font-bold text-zinc-500 group-hover:text-purple-700 transition-colors">Créer un workflow</span>
            <span className="text-xs text-zinc-400 mt-1">Automatisez vos tâches récurrentes</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Task Modal
  const renderTaskModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Nouvelle tâche</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Ajoutez un travail à faire à votre liste</p>
          </div>
          <button
            onClick={() => setShowTaskModal(false)}
            className="p-2 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Titre de la tâche *</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              placeholder="Ex: Retoucher les photos du mariage Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              placeholder="Détails, notes, instructions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Priorité</label>
              <div className="relative">
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent appearance-none"
                >
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
                  style={{ backgroundColor: getPriorityInfo(newTask.priority).color }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Durée estimée</label>
              <select
                value={newTask.estimated_duration_minutes}
                onChange={(e) => setNewTask({ ...newTask, estimated_duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
                <option value={120}>2h</option>
                <option value={240}>4h</option>
                <option value={480}>1 jour</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Assigné à
              <span className="font-normal text-zinc-400 ml-1">(membre de votre équipe)</span>
            </label>
            <select
              value={newTask.assigned_to}
              onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
            >
              <option value="">Moi-même</option>
              {teamMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Date limite
              <span className="font-normal text-zinc-400 ml-1">(optionnel)</span>
            </label>
            <input
              type="datetime-local"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Séance liée
              <span className="font-normal text-zinc-400 ml-1">(optionnel — pour relier la tâche à une séance)</span>
            </label>
            <select
              value={newTask.session_id}
              onChange={(e) => setNewTask({ ...newTask, session_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-[#2D3FE7] focus:border-transparent"
            >
              <option value="">Aucune séance</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
          <button
            onClick={() => setShowTaskModal(false)}
            className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleCreateTask}
            disabled={!newTask.title}
            className="px-6 py-2.5 bg-[#2D3FE7] text-white rounded-xl font-bold hover:bg-[#2D3FE7]/90 disabled:opacity-50 transition-all"
          >
            Créer la tâche
          </button>
        </div>
      </div>
    </div>
  );

  // Workflow Modal
  const renderWorkflowModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Nouveau workflow</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Créez un enchaînement de tâches automatiques</p>
          </div>
          <button
            onClick={() => setShowWorkflowModal(false)}
            className="p-2 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nom du workflow *</label>
            <input
              type="text"
              value={newWorkflow.name}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: Workflow post-séance, Onboarding client..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              value={newWorkflow.description}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="À quoi sert ce workflow ?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Déclencheur
              <span className="font-normal text-zinc-400 ml-1">— quand ce workflow doit-il se lancer ?</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {triggerEvents.map(t => (
                <button
                  key={t.value}
                  onClick={() => setNewWorkflow({ ...newWorkflow, trigger_event: t.value })}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    newWorkflow.trigger_event === t.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-medium text-zinc-900">{t.label}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 ml-7">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Workflow steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Étapes du workflow</label>
                <p className="text-xs text-zinc-400 mt-0.5">Chaque étape deviendra une tâche automatique</p>
              </div>
              <button
                onClick={addWorkflowStep}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-purple-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter une étape
              </button>
            </div>

            <div className="space-y-3">
              {newWorkflow.steps.map((step, index) => (
                <div key={index} className="relative">
                  {index > 0 && (
                    <div className="flex items-center justify-center -mt-1 mb-1">
                      <ArrowDown className="w-4 h-4 text-purple-300" />
                    </div>
                  )}
                  <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-zinc-700">Étape {index + 1}</span>
                      {newWorkflow.steps.length > 1 && (
                        <button
                          onClick={() => removeWorkflowStep(index)}
                          className="ml-auto p-1.5 hover:bg-zinc-200 rounded-lg"
                          title="Supprimer cette étape"
                        >
                          <Trash2 className="w-4 h-4 text-zinc-400" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateWorkflowStep(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Nom de la tâche (ex: Retoucher les photos)"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-zinc-500 mb-1">Assigné au rôle</label>
                          <select
                            value={step.assignee_role}
                            onChange={(e) => updateWorkflowStep(index, 'assignee_role', e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {roles.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-500 mb-1">Durée estimée</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={step.duration_minutes}
                              onChange={(e) => updateWorkflowStep(index, 'duration_minutes', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                              placeholder="60"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">min</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-500 mb-1">Créer à J+</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={step.delay_days}
                              onChange={(e) => updateWorkflowStep(index, 'delay_days', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                              placeholder="0"
                              min={0}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">jours</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
          <button
            onClick={() => setShowWorkflowModal(false)}
            className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleCreateWorkflow}
            disabled={!newWorkflow.name || newWorkflow.steps.some(s => !s.name)}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all"
          >
            Créer le workflow
          </button>
        </div>
      </div>
    </div>
  );

  // Task details modal
  const renderTaskDetailsModal = () => {
    if (!selectedTask) return null;
    const statusInfo = getStatusInfo(selectedTask.status);
    const priorityInfo = getPriorityInfo(selectedTask.priority);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full">
          <div className="p-6 border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: priorityInfo.bg, color: priorityInfo.color }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityInfo.color }} />
                  {priorityInfo.label}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-zinc-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-bold mt-3">{selectedTask.title}</h3>
          </div>

          <div className="p-6 space-y-4">
            {selectedTask.description && (
              <div className="bg-zinc-50 rounded-xl p-4">
                <p className="text-sm text-zinc-600">{selectedTask.description}</p>
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wide font-bold mb-2">Statut</label>
              <div className="flex gap-2">
                {statuses.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, s.value)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedTask.status === s.value
                          ? 'border-current bg-current/10'
                          : 'border-zinc-200 text-zinc-400 hover:border-zinc-300'
                      }`}
                      style={selectedTask.status === s.value ? { color: s.color } : undefined}
                      title={s.desc}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedTask.assigned_to_name && (
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wide font-bold mb-1">Assigné à</label>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold">
                      {selectedTask.assigned_to_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{selectedTask.assigned_to_name}</span>
                  </div>
                </div>
              )}
              {selectedTask.estimated_duration_minutes && (
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wide font-bold mb-1">Durée estimée</label>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    {formatDuration(selectedTask.estimated_duration_minutes)}
                  </p>
                </div>
              )}
            </div>

            {selectedTask.deadline && (
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wide font-bold mb-1">Date limite</label>
                <p className={`text-sm font-medium flex items-center gap-1.5 ${
                  new Date(selectedTask.deadline) < new Date() && selectedTask.status !== 'completed' ? 'text-red-600' : ''
                }`}>
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  {new Date(selectedTask.deadline).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {new Date(selectedTask.deadline) < new Date() && selectedTask.status !== 'completed' && (
                    <span className="text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded">En retard</span>
                  )}
                </p>
              </div>
            )}

            {selectedTask.session_title && (
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wide font-bold mb-1">Séance liée</label>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-zinc-400" />
                  {selectedTask.session_title}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-zinc-200 flex justify-between">
            <button
              onClick={() => handleDeleteTask(selectedTask.id)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <button
              onClick={() => setSelectedTask(null)}
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display tracking-tight uppercase text-black">
            Tâches & Workflows
          </h1>
          <p className="text-zinc-500 mt-1">Organisez votre travail et automatisez les étapes récurrentes</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 px-4 py-3 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Guide
          </button>
          <button
            onClick={() => activeTab === 'tasks' ? setShowTaskModal(true) : setShowWorkflowModal(true)}
            className="flex items-center gap-2 bg-[#2D3FE7] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2D3FE7]/90 transition-all"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'tasks' ? 'Nouvelle tâche' : 'Nouveau workflow'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'tasks'
              ? 'bg-[#2D3FE7] text-white shadow-lg shadow-[#2D3FE7]/20'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Tâches
            {taskStats.total > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'tasks' ? 'bg-white/20' : 'bg-zinc-100'
              }`}>
                {taskStats.total}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'workflows'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Workflows
            {workflows.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'workflows' ? 'bg-white/20' : 'bg-zinc-100'
              }`}>
                {workflows.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tasks' && renderTasksTab()}
      {activeTab === 'workflows' && renderWorkflowsTab()}

      {/* Modals */}
      {showTaskModal && renderTaskModal()}
      {showWorkflowModal && renderWorkflowModal()}
      {selectedTask && renderTaskDetailsModal()}
      {showGuide && renderGuide()}
    </div>
  );
};

export default TasksManager;
