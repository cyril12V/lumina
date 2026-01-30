import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Link2,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Send,
  ChevronRight,
  Image,
  Settings,
  Edit3,
  X,
  GripVertical,
  Save
} from 'lucide-react';
import { espaceClient, clients, auth } from '../../lib/api';
import ClientWorkflow from './ClientWorkflow';
import ContractTemplatesManager from './ContractTemplatesManager';

interface ClientLink {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  token: string;
  expires_at: string | null;
  is_revoked: number;
  created_at: string;
  questionnaire_status: string | null;
  contract_status: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface EventType {
  id: string;
  name: string;
  icon: string;
  is_system: number;
  user_id: string | null;
  sort_order: number;
}

interface ContractTemplate {
  id: string;
  name: string;
  event_type_id: string | null;
  event_type_name: string | null;
  is_system: number;
}

const ICON_OPTIONS = [
  { value: 'heart', label: 'Coeur' },
  { value: 'user', label: 'Portrait' },
  { value: 'briefcase', label: 'Entreprise' },
  { value: 'calendar', label: 'Événement' },
  { value: 'users', label: 'Famille' },
  { value: 'baby', label: 'Naissance' },
  { value: 'home', label: 'Immobilier' },
  { value: 'package', label: 'Produit' },
  { value: 'camera', label: 'Photo' },
  { value: 'star', label: 'Étoile' },
  { value: 'music', label: 'Musique' },
  { value: 'gift', label: 'Cadeau' },
];

const EspaceClientDashboard: React.FC = () => {
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ClientLink | null>(null);
  const [createMode, setCreateMode] = useState<'existing' | 'new'>('new');
  const [createForm, setCreateForm] = useState({
    client_id: '',
    expires_in_days: 365,
    send_email: true,
    template_id: ''
  });
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [creating, setCreating] = useState(false);

  // Views
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);

  // Event types management
  const [showEventTypesPanel, setShowEventTypesPanel] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [newEventType, setNewEventType] = useState({ name: '', icon: 'calendar' });
  const [showNewEventForm, setShowNewEventForm] = useState(false);

  const user = auth.getUser();

  useEffect(() => {
    loadData();
  }, []);

  // Load contract templates when modal opens
  useEffect(() => {
    if (showCreateModal && contractTemplates.length === 0) {
      loadContractTemplates();
    }
  }, [showCreateModal]);

