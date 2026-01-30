import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  User,
  Calendar,
  Percent
} from 'lucide-react';
import { finance, clients } from '../../lib/api';
import { auth } from '../../lib/api';

interface DocumentItem {
  id?: string;
  category: 'prestation' | 'produit';
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tva_rate: number;
}

interface DocumentEditorProps {
  type: 'invoice' | 'quote';
  document?: any;
  onClose: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ type, document, onClose }) => {
  const [clientId, setClientId] = useState(document?.client_id || '');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [items, setItems] = useState<DocumentItem[]>(
    document?.items?.length > 0
      ? document.items.map((item: any) => ({
          id: item.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tva_rate: item.tva_rate
        }))
      : [{ category: 'prestation', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20 }]
  );
  const [notes, setNotes] = useState(document?.notes || '');
  const [paymentTerms, setPaymentTerms] = useState(document?.payment_terms || 'Paiement a 30 jours');
  const [dueDate, setDueDate] = useState(document?.due_date || '');
  const [validUntil, setValidUntil] = useState(document?.valid_until || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const user = auth.getUser();
      if (user?.id) {
        const data = await clients.list(user.id);
        setClientsList(data);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const addItem = () => {
    setItems([...items, { category: 'prestation', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateItemTotal = (item: DocumentItem) => {
    const subtotal = item.quantity * item.unit_price;
    const afterDiscount = subtotal * (1 - item.discount_percent / 100);
    const tva = afterDiscount * (item.tva_rate / 100);
    return {
      ht: afterDiscount,
      tva,
      ttc: afterDiscount + tva
    };
  };

  const calculateTotals = () => {
    let subtotal_ht = 0;
    let total_tva = 0;

    items.forEach(item => {
      const totals = calculateItemTotal(item);
      subtotal_ht += totals.ht;
      total_tva += totals.tva;
    });

    return {
      subtotal_ht,
      total_tva,
      total_ttc: subtotal_ht + total_tva
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const validItems = items.filter(item => item.description.trim() !== '');

      if (validItems.length === 0) {
        alert('Ajoutez au moins une ligne avec une description');
        return;
      }

      const data = {
        type,
        client_id: clientId || null,
        items: validItems,
        notes,
        payment_terms: paymentTerms,
        due_date: dueDate || null,
        valid_until: validUntil || null
      };

      if (document?.id) {
        await finance.updateDocument(document.id, data);
      } else {
        await finance.createDocument(data);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save document:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onClose}
          className="p-3 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-display uppercase tracking-tighter text-black">
            {document?.id ? 'Modifier' : 'Nouveau'} {type === 'invoice' ? 'Facture' : 'Devis'}
          </h1>
          {document?.number && (
            <p className="text-zinc-500 text-sm">{document.number}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Client
            </h3>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full p-4 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
            >
              <option value="">Selectionner un client</option>
              {clientsList.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.email ? `(${client.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
              Lignes
            </h3>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-zinc-100 rounded-xl p-4">
                  <div className="grid grid-cols-12 gap-3">
                    {/* Category */}
                    <div className="col-span-12 md:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Categorie</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(index, 'category', e.target.value)}
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                      >
                        <option value="prestation">Prestation</option>
                        <option value="produit">Produit</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="col-span-12 md:col-span-9">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Description de la prestation ou produit"
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-6 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Qte</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-6 md:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Prix unit. HT</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                      />
                    </div>

                    {/* Discount */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Remise
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={item.discount_percent}
                        onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                      />
                    </div>

                    {/* TVA Rate */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">TVA %</label>
                      <select
                        value={item.tva_rate}
                        onChange={(e) => updateItem(index, 'tva_rate', parseFloat(e.target.value))}
                        className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                      >
                        <option value="0">0%</option>
                        <option value="5.5">5.5%</option>
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                      </select>
                    </div>

                    {/* Line Total */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Total TTC</label>
                      <div className="p-3 bg-zinc-50 rounded-lg text-sm font-bold text-black">
                        {formatCurrency(calculateItemTotal(item).ttc)}
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                      <button
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="p-3 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="mt-4 w-full p-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 hover:border-vibrant hover:text-vibrant transition-colors flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes ou conditions particulieres..."
              rows={3}
              className="w-full p-4 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Dates
            </h3>

            {type === 'invoice' ? (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Date d'echeance</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Valide jusqu'au</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Conditions de paiement</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-3 border border-zinc-200 rounded-lg text-sm focus:ring-2 ring-vibrant/20 outline-none"
              >
                <option value="Paiement comptant">Paiement comptant</option>
                <option value="Paiement a 15 jours">Paiement a 15 jours</option>
                <option value="Paiement a 30 jours">Paiement a 30 jours</option>
                <option value="Paiement a 45 jours">Paiement a 45 jours</option>
                <option value="Paiement a 60 jours">Paiement a 60 jours</option>
                <option value="50% a la commande, 50% a la livraison">50% commande / 50% livraison</option>
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
              Totaux
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(totals.subtotal_ht)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">TVA</span>
                <span className="font-medium">{formatCurrency(totals.total_tva)}</span>
              </div>
              <hr className="border-zinc-100" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC</span>
                <span className="text-vibrant">{formatCurrency(totals.total_ttc)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-black text-white px-6 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
