import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  FileText,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Eye,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Code,
  BookOpen,
  Tag,
  Variable,
  Layers
} from 'lucide-react';
import { espaceClient, auth } from '../../lib/api';

interface Template {
  id: string;
  user_id: string | null;
  event_type_id: string | null;
  name: string;
  content: string;
  is_system: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

interface EventType {
  id: string;
  name: string;
  icon: string;
}

interface CustomVariable {
  id: string;
  user_id: string;
  var_key: string;
  label: string;
  default_value: string;
  category: string;
  sort_order: number;
}

// Built-in variables that are always available
const BUILTIN_VARIABLES = [
  { var: '{{photographer_name}}', label: 'Nom / Raison sociale du photographe', category: 'photographe' },
  { var: '{{photographer_address}}', label: 'Adresse complète du photographe', category: 'photographe' },
  { var: '{{photographer_siret}}', label: 'Numéro SIRET', category: 'photographe' },
  { var: '{{photographer_phone}}', label: 'Téléphone du photographe', category: 'photographe' },
  { var: '{{photographer_email}}', label: 'Email du photographe', category: 'photographe' },
  { var: '{{client_name}}', label: 'Nom complet du client', category: 'client' },
  { var: '{{client_email}}', label: 'Email du client', category: 'client' },
  { var: '{{client_address}}', label: 'Adresse complète du client', category: 'client' },
  { var: '{{event_type}}', label: 'Type d\'événement', category: 'prestation' },
  { var: '{{date}}', label: 'Date du jour (génération)', category: 'prestation' },
];

const VARIABLE_CATEGORIES = [
  { key: 'photographe', label: 'Photographe', color: 'blue' },
  { key: 'client', label: 'Client', color: 'green' },
  { key: 'prestation', label: 'Prestation', color: 'purple' },
  { key: 'tarifs', label: 'Tarifs & Paiement', color: 'amber' },
  { key: 'general', label: 'Général', color: 'zinc' },
];

interface ContractTemplatesManagerProps {
  onBack: () => void;
}

const ContractTemplatesManager: React.FC<ContractTemplatesManagerProps> = ({ onBack }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [customVariables, setCustomVariables] = useState<CustomVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [editEventTypeId, setEditEventTypeId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [activeVarCategory, setActiveVarCategory] = useState<string>('all');

  // New template form
  const [newName, setNewName] = useState('');
  const [newEventTypeId, setNewEventTypeId] = useState('');
  const [duplicateFrom, setDuplicateFrom] = useState<string>('');

  // New variable form
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');
  const [newVarDefault, setNewVarDefault] = useState('');
  const [newVarCategory, setNewVarCategory] = useState('general');

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const user = auth.getUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tpls, types, vars] = await Promise.all([
        espaceClient.listTemplates(user.id),
        espaceClient.listEventTypes(user.id),
        espaceClient.listCustomVariables(user.id)
      ]);
      setTemplates(tpls);
      setEventTypes(types);
      setCustomVariables(vars);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setEditContent(t.content);
    setEditName(t.name);
    setEditEventTypeId(t.event_type_id || '');
    setSaved(false);
    setShowPreview(false);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      if (selectedTemplate.is_system) {
        const created = await espaceClient.createTemplate({
          user_id: user.id,
          event_type_id: editEventTypeId || undefined,
          name: editName,
          content: editContent,
          is_default: true
        });
        await loadData();
        selectTemplate(created);
      } else {
        await espaceClient.updateTemplate(selectedTemplate.id, {
          name: editName,
          content: editContent,
          event_type_id: editEventTypeId || null,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        await loadData();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Supprimer ce modèle de contrat ?')) return;
    try {
      await espaceClient.deleteTemplate(id);
      if (selectedTemplate?.id === id) setSelectedTemplate(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Impossible de supprimer un modèle système');
    }
  };

  const createTemplate = async () => {
    if (!newName.trim()) return;
    try {
      let content = '<h2>Objet du contrat</h2>\n<p>Le présent contrat a pour objet de définir les modalités de la prestation photographique entre <strong>{{photographer_name}}</strong> et <strong>{{client_name}}</strong>.</p>\n\n<h2>Prestation</h2>\n<p>Description de la prestation à compléter.</p>\n\n<h2>Tarifs et paiement</h2>\n<p>Le montant total de la prestation s\'élève à {{montant_total}}.</p>\n<p>Acompte : {{montant_acompte}}</p>';

      if (duplicateFrom) {
        const source = templates.find(t => t.id === duplicateFrom);
        if (source) content = source.content;
      }

      const created = await espaceClient.createTemplate({
        user_id: user.id,
        event_type_id: newEventTypeId || undefined,
        name: newName.trim(),
        content,
        is_default: false
      });

      setShowCreateForm(false);
      setNewName('');
      setNewEventTypeId('');
      setDuplicateFrom('');
      await loadData();
      selectTemplate(created);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const createVariable = async () => {
    if (!newVarLabel.trim()) return;
    const key = newVarKey.trim() || newVarLabel.trim().toLowerCase()
      .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i')
      .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    try {
      await espaceClient.createCustomVariable({
        user_id: user.id,
        var_key: key,
        label: newVarLabel.trim(),
        default_value: newVarDefault,
        category: newVarCategory
      });
      setNewVarKey('');
      setNewVarLabel('');
      setNewVarDefault('');
      setNewVarCategory('general');
      setShowAddVariable(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création');
    }
  };

  const deleteVariable = async (id: string) => {
    if (!confirm('Supprimer cette variable ?')) return;
    try {
      await espaceClient.deleteCustomVariable(id);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const insertVariable = (v: string) => {
    if (!editorRef.current) {
      setEditContent(prev => prev + v);
      return;
    }
    const el = editorRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newContent = editContent.substring(0, start) + v + editContent.substring(end);
    setEditContent(newContent);
    setSaved(false);
    // Restore cursor position
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + v.length;
    }, 0);
  };

  const copyVariable = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopiedVar(v);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const getEventTypeName = (id: string | null) => {
    if (!id) return 'Générique';
    const et = eventTypes.find(e => e.id === id);
    return et?.name || 'Inconnu';
  };

  const filteredTemplates = filterEventType === 'all'
    ? templates
    : filterEventType === 'generic'
      ? templates.filter(t => !t.event_type_id)
      : templates.filter(t => t.event_type_id === filterEventType);

  // All variables: builtin + custom
  const allVariables = [
    ...BUILTIN_VARIABLES,
    ...customVariables.map(cv => ({
      var: `{{${cv.var_key}}}`,
      label: cv.label,
      category: cv.category,
      isCustom: true,
      id: cv.id,
      defaultValue: cv.default_value
    }))
  ];

  const filteredVariables = activeVarCategory === 'all'
    ? allVariables
    : allVariables.filter(v => v.category === activeVarCategory);

  const getCategoryColor = (cat: string) => {
    const found = VARIABLE_CATEGORIES.find(c => c.key === cat);
    return found?.color || 'zinc';
  };

  const getPreviewHtml = () => {
    let html = editContent;
    html = html.replace(/\{\{photographer_name\}\}/g, '<span style="color:#2D3FE7;font-weight:bold">Studio Photo Martin</span>');
    html = html.replace(/\{\{photographer_address\}\}/g, '<span style="color:#2D3FE7">12 rue de la Photographie, 75001 Paris</span>');
    html = html.replace(/\{\{photographer_siret\}\}/g, '<span style="color:#2D3FE7">123 456 789 00012</span>');
    html = html.replace(/\{\{photographer_phone\}\}/g, '<span style="color:#2D3FE7">06 12 34 56 78</span>');
    html = html.replace(/\{\{photographer_email\}\}/g, '<span style="color:#2D3FE7">contact@studio-martin.fr</span>');
    html = html.replace(/\{\{client_name\}\}/g, '<span style="color:#059669;font-weight:bold">Marie & Thomas Dupont</span>');
    html = html.replace(/\{\{client_email\}\}/g, '<span style="color:#059669">marie.dupont@email.com</span>');
    html = html.replace(/\{\{client_address\}\}/g, '<span style="color:#059669">45 avenue des Champs, 75008 Paris</span>');
    html = html.replace(/\{\{event_type\}\}/g, '<span style="color:#7C3AED;font-weight:bold">Mariage</span>');
    html = html.replace(/\{\{date\}\}/g, '<span style="color:#7C3AED">' + new Date().toLocaleDateString('fr-FR') + '</span>');
    // Replace custom variables with their default values
    for (const cv of customVariables) {
      const regex = new RegExp(`\\{\\{${cv.var_key}\\}\\}`, 'g');
      const display = cv.default_value || `[${cv.label}]`;
      html = html.replace(regex, `<span style="color:#D97706;font-weight:bold">${display}</span>`);
    }
    // Highlight any remaining unresolved variables
    html = html.replace(/\{\{([^}]+)\}\}/g, '<span style="background:#FEF3C7;color:#92400E;padding:0 4px;border-radius:3px;font-family:monospace;font-size:0.85em">{{$1}}</span>');
    return html;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Modèles de contrat</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-zinc-200 border-t-vibrant rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-black">Modèles de contrat</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Personnalisez vos contrats et ajoutez vos propres variables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddVariable(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all"
          >
            <Tag className="w-4 h-4" />
            Nouvelle variable
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-vibrant text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-vibrant/90 transition-all shadow-lg shadow-vibrant/20"
          >
            <Plus className="w-4 h-4" />
            Nouveau modèle
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Template list */}
        <div className="w-80 bg-white border-r border-zinc-200 flex flex-col flex-shrink-0">
          {/* Filter */}
          <div className="p-4 border-b border-zinc-100">
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vibrant/20"
            >
              <option value="all">Tous les types</option>
              <option value="generic">Générique</option>
              {eventTypes.map(et => (
                <option key={et.id} value={et.id}>{et.name}</option>
              ))}
            </select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-sm">
                Aucun modèle trouvé
              </div>
            ) : (
              filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`w-full text-left p-4 border-b border-zinc-50 transition-all hover:bg-zinc-50 ${
                    selectedTemplate?.id === t.id ? 'bg-vibrant/5 border-l-2 border-l-vibrant' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${
                        selectedTemplate?.id === t.id ? 'text-vibrant' : 'text-zinc-800'
                      }`}>
                        {t.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-zinc-400">
                          {getEventTypeName(t.event_type_id)}
                        </span>
                        {t.is_system ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">
                            Système
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-vibrant/10 text-vibrant rounded-full">
                            Personnalisé
                          </span>
                        )}
                        {t.is_default ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
                            Par défaut
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {!t.is_system && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                        className="p-1 text-zinc-300 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Custom variables summary at bottom of sidebar */}
          <div className="border-t border-zinc-200 p-4 bg-zinc-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mes variables</span>
              <span className="text-xs text-zinc-400">{customVariables.length} créée{customVariables.length !== 1 ? 's' : ''}</span>
            </div>
            {customVariables.length === 0 ? (
              <p className="text-xs text-zinc-400">Aucune variable personnalisée.</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {customVariables.map(cv => (
                  <div key={cv.id} className="flex items-center justify-between text-xs group">
                    <span className="font-mono text-zinc-500">{`{{${cv.var_key}}}`}</span>
                    <button
                      onClick={() => deleteVariable(cv.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-red-500 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Editor */}
        {selectedTemplate ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor header */}
            <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-bold bg-transparent border-none outline-none focus:ring-0 text-zinc-800 w-64"
                  placeholder="Nom du modèle"
                />
                <select
                  value={editEventTypeId}
                  onChange={(e) => setEditEventTypeId(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                >
                  <option value="">Générique</option>
                  {eventTypes.map(et => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowVariables(!showVariables)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    showVariables
                      ? 'bg-vibrant/10 text-vibrant'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  Variables
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    showPreview
                      ? 'bg-vibrant/10 text-vibrant'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Aperçu
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-vibrant text-white rounded-lg text-xs font-medium hover:bg-vibrant/90 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : saved ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : selectedTemplate.is_system ? 'Sauvegarder (copie)' : 'Sauvegarder'}
                </button>
              </div>
            </div>

            {/* System template info banner */}
            {selectedTemplate.is_system ? (
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Modèle système — en sauvegardant, une copie personnalisée sera créée automatiquement.
                </p>
              </div>
            ) : null}

            {/* Variables panel */}
            {showVariables && (
              <div className="bg-white border-b border-zinc-200 px-6 py-3 flex-shrink-0">
                {/* Category tabs */}
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  <button
                    onClick={() => setActiveVarCategory('all')}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      activeVarCategory === 'all' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                    }`}
                  >
                    Toutes
                  </button>
                  {VARIABLE_CATEGORIES.map(cat => {
                    const count = allVariables.filter(v => v.category === cat.key).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveVarCategory(cat.key)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          activeVarCategory === cat.key
                            ? `bg-${cat.color}-500 text-white`
                            : `bg-${cat.color}-50 text-${cat.color}-600 hover:bg-${cat.color}-100`
                        }`}
                      >
                        {cat.label} ({count})
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowAddVariable(true)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-50 text-zinc-400 hover:bg-vibrant/10 hover:text-vibrant transition-all border border-dashed border-zinc-300 hover:border-vibrant"
                  >
                    + Ajouter
                  </button>
                </div>

                {/* Variables */}
                <div className="flex flex-wrap gap-1.5">
                  {filteredVariables.map((v, i) => {
                    const catColor = getCategoryColor(v.category);
                    const isCustom = 'isCustom' in v;
                    return (
                      <button
                        key={i}
                        onClick={() => insertVariable(v.var)}
                        className={`group flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all border ${
                          isCustom
                            ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                            : 'bg-white border-zinc-200 hover:border-vibrant hover:bg-vibrant/5'
                        }`}
                        title={`${v.label} — Cliquez pour insérer`}
                      >
                        <span className={`font-mono ${isCustom ? 'text-amber-700' : 'text-zinc-600'} group-hover:text-vibrant`}>
                          {v.var}
                        </span>
                        {copiedVar === v.var && (
                          <Check className="w-3 h-3 text-green-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2">
                  Cliquez sur une variable pour l'insérer à la position du curseur. Les variables seront remplacées automatiquement lors de la génération du contrat.
                </p>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Editor */}
              <div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full'}`}>
                <div className="px-6 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-400 font-medium">Éditeur HTML</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400 px-2 py-0.5 bg-zinc-100 rounded">
                      {editContent.length} caractères
                    </span>
                  </div>
                </div>
                <textarea
                  ref={editorRef}
                  value={editContent}
                  onChange={(e) => { setEditContent(e.target.value); setSaved(false); }}
                  className="flex-1 w-full p-6 font-mono text-sm text-zinc-700 bg-white resize-none outline-none leading-relaxed"
                  spellCheck={false}
                  placeholder={`Écrivez le contenu de votre contrat en HTML...

Balises supportées :
  <h2>Titre d'article</h2>
  <h3>Sous-titre</h3>
  <p>Paragraphe</p>
  <li>Élément de liste</li>
  <em>Texte en italique</em>
  <hr> Séparateur

Variables disponibles :
  {{photographer_name}} → Nom du photographe
  {{client_name}} → Nom du client
  {{event_type}} → Type d'événement
  {{date}} → Date du jour
  + vos variables personnalisées`}
                />
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="w-1/2 border-l border-zinc-200 flex flex-col overflow-hidden">
                  <div className="px-6 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2 flex-shrink-0">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-400 font-medium">Aperçu — les variables sont colorées</span>
                  </div>
                  <div
                    className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-zinc-50">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-5">
                <FileText className="w-10 h-10 text-zinc-200" />
              </div>
              <h2 className="text-lg font-bold text-zinc-500 mb-2">Sélectionnez un modèle</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Choisissez un modèle dans la liste pour le modifier, ou créez-en un nouveau.
              </p>
              <p className="text-xs text-zinc-300">
                Chaque type d'événement dispose d'un modèle par défaut qui sera utilisé lors de la génération du contrat.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create template modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-vibrant/10 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-vibrant" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Nouveau modèle de contrat</h2>
                <p className="text-sm text-zinc-400">Créez un modèle personnalisé</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Nom du modèle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                  placeholder="Ex: Contrat Mariage Premium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Type d'événement
                </label>
                <select
                  value={newEventTypeId}
                  onChange={(e) => setNewEventTypeId(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                >
                  <option value="">Générique (tous types)</option>
                  {eventTypes.map(et => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Dupliquer depuis (optionnel)
                </label>
                <select
                  value={duplicateFrom}
                  onChange={(e) => setDuplicateFrom(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                >
                  <option value="">Partir de zéro</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({getEventTypeName(t.event_type_id)})
                      {t.is_system ? ' — Système' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowCreateForm(false); setNewName(''); setNewEventTypeId(''); setDuplicateFrom(''); }}
                className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createTemplate}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-3 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 transition-colors disabled:opacity-50"
              >
                Créer le modèle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add variable modal */}
      {showAddVariable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Nouvelle variable personnalisée</h2>
                <p className="text-sm text-zinc-400">Créez une variable à utiliser dans vos contrats</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Libellé <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVarLabel}
                  onChange={(e) => {
                    setNewVarLabel(e.target.value);
                    // Auto-generate key from label
                    if (!newVarKey || newVarKey === newVarLabel.toLowerCase().replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')) {
                      setNewVarKey(e.target.value.toLowerCase().replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''));
                    }
                  }}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20 focus:border-vibrant"
                  placeholder="Ex: Montant total de la prestation"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Clé de la variable
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400 font-mono">{'{{'}</span>
                  <input
                    type="text"
                    value={newVarKey}
                    onChange={(e) => setNewVarKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                    placeholder="montant_total"
                  />
                  <span className="text-sm text-zinc-400 font-mono">{'}}'}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  La clé est générée automatiquement depuis le libellé
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Valeur par défaut
                </label>
                <input
                  type="text"
                  value={newVarDefault}
                  onChange={(e) => setNewVarDefault(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                  placeholder="Ex: 1 500,00 €"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Cette valeur sera utilisée par défaut dans le contrat si aucune autre n'est fournie
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={newVarCategory}
                  onChange={(e) => setNewVarCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vibrant/20"
                >
                  {VARIABLE_CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {newVarKey && (
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                  <p className="text-xs text-zinc-500 mb-2">Utilisation dans le contrat :</p>
                  <code className="text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    {`{{${newVarKey}}}`}
                  </code>
                  {newVarDefault && (
                    <p className="text-xs text-zinc-400 mt-2">
                      Sera remplacé par : <strong className="text-zinc-600">{newVarDefault}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowAddVariable(false); setNewVarKey(''); setNewVarLabel(''); setNewVarDefault(''); setNewVarCategory('general'); }}
                className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createVariable}
                disabled={!newVarLabel.trim()}
                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Créer la variable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractTemplatesManager;