  const loadContractTemplates = async () => {
    try {
      const templates = await espaceClient.listTemplates(user.id);
      setContractTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [linksData, clientsData] = await Promise.all([
        espaceClient.listLinks(user.id),
        clients.list(user.id)
      ]);
      setLinks(linksData);
      setClientsList(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventTypes = async () => {
    try {
      const types = await espaceClient.listEventTypes(user.id);
      setEventTypes(types);
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const openEventTypesPanel = () => {
    loadEventTypes();
    setShowEventTypesPanel(true);
  };

  const createLink = async () => {
    setCreating(true);
    try {
      let clientId = createForm.client_id;

      if (createMode === 'new') {
        if (!newClientForm.name.trim()) {
          alert('Le nom du client est requis');
          setCreating(false);
          return;
        }

        const newClient = await clients.create({
          user_id: user.id,
          name: newClientForm.name.trim(),
          email: newClientForm.email.trim() || undefined,
          phone: newClientForm.phone.trim() || undefined,
          address: newClientForm.address.trim() || undefined
        });
        clientId = newClient.id;
      } else {
        if (!clientId) {
          alert('Veuillez sélectionner un client');
          setCreating(false);
          return;
        }
      }

      await espaceClient.createLink({
        client_id: clientId,
        user_id: user.id,
        expires_in_days: createForm.expires_in_days || undefined,
        send_email: createForm.send_email,
        template_id: createForm.template_id || undefined
      });

      setShowCreateModal(false);
      setCreateForm({ client_id: '', expires_in_days: 365, send_email: true, template_id: '' });
      setNewClientForm({ name: '', email: '', phone: '', address: '' });
      setCreateMode('new');
      loadData();
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer ce lien ?')) return;

    try {
      await espaceClient.revokeLink(linkId, user.id);
      loadData();
    } catch (error) {
      console.error('Error revoking link:', error);
    }
  };

  const handleUpdateEventType = async (et: EventType) => {
    try {
      await espaceClient.updateEventType(et.id, { name: et.name, icon: et.icon });
      setEditingEventType(null);
      loadEventTypes();
    } catch (error) {
      console.error('Error updating event type:', error);
    }
  };

  const handleDeleteEventType = async (id: string) => {
    if (!confirm('Supprimer ce type de projet ? Les questionnaires associés seront également supprimés.')) return;
    try {
      await espaceClient.deleteEventType(id);
      loadEventTypes();
    } catch (error: any) {
      alert(error.message || 'Impossible de supprimer un type système');
    }
  };

  const handleCreateEventType = async () => {
    if (!newEventType.name.trim()) return;
    try {
      await espaceClient.createEventType({
        user_id: user.id,
        name: newEventType.name.trim(),
        icon: newEventType.icon
      });
      setNewEventType({ name: '', icon: 'calendar' });
      setShowNewEventForm(false);
      loadEventTypes();
    } catch (error) {
      console.error('Error creating event type:', error);
    }
  };

  const getWorkflowState = (link: ClientLink) => {
    if (link.contract_status === 'signed') return { label: 'Signé', color: 'green', icon: CheckCircle };
    if (link.contract_status === 'pending_signature') return { label: 'À signer', color: 'orange', icon: FileText };
    if (link.contract_status === 'draft') return { label: 'Contrat en cours', color: 'blue', icon: FileText };
    if (link.questionnaire_status === 'validated') return { label: 'Questionnaire validé', color: 'blue', icon: CheckCircle };
    if (link.questionnaire_status === 'draft') return { label: 'Questionnaire en cours', color: 'yellow', icon: Clock };
    return { label: 'En attente', color: 'gray', icon: Clock };
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/client/${token}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      // Fallback for non-HTTPS
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  if (showTemplatesManager) {
    return (
      <ContractTemplatesManager
        onBack={() => setShowTemplatesManager(false)}
      />
    );
  }

  if (selectedLink) {
    return (
      <ClientWorkflow
        linkId={selectedLink.id}
        onBack={() => {
          setSelectedLink(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-black">Espace Client</h1>
          <p className="text-zinc-500 mt-1">Gérez vos clients, questionnaires et contrats</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplatesManager(true)}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-all"
          >
            <FileText className="w-4 h-4" />
            Modèles de contrat
          </button>
          <button
            onClick={openEventTypesPanel}
            className="flex items-center gap-2 px-5 py-3 border border-zinc-200 rounded-xl font-medium text-zinc-600 hover:bg-zinc-50 transition-all"
          >
            <Settings className="w-4 h-4" />
            Types de projet
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-vibrant text-white px-6 py-3 rounded-xl font-medium hover:bg-vibrant/90 transition-all shadow-lg shadow-vibrant/20"
          >
            <Plus className="w-5 h-5" />
            Nouveau lien client
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-zinc-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-zinc-500 text-sm">Liens actifs</span>
          </div>
          <p className="text-3xl font-bold">{links.filter(l => !l.is_revoked).length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-zinc-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-zinc-500 text-sm">En attente</span>
          </div>
          <p className="text-3xl font-bold">
            {links.filter(l => !l.questionnaire_status || l.questionnaire_status === 'draft').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-zinc-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-zinc-500 text-sm">À signer</span>
          </div>
          <p className="text-3xl font-bold">
            {links.filter(l => l.contract_status === 'pending_signature').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-zinc-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-zinc-500 text-sm">Signés</span>
          </div>
          <p className="text-3xl font-bold">
            {links.filter(l => l.contract_status === 'signed').length}
          </p>
        </div>
      </div>

      {/* Links List */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-lg font-bold">Clients & Workflows</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">Chargement...</div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500">Aucun lien client créé</p>
            <p className="text-sm text-zinc-400 mt-1">Créez un lien pour commencer le workflow</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {links.map((link) => {
              const state = getWorkflowState(link);
              const StateIcon = state.icon;

              return (
                <div
                  key={link.id}
                  className="p-6 hover:bg-zinc-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLink(link)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-vibrant/10 flex items-center justify-center">
                        <span className="text-vibrant font-bold text-lg">
                          {link.client_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-black">{link.client_name}</h3>
                        <p className="text-sm text-zinc-500">{link.client_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                        ${state.color === 'green' ? 'bg-green-50 text-green-600' : ''}
                        ${state.color === 'orange' ? 'bg-orange-50 text-orange-600' : ''}
                        ${state.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                        ${state.color === 'yellow' ? 'bg-yellow-50 text-yellow-600' : ''}
                        ${state.color === 'gray' ? 'bg-zinc-100 text-zinc-500' : ''}
                      `}>
                        <StateIcon className="w-4 h-4" />
                        {state.label}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copyLink(link.token)}
                          className="p-2 text-zinc-400 hover:text-vibrant hover:bg-vibrant/10 rounded-lg transition-colors"
                          title="Copier le lien"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => revokeLink(link.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Révoquer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <ChevronRight className="w-5 h-5 text-zinc-300" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          link.contract_status === 'signed' ? 'bg-green-500 w-full' :
                          link.contract_status === 'pending_signature' ? 'bg-orange-500 w-3/4' :
                          link.contract_status === 'draft' ? 'bg-blue-500 w-1/2' :
                          link.questionnaire_status === 'validated' ? 'bg-blue-500 w-1/2' :
                          link.questionnaire_status === 'draft' ? 'bg-yellow-500 w-1/4' :
                          'bg-zinc-200 w-0'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(link.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-6">Nouveau lien client</h2>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setCreateMode('new')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  createMode === 'new'
                    ? 'bg-vibrant text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Nouveau client
              </button>
              <button
                onClick={() => setCreateMode('existing')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  createMode === 'existing'
                    ? 'bg-vibrant text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Client existant
              </button>
            </div>

            <div className="space-y-4">
              {createMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Nom du client <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newClientForm.name}
                      onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                      placeholder="jean@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={newClientForm.phone}
                        onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Adresse</label>
                      <input
                        type="text"
                        value={newClientForm.address}
                        onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                        className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                        placeholder="123 rue Example, Paris"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Client</label>
                  <select
                    value={createForm.client_id}
                    onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                  >
                    <option value="">Sélectionner un client</option>
                    {clientsList.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {clientsList.length === 0 && (
                    <p className="text-sm text-zinc-400 mt-2">Aucun client existant.</p>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-100 pt-4 mt-4">
                <h3 className="text-sm font-medium text-zinc-700 mb-3">Contrat & Questionnaire</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Modèle de contrat <span className="text-zinc-400 font-normal">(optionnel)</span>
                  </label>
                  <select
                    value={createForm.template_id}
                    onChange={(e) => setCreateForm({ ...createForm, template_id: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant bg-white"
                  >
                    <option value="">Le client choisira le type de projet</option>
                    {contractTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.event_type_name ? `(${template.event_type_name})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-400 mt-1">
                    Le contrat détermine le questionnaire. Les réponses rempliront automatiquement le contrat.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 mt-4">
                <h3 className="text-sm font-medium text-zinc-700 mb-3">Options du lien</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Expiration (jours)</label>
                  <input
                    type="number"
                    value={createForm.expires_in_days}
                    onChange={(e) => setCreateForm({ ...createForm, expires_in_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                    placeholder="365"
                  />
                  <p className="text-xs text-zinc-400 mt-1">Laisser 0 pour pas d'expiration</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.send_email}
                    onChange={(e) => setCreateForm({ ...createForm, send_email: e.target.checked })}
                    className="w-5 h-5 rounded border-zinc-300 text-vibrant focus:ring-vibrant"
                  />
                  <span className="text-sm text-zinc-700">Envoyer le lien par email au client</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateMode('new');
                  setNewClientForm({ name: '', email: '', phone: '', address: '' });
                  setCreateForm({ client_id: '', expires_in_days: 365, send_email: true, template_id: '' });
                }}
                className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createLink}
                disabled={creating || (createMode === 'new' ? !newClientForm.name.trim() : !createForm.client_id)}
                className="flex-1 px-4 py-3 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Créer le lien
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Types Management Panel */}
      {showEventTypesPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Types de projet</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Configurez les types de projet que vos clients voient dans le questionnaire
                </p>
              </div>
              <button
                onClick={() => setShowEventTypesPanel(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {eventTypes.map((et) => (
                  <div key={et.id} className="bg-zinc-50 rounded-xl p-4">
                    {editingEventType?.id === et.id ? (
                      <div className="flex items-center gap-3">
                        <select
                          value={editingEventType.icon}
                          onChange={(e) => setEditingEventType({ ...editingEventType, icon: e.target.value })}
                          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white"
                        >
                          {ICON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editingEventType.name}
                          onChange={(e) => setEditingEventType({ ...editingEventType, name: e.target.value })}
                          className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                        />
                        <button
                          onClick={() => handleUpdateEventType(editingEventType)}
                          className="p-2 bg-vibrant text-white rounded-lg hover:bg-vibrant/90"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingEventType(null)}
                          className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500">
                            <span className="text-xs font-bold uppercase">{et.icon?.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{et.name}</p>
                            <p className="text-xs text-zinc-400">
                              {et.is_system ? 'Type système' : 'Personnalisé'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingEventType({ ...et })}
                            className="p-2 text-zinc-400 hover:text-vibrant hover:bg-vibrant/10 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!et.is_system && (
                            <button
                              onClick={() => handleDeleteEventType(et.id)}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new event type */}
              {showNewEventForm ? (
                <div className="mt-4 bg-vibrant/5 border-2 border-dashed border-vibrant/20 rounded-xl p-4">
                  <h3 className="font-medium text-sm mb-3">Nouveau type de projet</h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={newEventType.icon}
                      onChange={(e) => setNewEventType({ ...newEventType, icon: e.target.value })}
                      className="px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newEventType.name}
                      onChange={(e) => setNewEventType({ ...newEventType, name: e.target.value })}
                      className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                      placeholder="Nom du type de projet"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateEventType}
                      disabled={!newEventType.name.trim()}
                      className="px-4 py-2 bg-vibrant text-white rounded-lg text-sm font-medium hover:bg-vibrant/90 disabled:opacity-50"
                    >
                      Ajouter
                    </button>
                    <button
                      onClick={() => { setShowNewEventForm(false); setNewEventType({ name: '', icon: 'calendar' }); }}
                      className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewEventForm(true)}
                  className="mt-4 w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500 hover:border-vibrant hover:text-vibrant transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un type de projet
                </button>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100">
              <button
                onClick={() => setShowEventTypesPanel(false)}
                className="w-full px-4 py-3 bg-zinc-100 rounded-xl text-zinc-700 font-medium hover:bg-zinc-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EspaceClientDashboard;
