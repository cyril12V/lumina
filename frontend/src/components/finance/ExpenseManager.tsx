import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Camera,
  Laptop,
  Car,
  Building,
  ShoppingBag,
  Wrench,
  GraduationCap,
  MoreHorizontal,
  Calendar,
  Edit2
} from 'lucide-react';
import { finance } from '../../lib/api';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  tva_rate: number;
  expense_date: string;
  notes: string;
}

interface ExpenseManagerProps {
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'materiel', icon: Camera, label: 'Materiel Photo', color: 'bg-violet-500', description: 'Appareils, objectifs, flash, trepied...' },
  { id: 'logiciel', icon: Laptop, label: 'Logiciels', color: 'bg-blue-500', description: 'Lightroom, Photoshop, abonnements...' },
  { id: 'deplacement', icon: Car, label: 'Deplacements', color: 'bg-amber-500', description: 'Essence, peages, transports, parking...' },
  { id: 'studio', icon: Building, label: 'Studio/Local', color: 'bg-emerald-500', description: 'Loyer, electricite, assurance...' },
  { id: 'accessoires', icon: ShoppingBag, label: 'Accessoires', color: 'bg-pink-500', description: 'Cartes memoire, sacs, batteries...' },
  { id: 'maintenance', icon: Wrench, label: 'Maintenance', color: 'bg-orange-500', description: 'Reparations, nettoyage, calibrage...' },
  { id: 'formation', icon: GraduationCap, label: 'Formation', color: 'bg-cyan-500', description: 'Cours, workshops, tutoriels...' },
  { id: 'autre', icon: MoreHorizontal, label: 'Autre', color: 'bg-zinc-500', description: 'Autres depenses professionnelles' }
];

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onClose }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [category, setCategory] = useState('materiel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [tvaRate, setTvaRate] = useState('20');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await finance.listExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory('materiel');
    setDescription('');
    setAmount('');
    setTvaRate('20');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setTvaRate(expense.tva_rate.toString());
    setExpenseDate(expense.expense_date);
    setNotes(expense.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!description.trim() || !amount) {
      alert('Veuillez remplir la description et le montant');
      return;
    }

    try {
      setSaving(true);

      const data = {
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        tva_rate: parseFloat(tvaRate),
        expense_date: expenseDate,
        notes: notes.trim() || null
      };

      if (editingExpense) {
        await finance.updateExpense(editingExpense.id, data);
      } else {
        await finance.createExpense(data);
      }

      resetForm();
      setShowForm(false);
      loadExpenses();
    } catch (err) {
      console.error('Failed to save expense:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette depense ?')) return;
    try {
      await finance.deleteExpense(id);
      loadExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
  };

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
              Gestion des Depenses
            </h1>
            <p className="text-zinc-500 text-sm">Enregistrez vos depenses professionnelles</p>
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-black text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouvelle Depense
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-display uppercase tracking-tight mb-6">
              {editingExpense ? 'Modifier la depense' : 'Nouvelle depense'}
            </h3>

            <div className="space-y-5">
              {/* Category Selection */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block">
                  Categorie
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          category === cat.id
                            ? 'border-vibrant bg-vibrant/5'
                            : 'border-zinc-100 hover:border-zinc-200'
                        }`}
                      >
                        <div className={`p-2 ${cat.color} text-white rounded-lg`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-600 text-center leading-tight">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={getCategoryInfo(category).description}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>

              {/* Amount and TVA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                    Montant TTC
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                    Taux TVA
                  </label>
                  <select
                    value={tvaRate}
                    onChange={(e) => setTvaRate(e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5.5">5.5%</option>
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                  Date de la depense
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Details supplementaires..."
                  rows={2}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 px-4 py-3 border border-zinc-200 rounded-full text-sm font-bold hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-black text-white rounded-full text-sm font-bold hover:bg-vibrant transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {CATEGORIES.map((cat) => {
          const catExpenses = expenses.filter(e => e.category === cat.id);
          const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="bg-white p-5 rounded-[20px] border border-zinc-100 hover:shadow-md transition-all">
              <div className={`p-3 ${cat.color} text-white rounded-xl w-fit mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{cat.label}</h4>
              <p className="text-xl font-display">{formatCurrency(total)}</p>
              <p className="text-[10px] text-zinc-400">{catExpenses.length} depense{catExpenses.length > 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-[24px] border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Toutes les depenses</h3>
          <span className="text-sm text-zinc-400">
            Total: <span className="font-bold text-black">{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</span>
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-400">Chargement...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-500 mb-4">Aucune depense enregistree</p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="text-vibrant text-sm font-bold hover:underline"
            >
              Ajouter votre premiere depense
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {expenses.map((expense) => {
              const cat = getCategoryInfo(expense.category);
              const Icon = cat.icon;
              return (
                <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 ${cat.color} text-white rounded-lg`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{expense.description}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(expense.expense_date)}
                        <span className="text-zinc-300">|</span>
                        <span>{cat.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-lg text-rose-600">-{formatCurrency(expense.amount)}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-2 hover:bg-zinc-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;
