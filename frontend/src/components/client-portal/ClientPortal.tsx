import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  Image,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  ChevronRight
} from 'lucide-react';
import { clientPortal } from '../../lib/api';
import Questionnaire from './Questionnaire';
import ContractView from './ContractView';
import GalleryView from './GalleryView';

interface PortalInfo {
  client: { name: string; email: string };
  photographer: { name: string; phone: string; email: string; logo: string | null };
  questionnaire: { eventType: string; status: string; validatedAt: string | null } | null;
  contract: { status: string; hasPdf: boolean; signedAt: string | null } | null;
  gallery: { title: string } | null;
  workflowState: string;
  canSign: boolean;
  linkExpiresAt: string | null;
}

const ClientPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'questionnaire' | 'contract' | 'gallery'>('home');

  useEffect(() => {
    loadPortalInfo();
  }, [token]);

  const loadPortalInfo = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const info = await clientPortal.getInfo(token);
      setPortalInfo(info);

      // Auto-navigate based on workflow state
      if (info.workflowState === 'questionnaire' || info.workflowState === 'questionnaire_draft') {
        setActiveView('home');
      } else if (info.workflowState === 'sign_contract') {
        setActiveView('contract');
      } else if (info.workflowState === 'gallery_available') {
        setActiveView('gallery');
      }
    } catch (err: any) {
      setError(err.message || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vibrant border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !portalInfo) {
    return (
      <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-12 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Lien invalide</h1>
          <p className="text-zinc-500">
            {error || 'Ce lien n\'existe pas ou a expiré. Veuillez contacter votre photographe.'}
          </p>
        </div>
      </div>
    );
  }

  if (activeView === 'questionnaire') {
    return (
      <Questionnaire
        token={token!}
        photographerName={portalInfo.photographer.name}
        onBack={() => {
          setActiveView('home');
          loadPortalInfo();
        }}
      />
    );
  }

  if (activeView === 'contract') {
    return (
      <ContractView
        token={token!}
        photographerName={portalInfo.photographer.name}
        canSign={portalInfo.canSign}
        isSigned={portalInfo.contract?.status === 'signed'}
        onBack={() => {
          setActiveView('home');
          loadPortalInfo();
        }}
      />
    );
  }

  if (activeView === 'gallery') {
    return (
      <GalleryView
        token={token!}
        photographerName={portalInfo.photographer.name}
        onBack={() => setActiveView('home')}
      />
    );
  }

  const getStepInfo = (step: string) => {
    const { workflowState, questionnaire, contract, gallery } = portalInfo;

    switch (step) {
      case 'questionnaire':
        if (questionnaire?.status === 'validated') {
          return { status: 'completed', label: 'Complété', canAccess: false };
        }
        if (workflowState === 'questionnaire' || !questionnaire) {
          return { status: 'current', label: 'À compléter', canAccess: true };
        }
        return { status: 'pending', label: 'En attente', canAccess: false };

      case 'contract':
        if (contract?.status === 'signed') {
          return { status: 'completed', label: 'Signé', canAccess: true };
        }
        if (contract?.status === 'pending_signature') {
          return { status: 'current', label: 'À signer', canAccess: true };
        }
        if (contract?.status === 'draft') {
          return { status: 'pending', label: 'En préparation', canAccess: false };
        }
        return { status: 'pending', label: 'En attente', canAccess: false };

      case 'gallery':
        if (gallery) {
          return { status: 'completed', label: 'Disponible', canAccess: true };
        }
        return { status: 'pending', label: 'Bientôt', canAccess: false };

      default:
        return { status: 'pending', label: '', canAccess: false };
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F2EE]">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            {portalInfo.photographer.logo && (
              <img
                src={portalInfo.photographer.logo}
                alt={portalInfo.photographer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{portalInfo.photographer.name}</h1>
              <p className="text-sm text-zinc-500">Espace client</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-2">
            Bonjour {portalInfo.client.name} !
          </h2>
          <p className="text-zinc-500">
            Bienvenue dans votre espace personnel. Suivez les étapes ci-dessous pour finaliser votre projet.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {/* Questionnaire Step */}
          {(() => {
            const info = getStepInfo('questionnaire');
            return (
              <div
                onClick={() => info.canAccess && setActiveView('questionnaire')}
                className={`bg-white rounded-2xl p-6 shadow-sm transition-all ${
                  info.canAccess ? 'cursor-pointer hover:shadow-md' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      info.status === 'completed' ? 'bg-green-50' :
                      info.status === 'current' ? 'bg-vibrant/10' :
                      'bg-zinc-100'
                    }`}>
                      {info.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <ClipboardList className={`w-6 h-6 ${
                          info.status === 'current' ? 'text-vibrant' : 'text-zinc-400'
                        }`} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Questionnaire</h3>
                      <p className="text-sm text-zinc-500">
                        {portalInfo.questionnaire?.eventType || 'Parlez-nous de votre projet'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      info.status === 'completed' ? 'bg-green-50 text-green-600' :
                      info.status === 'current' ? 'bg-vibrant/10 text-vibrant' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {info.label}
                    </span>
                    {info.canAccess && <ChevronRight className="w-5 h-5 text-zinc-400" />}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Contract Step */}
          {(() => {
            const info = getStepInfo('contract');
            return (
              <div
                onClick={() => info.canAccess && setActiveView('contract')}
                className={`bg-white rounded-2xl p-6 shadow-sm transition-all ${
                  info.canAccess ? 'cursor-pointer hover:shadow-md' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      info.status === 'completed' ? 'bg-green-50' :
                      info.status === 'current' ? 'bg-orange-50' :
                      'bg-zinc-100'
                    }`}>
                      {info.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <FileText className={`w-6 h-6 ${
                          info.status === 'current' ? 'text-orange-500' : 'text-zinc-400'
                        }`} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Contrat</h3>
                      <p className="text-sm text-zinc-500">
                        {info.status === 'completed'
                          ? `Signé le ${new Date(portalInfo.contract!.signedAt!).toLocaleDateString('fr-FR')}`
                          : 'Consultez et signez votre contrat'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      info.status === 'completed' ? 'bg-green-50 text-green-600' :
                      info.status === 'current' ? 'bg-orange-50 text-orange-600' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {info.label}
                    </span>
                    {info.canAccess && <ChevronRight className="w-5 h-5 text-zinc-400" />}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Gallery Step */}
          {(() => {
            const info = getStepInfo('gallery');
            return (
              <div
                onClick={() => info.canAccess && setActiveView('gallery')}
                className={`bg-white rounded-2xl p-6 shadow-sm transition-all ${
                  info.canAccess ? 'cursor-pointer hover:shadow-md' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      info.status === 'completed' ? 'bg-amber-50' :
                      'bg-zinc-100'
                    }`}>
                      <Image className={`w-6 h-6 ${
                        info.status === 'completed' ? 'text-amber-500' : 'text-zinc-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Galerie photo</h3>
                      <p className="text-sm text-zinc-500">
                        {portalInfo.gallery?.title || 'Vos photos seront disponibles ici'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      info.status === 'completed' ? 'bg-amber-50 text-amber-600' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {info.label}
                    </span>
                    {info.canAccess && <ChevronRight className="w-5 h-5 text-zinc-400" />}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Contact Card */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold mb-4">Une question ?</h3>
          <div className="flex flex-wrap gap-4">
            {portalInfo.photographer.email && (
              <a
                href={`mailto:${portalInfo.photographer.email}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-sm hover:bg-zinc-200 transition-colors"
              >
                {portalInfo.photographer.email}
              </a>
            )}
            {portalInfo.photographer.phone && (
              <a
                href={`tel:${portalInfo.photographer.phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-sm hover:bg-zinc-200 transition-colors"
              >
                {portalInfo.photographer.phone}
              </a>
            )}
          </div>
        </div>

        {/* Expiration Warning */}
        {portalInfo.linkExpiresAt && (
          <p className="mt-6 text-center text-sm text-zinc-400">
            Ce lien expire le {new Date(portalInfo.linkExpiresAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
