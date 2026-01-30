import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  Plus,
  Euro,
  ChevronRight,
  MoreVertical,
  Send,
  Download,
  Trash2,
  Eye,
  ArrowRightLeft,
  Camera,
  Laptop,
  Car,
  Building,
  ShoppingBag,
  Wrench,
  GraduationCap,
  MoreHorizontal
} from 'lucide-react';
import { finance } from '../../lib/api';
import DocumentEditor from './DocumentEditor';
import DocumentView from './DocumentView';
import ExpenseManager from './ExpenseManager';

interface FinanceStats {
  monthlyRevenue: number;
  yearlyRevenue: number;
  monthlyExpenses: number;
  yearlyExpenses: number;
  monthlyProfit: number;
  yearlyProfit: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  pendingQuotesCount: number;
  monthlyData: { month: string; revenue: number }[];
}

interface Document {
  id: string;
  type: 'invoice' | 'quote';
  number: string;
  status: string;
  client_name: string;
  client_email: string;
  total_ttc: number;
  amount_paid: number;
  issue_date: string;
  due_date: string;
  created_at: string;
}

const FinanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'quotes' | 'expenses'>('overview');
  const [showEditor, setShowEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice');
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [showExpenseManager, setShowExpenseManager] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, docsData, expensesData] = await Promise.all([
        finance.getStats(),
        activeTab === 'invoices' ? finance.listDocuments('invoice') :
        activeTab === 'quotes' ? finance.listDocuments('quote') :
        finance.listDocuments(),
        finance.listExpenses()
      ]);
      setStats(statsData);
      setDocuments(docsData);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-zinc-100 text-zinc-600',
      sent: 'bg-blue-50 text-blue-600',
      accepted: 'bg-emerald-50 text-emerald-600',
      rejected: 'bg-rose-50 text-rose-600',
      paid: 'bg-emerald-50 text-emerald-600',
      partial: 'bg-amber-50 text-amber-600',
      overdue: 'bg-rose-50 text-rose-600',
      cancelled: 'bg-zinc-100 text-zinc-400'
    };
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyee',
      accepted: 'Accepte',
      rejected: 'Refuse',
      paid: 'Payee',
      partial: 'Partiel',
      overdue: 'En retard',
      cancelled: 'Annulee'
    };
    return (
      <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleCreateDocument = (type: 'invoice' | 'quote') => {
    setDocumentType(type);
    setEditingDocument(null);
    setShowEditor(true);
  };

  const handleEditDocument = async (id: string) => {
    try {
      const doc = await finance.getDocument(id);
      setDocumentType(doc.type);
      setEditingDocument(doc);
      setShowEditor(true);
    } catch (err) {
      console.error('Failed to load document:', err);
    }
    setMenuOpen(null);
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await finance.deleteDocument(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
    setMenuOpen(null);
  };

  const handleConvertToInvoice = async (id: string) => {
    try {
      await finance.convertQuoteToInvoice(id);
      loadData();
    } catch (err) {
      console.error('Failed to convert quote:', err);
    }
    setMenuOpen(null);
  };

  const handleSendDocument = async (id: string) => {
    try {
      await finance.updateDocument(id, { status: 'sent' });
      loadData();
    } catch (err) {
      console.error('Failed to send document:', err);
    }
    setMenuOpen(null);
  };

  // Calculate expense breakdown by category
  const getExpensesByCategory = () => {
    const categories: Record<string, { total: number; icon: any; label: string; color: string }> = {
      materiel: { total: 0, icon: Camera, label: 'Materiel Photo', color: 'bg-violet-500' },
      logiciel: { total: 0, icon: Laptop, label: 'Logiciels', color: 'bg-blue-500' },
      deplacement: { total: 0, icon: Car, label: 'Deplacements', color: 'bg-amber-500' },
      studio: { total: 0, icon: Building, label: 'Studio/Local', color: 'bg-emerald-500' },
      accessoires: { total: 0, icon: ShoppingBag, label: 'Accessoires', color: 'bg-pink-500' },
      maintenance: { total: 0, icon: Wrench, label: 'Maintenance', color: 'bg-orange-500' },
      formation: { total: 0, icon: GraduationCap, label: 'Formation', color: 'bg-cyan-500' },
      autre: { total: 0, icon: MoreHorizontal, label: 'Autre', color: 'bg-zinc-500' }
    };

    expenses.forEach(exp => {
      const cat = exp.category || 'autre';
      if (categories[cat]) {
        categories[cat].total += exp.amount;
      } else {
        categories['autre'].total += exp.amount;
      }
    });

    return Object.entries(categories)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, maxValue }: { data: { month: string; revenue: number }[]; maxValue: number }) => {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec'];

    // Fill in missing months with 0
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const found = data.find(item => item.month === monthKey);
      last6Months.push({
        month: months[d.getMonth()],
        revenue: found?.revenue || 0
      });
    }

    const max = Math.max(...last6Months.map(d => d.revenue), 1);

    return (
      <div className="flex items-end justify-between gap-2 h-32">
        {last6Months.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full bg-zinc-100 rounded-t-lg relative" style={{ height: '100px' }}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-vibrant rounded-t-lg transition-all"
                style={{ height: `${(item.revenue / max) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase">{item.month}</span>
          </div>
        ))}
      </div>
    );
  };

  if (showEditor) {
    return (
      <DocumentEditor
        type={documentType}
        document={editingDocument}
        onClose={() => {
          setShowEditor(false);
          setEditingDocument(null);
          loadData();
        }}
      />
    );
  }

  if (viewingDocument) {
    return (
      <DocumentView
        documentId={viewingDocument}
        onClose={() => {
          setViewingDocument(null);
          loadData();
        }}
      />
    );
  }

  if (showExpenseManager) {
    return (
      <ExpenseManager
        onClose={() => {
          setShowExpenseManager(false);
          loadData();
        }}
      />
    );
  }

  const expensesByCategory = getExpensesByCategory();
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-display uppercase tracking-tighter text-black">
            Finances
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Gerez vos factures, devis et depenses</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleCreateDocument('quote')}
            className="bg-white border border-zinc-200 text-black px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau Devis
          </button>
          <button
            onClick={() => handleCreateDocument('invoice')}
            className="bg-black text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Facture
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Vue generale' },
          { id: 'invoices', label: 'Factures' },
          { id: 'quotes', label: 'Devis' },
          { id: 'expenses', label: 'Depenses' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-black text-white'
                : 'bg-white border border-zinc-200 text-zinc-500 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-[24px] border border-zinc-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600">Ce mois</span>
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Chiffre d'affaires</h3>
              <p className="text-2xl font-display text-black">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-xs text-zinc-400 mt-1">Annuel: {formatCurrency(stats.yearlyRevenue)}</p>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-zinc-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-rose-600">Ce mois</span>
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Depenses</h3>
              <p className="text-2xl font-display text-black">{formatCurrency(stats.monthlyExpenses)}</p>
              <p className="text-xs text-zinc-400 mt-1">Annuel: {formatCurrency(stats.yearlyExpenses)}</p>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-zinc-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-vibrant/10 text-vibrant rounded-xl">
                  <Euro className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold ${stats.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stats.monthlyProfit >= 0 ? '+' : ''}{((stats.monthlyProfit / (stats.monthlyRevenue || 1)) * 100).toFixed(0)}%
                </span>
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Benefice Net</h3>
              <p className="text-2xl font-display text-black">{formatCurrency(stats.monthlyProfit)}</p>
              <p className="text-xs text-zinc-400 mt-1">Annuel: {formatCurrency(stats.yearlyProfit)}</p>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-zinc-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-amber-600">En attente</span>
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Factures en cours</h3>
              <p className="text-2xl font-display text-black">{stats.pendingInvoicesCount}</p>
              <p className="text-xs text-zinc-400 mt-1">Total: {formatCurrency(stats.pendingInvoicesAmount)}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-[24px] border border-zinc-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Chiffre d'affaires</h3>
                <span className="text-[10px] font-bold text-zinc-400">6 derniers mois</span>
              </div>
              <SimpleBarChart data={stats.monthlyData || []} maxValue={stats.yearlyRevenue} />
            </div>

            {/* Expenses Breakdown */}
            <div className="bg-white p-6 rounded-[24px] border border-zinc-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Repartition depenses</h3>
                <button
                  onClick={() => setShowExpenseManager(true)}
                  className="text-[10px] font-bold text-vibrant hover:underline"
                >
                  Gerer
                </button>
              </div>

              {expensesByCategory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-400 text-sm mb-3">Aucune depense enregistree</p>
                  <button
                    onClick={() => setShowExpenseManager(true)}
                    className="text-vibrant text-sm font-bold hover:underline"
                  >
                    Ajouter une depense
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expensesByCategory.slice(0, 5).map(([category, data]) => {
                    const Icon = data.icon;
                    const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
                    return (
                      <div key={category} className="flex items-center gap-3">
                        <div className={`p-2 ${data.color} text-white rounded-lg`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{data.label}</span>
                            <span className="text-sm font-bold">{formatCurrency(data.total)}</span>
                          </div>
                          <div className="w-full bg-zinc-100 rounded-full h-1.5">
                            <div
                              className={`${data.color} h-1.5 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="bg-white rounded-[24px] border border-zinc-100 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Documents recents</h3>
              <button
                onClick={() => setActiveTab('invoices')}
                className="text-[10px] font-bold uppercase tracking-widest text-vibrant flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">Aucun document</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${doc.type === 'invoice' ? 'bg-vibrant/10 text-vibrant' : 'bg-blue-50 text-blue-600'}`}>
                        {doc.type === 'invoice' ? <Receipt className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{doc.number}</p>
                        <p className="text-xs text-zinc-400">{doc.client_name || 'Sans client'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(doc.status)}
                      <span className="font-display text-lg">{formatCurrency(doc.total_ttc)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display uppercase tracking-tight">Mes Depenses</h2>
            <button
              onClick={() => setShowExpenseManager(true)}
              className="bg-black text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Ajouter Depense
            </button>
          </div>

          {/* Expense Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'materiel', icon: Camera, label: 'Materiel Photo', color: 'bg-violet-500' },
              { id: 'logiciel', icon: Laptop, label: 'Logiciels', color: 'bg-blue-500' },
              { id: 'deplacement', icon: Car, label: 'Deplacements', color: 'bg-amber-500' },
              { id: 'studio', icon: Building, label: 'Studio/Local', color: 'bg-emerald-500' },
              { id: 'accessoires', icon: ShoppingBag, label: 'Accessoires', color: 'bg-pink-500' },
              { id: 'maintenance', icon: Wrench, label: 'Maintenance', color: 'bg-orange-500' },
              { id: 'formation', icon: GraduationCap, label: 'Formation', color: 'bg-cyan-500' },
              { id: 'autre', icon: MoreHorizontal, label: 'Autre', color: 'bg-zinc-500' }
            ].map((cat) => {
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

          {/* Recent Expenses List */}
          <div className="bg-white rounded-[24px] border border-zinc-100 overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Dernieres depenses</h3>
            </div>

            {expenses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-400 mb-4">Aucune depense enregistree</p>
                <button
                  onClick={() => setShowExpenseManager(true)}
                  className="text-vibrant font-bold hover:underline"
                >
                  Ajouter votre premiere depense
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {expenses.slice(0, 10).map((expense) => {
                  const categoryInfo: Record<string, { icon: any; color: string }> = {
                    materiel: { icon: Camera, color: 'bg-violet-500' },
                    logiciel: { icon: Laptop, color: 'bg-blue-500' },
                    deplacement: { icon: Car, color: 'bg-amber-500' },
                    studio: { icon: Building, color: 'bg-emerald-500' },
                    accessoires: { icon: ShoppingBag, color: 'bg-pink-500' },
                    maintenance: { icon: Wrench, color: 'bg-orange-500' },
                    formation: { icon: GraduationCap, color: 'bg-cyan-500' },
                    autre: { icon: MoreHorizontal, color: 'bg-zinc-500' }
                  };
                  const cat = categoryInfo[expense.category] || categoryInfo.autre;
                  const Icon = cat.icon;

                  return (
                    <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 ${cat.color} text-white rounded-lg`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{expense.description}</p>
                          <p className="text-xs text-zinc-400">{formatDate(expense.expense_date)}</p>
                        </div>
                      </div>
                      <span className="font-display text-lg text-rose-600">-{formatCurrency(expense.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVOICES & QUOTES TABS */}
      {(activeTab === 'invoices' || activeTab === 'quotes') && (
        <div className="bg-white rounded-[32px] border border-zinc-100 overflow-hidden">
          <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
            <h2 className="text-xl font-display uppercase tracking-tight text-black">
              {activeTab === 'invoices' ? 'Factures' : 'Devis'}
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400">Chargement...</div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-zinc-500 mb-4">Aucun {activeTab === 'invoices' ? 'e facture' : ' devis'} pour le moment</p>
              <button
                onClick={() => handleCreateDocument(activeTab === 'quotes' ? 'quote' : 'invoice')}
                className="text-vibrant text-sm font-bold hover:underline"
              >
                Creer {activeTab === 'quotes' ? 'un devis' : 'une facture'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numero</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Client</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Statut</th>
                    <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Montant</th>
                    <th className="px-8 py-5 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${doc.type === 'invoice' ? 'bg-vibrant/10 text-vibrant' : 'bg-blue-50 text-blue-600'}`}>
                            {doc.type === 'invoice' ? <Receipt className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <span className="font-bold text-black text-sm">{doc.number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-zinc-600 font-medium text-sm">{doc.client_name || 'Sans client'}</span>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-zinc-400 text-xs font-bold uppercase">{formatDate(doc.issue_date)}</span>
                      </td>
                      <td className="px-6 py-6">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="font-display text-lg text-black">{formatCurrency(doc.total_ttc)}</span>
                          {doc.type === 'invoice' && doc.amount_paid > 0 && doc.amount_paid < doc.total_ttc && (
                            <span className="text-xs text-emerald-600">Paye: {formatCurrency(doc.amount_paid)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                          className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                        >
                          <MoreVertical className="w-5 h-5 text-zinc-400" />
                        </button>

                        {menuOpen === doc.id && (
                          <div className="absolute right-8 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg py-2 z-10 min-w-[160px]">
                            <button
                              onClick={() => { setViewingDocument(doc.id); setMenuOpen(null); }}
                              className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" /> Voir
                            </button>
                            <button
                              onClick={() => handleEditDocument(doc.id)}
                              className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" /> Modifier
                            </button>
                            {doc.status === 'draft' && (
                              <button
                                onClick={() => handleSendDocument(doc.id)}
                                className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                              >
                                <Send className="w-4 h-4" /> Envoyer
                              </button>
                            )}
                            {doc.type === 'quote' && doc.status !== 'accepted' && (
                              <button
                                onClick={() => handleConvertToInvoice(doc.id)}
                                className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                              >
                                <ArrowRightLeft className="w-4 h-4" /> Convertir en facture
                              </button>
                            )}
                            <button
                              onClick={() => { setViewingDocument(doc.id); setMenuOpen(null); }}
                              className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" /> Telecharger PDF
                            </button>
                            <hr className="my-2 border-zinc-100" />
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;
