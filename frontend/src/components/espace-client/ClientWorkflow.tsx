import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  Send,
  Edit3,
  Eye,
  Download,
  Image,
  ClipboardList,
  History,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { espaceClient, auth } from '../../lib/api';
import ContractEditor from './ContractEditor';

interface ClientWorkflowProps {
  linkId: string;
  onBack: () => void;
}

interface WorkflowData {
  link: {
    id: string;
    client_id: string;
    client_name: string;
    client_email: string;
    token: string;
    expires_at: string | null;
    created_at: string;
  };
  questionnaire: {
    id: string;
    event_type_id: string;
    event_type_name: string;
    status: string;
    responses: Record<string, any>;
    validated_at: string | null;
  } | null;
  contract: {
    id: string;
    content: string;
    status: string;
    photographer_validated_at: string | null;
    pdf_path: string | null;
    signatures: Array<{
      id: string;
      signer_type: string;
      signed_at: string;
    }>;
  } | null;
  gallery: {
    id: string;
    title: string;
    is_visible_to_client: number;
  } | null;
  workflowState: string;
}

const ClientWorkflow: React.FC<ClientWorkflowProps> = ({ linkId, onBack }) => {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showContractEditor, setShowContractEditor] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [generatingContract, setGeneratingContract] = useState(false);

  const user = auth.getUser();

  useEffect(() => {
    loadWorkflow();
  }, [linkId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const [workflowData, templatesData] = await Promise.all([
        espaceClient.getWorkflow(linkId),
        espaceClient.listTemplates(user.id)
      ]);
      setWorkflow(workflowData);
      setTemplates(templatesData);
      if (!selectedTemplateId && templatesData.length > 0) {
        setSelectedTemplateId(templatesData[0].id);
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await espaceClient.getAuditLogs(linkId);
      setAuditLogs(logs);
      setShowAudit(true);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const generateContract = async () => {
    if (!workflow?.questionnaire || workflow.questionnaire.status !== 'validated') return;

    try {
      setGeneratingContract(true);
      await espaceClient.generateContract({
        client_link_id: linkId,
        template_id: selectedTemplateId || undefined,
        user_id: user.id
      });
      await loadWorkflow();
    } catch (error) {
      console.error('Error generating contract:', error);
    } finally {
      setGeneratingContract(false);
    }
  };

  const validateContract = async (sendEmail: boolean) => {
    if (!workflow?.contract) return;

    try {
      await espaceClient.validateContract(workflow.contract.id, {
        user_id: user.id,
        send_email: sendEmail
      });
      await loadWorkflow();
    } catch (error) {
      console.error('Error validating contract:', error);
    }
  };

  const toggleGalleryVisibility = async (visible: boolean) => {
    try {
      await espaceClient.toggleGalleryVisibility(linkId, {
        is_visible: visible,
        user_id: user.id,
        send_email: visible
      });
      await loadWorkflow();
    } catch (error) {
      console.error('Error toggling gallery:', error);
    }
  };

  const copyLink = () => {
    if (!workflow) return;
    const url = `${window.location.origin}/client/${workflow.link.token}`;
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

  const getStepStatus = (step: string) => {
    if (!workflow) return 'pending';
    const state = workflow.workflowState;

    switch (step) {
      case 'link':
        return 'completed';
      case 'questionnaire':
        if (state === 'questionnaire_draft') return 'in_progress';
        if (['questionnaire_validated', 'contract_draft', 'contract_ready', 'contract_signed', 'gallery_visible'].includes(state)) return 'completed';
        return 'pending';
      case 'contract':
        if (state === 'contract_draft') return 'in_progress';
        if (['contract_ready', 'contract_signed', 'gallery_visible'].includes(state)) return 'completed';
        return 'pending';
      case 'signature':
        if (state === 'contract_ready') return 'in_progress';
        if (['contract_signed', 'gallery_visible'].includes(state)) return 'completed';
        return 'pending';
      case 'gallery':
        if (state === 'gallery_visible') return 'completed';
        return 'pending';
      default:
        return 'pending';
    }
  };

  if (loading || !workflow) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-black mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="text-center py-12 text-zinc-400">Chargement...</div>
      </div>
    );
  }

  if (showContractEditor && workflow.contract) {
    return (
      <ContractEditor
        contractId={workflow.contract.id}
        initialContent={workflow.contract.content}
        onBack={() => {
          setShowContractEditor(false);
          loadWorkflow();
        }}
        onValidate={validateContract}
      />
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{workflow.link.client_name}</h1>
            <p className="text-zinc-500">{workflow.link.client_email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAuditLogs}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50"
          >
            <History className="w-4 h-4" />
            Historique
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-vibrant text-white rounded-xl hover:bg-vibrant/90"
          >
            <Send className="w-4 h-4" />
            Copier le lien
          </button>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="bg-white rounded-2xl p-6 mb-8 border border-zinc-100">
        <h2 className="font-bold mb-6">Progression du workflow</h2>
        <div className="flex items-center justify-between">
          {['link', 'questionnaire', 'contract', 'signature', 'gallery'].map((step, index) => {
            const status = getStepStatus(step);
            const labels: Record<string, string> = {
              link: 'Lien créé',
              questionnaire: 'Questionnaire',
              contract: 'Contrat',
              signature: 'Signature',
              gallery: 'Galerie'
            };

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'in_progress' ? 'bg-vibrant text-white' :
                    'bg-zinc-100 text-zinc-400'
                  }`}>
                    {status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                     status === 'in_progress' ? <Clock className="w-5 h-5" /> :
                     <span className="text-sm font-bold">{index + 1}</span>}
                  </div>
                  <span className={`text-xs mt-2 ${
                    status === 'completed' ? 'text-green-600' :
                    status === 'in_progress' ? 'text-vibrant font-medium' :
                    'text-zinc-400'
                  }`}>
                    {labels[step]}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    getStepStatus(['link', 'questionnaire', 'contract', 'signature', 'gallery'][index + 1]) !== 'pending'
                      ? 'bg-green-500' : 'bg-zinc-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questionnaire Section */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                workflow.questionnaire?.status === 'validated' ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <ClipboardList className={`w-5 h-5 ${
                  workflow.questionnaire?.status === 'validated' ? 'text-green-500' : 'text-yellow-500'
                }`} />
              </div>
              <div>
                <h3 className="font-bold">Questionnaire</h3>
                {workflow.questionnaire && (
                  <p className="text-sm text-zinc-500">{workflow.questionnaire.event_type_name}</p>
                )}
              </div>
            </div>
            {workflow.questionnaire?.status === 'validated' && (
              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                Validé
              </span>
            )}
          </div>

          {workflow.questionnaire ? (
            <>
              <button
                onClick={() => setShowResponses(!showResponses)}
                className="w-full flex items-center justify-between p-3 bg-zinc-50 rounded-xl text-sm hover:bg-zinc-100 transition-colors"
              >
                <span>Voir les réponses</span>
                {showResponses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showResponses && (
                <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(workflow.questionnaire.responses).map(([key, value]) => (
                    <div key={key} className="p-3 bg-zinc-50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">{key}</p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-zinc-400 text-sm">En attente des réponses du client</p>
          )}
        </div>

        {/* Contract Section */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                workflow.contract?.status === 'signed' ? 'bg-green-50' :
                workflow.contract?.status === 'pending_signature' ? 'bg-orange-50' :
                workflow.contract ? 'bg-blue-50' : 'bg-zinc-50'
              }`}>
                <FileText className={`w-5 h-5 ${
                  workflow.contract?.status === 'signed' ? 'text-green-500' :
                  workflow.contract?.status === 'pending_signature' ? 'text-orange-500' :
                  workflow.contract ? 'text-blue-500' : 'text-zinc-400'
                }`} />
              </div>
              <div>
                <h3 className="font-bold">Contrat</h3>
                <p className="text-sm text-zinc-500">
                  {workflow.contract?.status === 'signed' ? 'Signé' :
                   workflow.contract?.status === 'pending_signature' ? 'En attente de signature' :
                   workflow.contract ? 'Brouillon' : 'Non généré'}
                </p>
              </div>
            </div>
          </div>

          {!workflow.contract && workflow.questionnaire?.status === 'validated' && (
            <div className="space-y-3">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_system ? '(Système)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={generateContract}
                disabled={generatingContract}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 disabled:opacity-50"
              >
                {generatingContract ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Générer le contrat
                  </>
                )}
              </button>
            </div>
          )}

          {workflow.contract && workflow.contract.status === 'draft' && (
            <div className="space-y-3">
              <button
                onClick={() => setShowContractEditor(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50"
              >
                <Edit3 className="w-4 h-4" />
                Modifier le contrat
              </button>
              <button
                onClick={() => validateContract(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90"
              >
                <Send className="w-4 h-4" />
                Valider et envoyer au client
              </button>
            </div>
          )}

          {workflow.contract && workflow.contract.status === 'pending_signature' && (
            <div className="space-y-3">
              <button
                onClick={() => espaceClient.downloadPDF(workflow.contract!.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50"
              >
                <Download className="w-4 h-4" />
                Télécharger le PDF
              </button>
              <p className="text-center text-sm text-zinc-500">En attente de la signature du client</p>
            </div>
          )}

          {workflow.contract && workflow.contract.status === 'signed' && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">Contrat signé</p>
                <p className="text-xs text-green-600">
                  {workflow.contract.signatures[0]?.signed_at &&
                    new Date(workflow.contract.signatures[0].signed_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                </p>
              </div>
              <button
                onClick={() => espaceClient.downloadPDF(workflow.contract!.id, 'signed')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600"
              >
                <Download className="w-4 h-4" />
                Télécharger le contrat signé
              </button>
            </div>
          )}

          {!workflow.contract && (!workflow.questionnaire || workflow.questionnaire.status !== 'validated') && (
            <p className="text-zinc-400 text-sm">En attente de la validation du questionnaire</p>
          )}
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-100 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                workflow.gallery?.is_visible_to_client ? 'bg-green-50' : 'bg-zinc-50'
              }`}>
                <Image className={`w-5 h-5 ${
                  workflow.gallery?.is_visible_to_client ? 'text-green-500' : 'text-zinc-400'
                }`} />
              </div>
              <div>
                <h3 className="font-bold">Galerie photo</h3>
                <p className="text-sm text-zinc-500">
                  {workflow.gallery
                    ? (workflow.gallery.is_visible_to_client ? 'Visible par le client' : 'Non visible')
                    : 'Aucune galerie associée'}
                </p>
              </div>
            </div>

            {workflow.gallery && (
              <button
                onClick={() => toggleGalleryVisibility(!workflow.gallery?.is_visible_to_client)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  workflow.gallery.is_visible_to_client
                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    : 'bg-vibrant text-white hover:bg-vibrant/90'
                }`}
              >
                <Eye className="w-4 h-4" />
                {workflow.gallery.is_visible_to_client ? 'Masquer' : 'Rendre visible'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Modal */}
      {showAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Historique des actions</h2>
              <button onClick={() => setShowAudit(false)} className="text-zinc-400 hover:text-black">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-center text-zinc-400 py-8">Aucune action enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-4 bg-zinc-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-zinc-400">
                          {new Date(log.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {log.ip_address && (
                        <p className="text-xs text-zinc-400 mt-1">IP: {log.ip_address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientWorkflow;
