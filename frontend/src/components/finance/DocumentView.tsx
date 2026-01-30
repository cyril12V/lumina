import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  Send,
  Plus,
  Printer,
  Euro,
  CreditCard,
  CheckCircle,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { finance, auth, users } from '../../lib/api';

interface DocumentViewProps {
  documentId: string;
  onClose: () => void;
}

const DocumentView: React.FC<DocumentViewProps> = ({ documentId, onClose }) => {
  const [document, setDocument] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('virement');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocument();
    loadUserProfile();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const data = await finance.getDocument(documentId);
      setDocument(data);
      setPaymentAmount((data.total_ttc - data.amount_paid).toFixed(2));
    } catch (err) {
      console.error('Failed to load document:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const user = auth.getUser();
      if (user?.id) {
        const profile = await users.getProfile(user.id);
        setUserProfile(profile);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleAddPayment = async () => {
    try {
      await finance.addPayment(documentId, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        payment_date: paymentDate
      });
      setShowPaymentForm(false);
      loadDocument();
    } catch (err) {
      console.error('Failed to add payment:', err);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document.type === 'invoice' ? 'Facture' : 'Devis'} ${document.number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; }
            .doc-info { text-align: right; }
            .doc-type { font-size: 24px; font-weight: bold; text-transform: uppercase; color: #8B5CF6; }
            .doc-number { color: #666; margin-top: 4px; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .party { max-width: 45%; }
            .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
            .party-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .party-detail { font-size: 13px; color: #666; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #f5f5f5; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .text-right { text-align: right; }
            .totals { margin-left: auto; width: 280px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .total-row.final { border-top: 2px solid #1a1a1a; font-size: 18px; font-weight: bold; padding-top: 12px; margin-top: 8px; }
            .total-row.final .amount { color: #8B5CF6; }
            .notes { margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .notes-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-vibrant border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-10 text-center text-zinc-500">Document introuvable</div>
    );
  }

  const remainingAmount = document.total_ttc - document.amount_paid;

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display uppercase tracking-tighter text-black">
              {document.type === 'invoice' ? 'Facture' : 'Devis'} {document.number}
            </h1>
            <p className="text-zinc-500 text-sm">{formatDate(document.issue_date)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {document.type === 'invoice' && document.status !== 'paid' && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="bg-emerald-500 text-white px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Ajouter paiement
            </button>
          )}
          <button
            onClick={handlePrint}
            className="bg-black text-white px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Telecharger PDF
          </button>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md">
            <h3 className="text-xl font-display uppercase tracking-tight mb-6">Enregistrer un paiement</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Montant</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
                <p className="text-xs text-zinc-400 mt-1">Reste a payer: {formatCurrency(remainingAmount)}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Mode de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Cheque</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="especes">Especes</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Date de paiement</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 px-4 py-3 border border-zinc-200 rounded-full text-sm font-bold hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddPayment}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-600 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview */}
      <div className="bg-white rounded-[32px] border border-zinc-100 overflow-hidden">
        {/* Status bar */}
        <div className={`px-8 py-4 flex items-center justify-between ${
          document.status === 'paid' ? 'bg-emerald-50' :
          document.status === 'partial' ? 'bg-amber-50' :
          document.status === 'overdue' ? 'bg-rose-50' :
          'bg-zinc-50'
        }`}>
          <div className="flex items-center gap-3">
            {document.status === 'paid' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <CreditCard className="w-5 h-5 text-zinc-600" />
            )}
            <span className="font-bold text-sm">
              {document.status === 'paid' ? 'Payee integralement' :
               document.status === 'partial' ? `Paiement partiel - Reste: ${formatCurrency(remainingAmount)}` :
               document.status === 'overdue' ? 'En retard de paiement' :
               document.status === 'sent' ? 'Envoyee au client' :
               'Brouillon'}
            </span>
          </div>
          {document.amount_paid > 0 && (
            <span className="text-sm text-emerald-600 font-bold">
              Paye: {formatCurrency(document.amount_paid)}
            </span>
          )}
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="p-8 md:p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="text-3xl font-display tracking-tighter text-black mb-2">
                {userProfile?.business_name || userProfile?.full_name || 'LUMINA'}
              </div>
              {userProfile?.siret && (
                <p className="text-sm text-zinc-500">SIRET: {userProfile.siret}</p>
              )}
              {userProfile?.tva_number && (
                <p className="text-sm text-zinc-500">N TVA: {userProfile.tva_number}</p>
              )}
            </div>
            <div className="text-right">
              <div className="doc-type text-2xl font-display uppercase text-vibrant">
                {document.type === 'invoice' ? 'Facture' : 'Devis'}
              </div>
              <div className="doc-number text-zinc-500 mt-1">{document.number}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="flex justify-between mb-12">
            <div className="party">
              <div className="party-label text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Emetteur</div>
              <div className="party-name font-bold">{userProfile?.full_name || 'Votre nom'}</div>
              <div className="party-detail text-sm text-zinc-600 leading-relaxed">
                {userProfile?.address && <div>{userProfile.address}</div>}
                {(userProfile?.postal_code || userProfile?.city) && (
                  <div>{userProfile?.postal_code} {userProfile?.city}</div>
                )}
                {userProfile?.email && <div>{userProfile.email}</div>}
                {userProfile?.phone && <div>{userProfile.phone}</div>}
              </div>
            </div>
            <div className="party text-right">
              <div className="party-label text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Client</div>
              <div className="party-name font-bold">{document.client_name || 'Client non defini'}</div>
              <div className="party-detail text-sm text-zinc-600 leading-relaxed">
                {document.client_address && <div>{document.client_address}</div>}
                {(document.client_postal_code || document.client_city) && (
                  <div>{document.client_postal_code} {document.client_city}</div>
                )}
                {document.client_email && <div>{document.client_email}</div>}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-8 mb-8 text-sm">
            <div>
              <span className="text-zinc-400">Date d'emission: </span>
              <span className="font-medium">{formatDate(document.issue_date)}</span>
            </div>
            {document.due_date && (
              <div>
                <span className="text-zinc-400">Echeance: </span>
                <span className="font-medium">{formatDate(document.due_date)}</span>
              </div>
            )}
            {document.valid_until && (
              <div>
                <span className="text-zinc-400">Valide jusqu'au: </span>
                <span className="font-medium">{formatDate(document.valid_until)}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="text-left py-3 text-[10px] uppercase tracking-widest text-zinc-400">Description</th>
                <th className="text-right py-3 text-[10px] uppercase tracking-widest text-zinc-400">Qte</th>
                <th className="text-right py-3 text-[10px] uppercase tracking-widest text-zinc-400">Prix unit. HT</th>
                <th className="text-right py-3 text-[10px] uppercase tracking-widest text-zinc-400">Remise</th>
                <th className="text-right py-3 text-[10px] uppercase tracking-widest text-zinc-400">TVA</th>
                <th className="text-right py-3 text-[10px] uppercase tracking-widest text-zinc-400">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {document.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-zinc-100">
                  <td className="py-4">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs text-zinc-400 capitalize">{item.category}</div>
                  </td>
                  <td className="py-4 text-right">{item.quantity}</td>
                  <td className="py-4 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-4 text-right">{item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}</td>
                  <td className="py-4 text-right">{item.tva_rate}%</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(item.total_ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-zinc-500">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(document.subtotal_ht)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-zinc-500">TVA</span>
                <span className="font-medium">{formatCurrency(document.total_tva)}</span>
              </div>
              <div className="flex justify-between py-3 mt-2 border-t-2 border-black text-lg font-bold">
                <span>Total TTC</span>
                <span className="text-vibrant">{formatCurrency(document.total_ttc)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {document.notes && (
            <div className="mt-8 p-6 bg-zinc-50 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Notes</div>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{document.notes}</p>
            </div>
          )}

          {/* Payment Terms */}
          {document.payment_terms && (
            <div className="mt-6 text-sm text-zinc-500">
              <strong>Conditions de paiement:</strong> {document.payment_terms}
            </div>
          )}

          {/* Bank Details */}
          {userProfile?.iban && (
            <div className="mt-6 p-6 bg-zinc-50 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Coordonnees bancaires</div>
              <div className="text-sm text-zinc-600">
                {userProfile.bank_name && <div><strong>Banque:</strong> {userProfile.bank_name}</div>}
                <div><strong>IBAN:</strong> {userProfile.iban}</div>
                {userProfile.bic && <div><strong>BIC:</strong> {userProfile.bic}</div>}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-400">
            {userProfile?.business_name || userProfile?.full_name} - {userProfile?.siret && `SIRET: ${userProfile.siret}`}
          </div>
        </div>

        {/* Payments History */}
        {document.payments && document.payments.length > 0 && (
          <div className="border-t border-zinc-100 p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Historique des paiements</h3>
            <div className="space-y-3">
              {document.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <Euro className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-zinc-400">{payment.payment_method} - {formatDate(payment.payment_date)}</div>
                    </div>
                  </div>
                  {payment.reference && (
                    <span className="text-xs text-zinc-400">Ref: {payment.reference}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentView;
