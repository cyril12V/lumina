import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  PenTool,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { clientPortal } from '../../lib/api';
import SignaturePad from './SignaturePad';

interface ContractViewProps {
  token: string;
  photographerName: string;
  canSign: boolean;
  isSigned: boolean;
  onBack: () => void;
}

interface ContractData {
  id: string;
  content: string;
  status: string;
  hasPdf: boolean;
  canSign: boolean;
  signedAt: string | null;
}

const ContractView: React.FC<ContractViewProps> = ({
  token,
  photographerName,
  canSign,
  isSigned,
  onBack
}) => {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  useEffect(() => {
    loadContract();
  }, []);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientPortal.getContract(token);
      setContract(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    try {
      setSigning(true);
      setError(null);
      await clientPortal.signContract(token, signatureData);
      setSignSuccess(true);
      setShowSignaturePad(false);
      await loadContract();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  const downloadPdf = () => {
    clientPortal.downloadPDF(token);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vibrant border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen bg-[#F3F2EE]">
        <header className="bg-white border-b border-zinc-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-black">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Contrat non disponible</h2>
            <p className="text-zinc-500">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2EE]">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-black">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-3">
            {contract?.hasPdf && (
              <button
                onClick={downloadPdf}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {signSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700">Contrat signé avec succès !</p>
              <p className="text-sm text-green-600">Merci pour votre confiance.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Contract Status */}
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          contract?.status === 'signed' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
        }`}>
          {contract?.status === 'signed' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-700">Contrat signé</p>
                {contract.signedAt && (
                  <p className="text-sm text-green-600">
                    Signé le {new Date(contract.signedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <PenTool className="w-5 h-5 text-orange-500" />
              <p className="font-medium text-orange-700">En attente de votre signature</p>
            </>
          )}
        </div>

        {/* Contract Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-8">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: contract?.content || '' }}
            />
          </div>
        </div>

        {/* Sign Button */}
        {contract?.canSign && contract.status !== 'signed' && (
          <div className="mt-8 space-y-4">
            <button
              onClick={() => setShowSignaturePad(true)}
              disabled={signing}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-vibrant text-white rounded-xl font-medium hover:bg-vibrant/90 disabled:opacity-50"
            >
              <PenTool className="w-5 h-5" />
              {signing ? 'Signature en cours...' : 'Signer le contrat'}
            </button>
            <p className="text-center text-sm text-zinc-400">
              En signant, vous acceptez les termes et conditions du contrat
            </p>
          </div>
        )}

        {/* Legal Notice */}
        <div className="mt-8 p-4 bg-zinc-100 rounded-xl">
          <p className="text-xs text-zinc-500">
            Ce document a valeur de contrat entre vous et {photographerName}.
            Votre signature électronique engage votre responsabilité légale.
            Un historique complet des actions est conservé pour preuve.
          </p>
        </div>
      </main>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          onSign={handleSign}
          onCancel={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  );
};

export default ContractView;
