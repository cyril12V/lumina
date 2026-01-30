import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  User,
  Building,
  CreditCard,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Upload,
  Bell,
  Users,
  Plus,
  Mail,
  Trash2,
  Crown,
  Shield,
  Camera,
  Palette,
  Wrench
} from 'lucide-react';
import { auth, users, team } from '../../lib/api';

interface ProfileSettingsProps {
  onClose?: () => void;
}

const ROLES = {
  owner: { label: 'Proprietaire', icon: Crown, color: 'bg-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-violet-500' },
  photographer: { label: 'Photographe', icon: Camera, color: 'bg-blue-500' },
  retoucher: { label: 'Retoucheur', icon: Palette, color: 'bg-pink-500' },
  assistant: { label: 'Assistant', icon: Wrench, color: 'bg-emerald-500' }
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'business' | 'team' | 'notifications'>('personal');
  const [profile, setProfile] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({});

  // Invitation form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('photographer');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = auth.getUser();
      if (user?.id) {
        const [profileData, teamInfo] = await Promise.all([
          users.getProfile(user.id),
          team.getMyTeam()
        ]);
        setProfile(profileData);
        setFormData(profileData);
        setTeamData(teamInfo);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.getUser();
      await users.updateProfile(user.id, formData);
      setProfile(formData);
      // Update local storage
      const currentUser = auth.getUser();
      auth.setSession(localStorage.getItem('token')!, { ...currentUser, ...formData });
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      alert('Veuillez entrer une adresse email');
      return;
    }

    try {
      await team.createInvitation({
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        send_email: sendInviteEmail
      });

      setInviteEmail('');
      setShowInviteForm(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'envoi de l\'invitation');
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!confirm('Annuler cette invitation ?')) return;
    try {
      await team.cancelInvitation(id);
      loadData();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Retirer ce membre de l\'equipe ?')) return;
    try {
      await team.removeMember(memberId);
      loadData();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await team.updateMemberRole(memberId, newRole);
      loadData();
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-vibrant border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {onClose && (
          <button onClick={onClose} className="p-3 hover:bg-zinc-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-display uppercase tracking-tighter text-black">
            Parametres
          </h1>
          <p className="text-zinc-500 text-sm">Gerez votre profil et votre equipe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'personal', label: 'Personnel', icon: User },
          { id: 'business', label: 'Entreprise', icon: Building },
          { id: 'team', label: 'Equipe', icon: Users },
          { id: 'notifications', label: 'Notifications', icon: Bell }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-black text-white'
                  : 'bg-white border border-zinc-200 text-zinc-500 hover:text-black'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Personal Tab */}
      {activeTab === 'personal' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">
              Informations personnelles
            </h3>

            <div className="space-y-4">
              {/* Profile display mode */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
                  Mode d'affichage
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'personal', label: 'Personnel' },
                    { id: 'business', label: 'Entreprise' },
                    { id: 'both', label: 'Les deux' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => updateField('profile_display_mode', mode.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        formData.profile_display_mode === mode.id
                          ? 'bg-vibrant text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Nom complet</label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Telephone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  disabled
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm bg-zinc-50 text-zinc-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Bio</label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => updateField('bio', e.target.value)}
                  rows={3}
                  placeholder="Presentez-vous en quelques mots..."
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Liens & Reseaux sociaux
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Site web</label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://"
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.social_instagram || ''}
                    onChange={(e) => updateField('social_instagram', e.target.value)}
                    placeholder="@username"
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                    <Facebook className="w-3 h-3" /> Facebook
                  </label>
                  <input
                    type="text"
                    value={formData.social_facebook || ''}
                    onChange={(e) => updateField('social_facebook', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-1">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </label>
                  <input
                    type="text"
                    value={formData.social_linkedin || ''}
                    onChange={(e) => updateField('social_linkedin', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {/* Business Tab */}
      {activeTab === 'business' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">
              Informations entreprise
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Nom commercial</label>
                <input
                  type="text"
                  value={formData.business_name || ''}
                  onChange={(e) => updateField('business_name', e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">SIRET</label>
                  <input
                    type="text"
                    value={formData.siret || ''}
                    onChange={(e) => updateField('siret', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">N TVA</label>
                  <input
                    type="text"
                    value={formData.tva_number || ''}
                    onChange={(e) => updateField('tva_number', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Adresse</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Code postal</label>
                  <input
                    type="text"
                    value={formData.postal_code || ''}
                    onChange={(e) => updateField('postal_code', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Ville</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Coordonnees bancaires
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Banque</label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => updateField('bank_name', e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">IBAN</label>
                  <input
                    type="text"
                    value={formData.iban || ''}
                    onChange={(e) => updateField('iban', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">BIC</label>
                  <input
                    type="text"
                    value={formData.bic || ''}
                    onChange={(e) => updateField('bic', e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Conditions de paiement par defaut</label>
                <select
                  value={formData.payment_terms || ''}
                  onChange={(e) => updateField('payment_terms', e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                >
                  <option value="Paiement comptant">Paiement comptant</option>
                  <option value="Paiement a 15 jours">Paiement a 15 jours</option>
                  <option value="Paiement a 30 jours">Paiement a 30 jours</option>
                  <option value="Paiement a 45 jours">Paiement a 45 jours</option>
                  <option value="50% a la commande, 50% a la livraison">50% commande / 50% livraison</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && teamData && (
        <div className="max-w-2xl space-y-6">
          {/* Team Info */}
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">
                Mon equipe
              </h3>
              <span className="text-xs text-zinc-400">
                {teamData.members?.length || 0} / {teamData.max_members} membres
              </span>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              {teamData.members?.map((member: any) => {
                const roleInfo = ROLES[member.role as keyof typeof ROLES];
                const RoleIcon = roleInfo?.icon || User;
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 ${roleInfo?.color || 'bg-zinc-500'} text-white rounded-lg`}>
                        <RoleIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{member.full_name || member.email}</p>
                        <p className="text-xs text-zinc-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role !== 'owner' && teamData.my_role === 'owner' ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value)}
                            className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs"
                          >
                            <option value="admin">Admin</option>
                            <option value="photographer">Photographe</option>
                            <option value="retoucher">Retoucheur</option>
                            <option value="assistant">Assistant</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full ${roleInfo?.color || 'bg-zinc-500'} text-white`}>
                          {roleInfo?.label || member.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pending Invitations */}
            {teamData.invitations?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-zinc-100">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Invitations en attente</h4>
                <div className="space-y-2">
                  {teamData.invitations.map((invite: any) => (
                    <div key={invite.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-[10px] text-zinc-400">Role: {ROLES[invite.role as keyof typeof ROLES]?.label}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Button */}
            {teamData.canInvite && (teamData.my_role === 'owner' || teamData.my_role === 'admin') && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="mt-6 w-full p-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-500 hover:border-vibrant hover:text-vibrant transition-all flex items-center justify-center gap-2 text-sm font-bold"
              >
                <Plus className="w-4 h-4" /> Inviter un membre
              </button>
            )}
          </div>

          {/* Invite Modal */}
          {showInviteForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-[24px] p-8 w-full max-w-md">
                <h3 className="text-xl font-display uppercase tracking-tight mb-6">Inviter un membre</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 ring-vibrant/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ROLES).filter(([key]) => key !== 'owner').map(([key, value]) => {
                        const Icon = value.icon;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setInviteRole(key)}
                            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                              inviteRole === key
                                ? 'border-vibrant bg-vibrant/5'
                                : 'border-zinc-100 hover:border-zinc-200'
                            }`}
                          >
                            <div className={`p-1.5 ${value.color} text-white rounded-lg`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-bold">{value.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInviteEmail}
                      onChange={(e) => setSendInviteEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300"
                    />
                    <span className="text-sm text-zinc-600">Envoyer l'invitation par email</span>
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 px-4 py-3 border border-zinc-200 rounded-full text-sm font-bold hover:bg-zinc-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleInvite}
                    className="flex-1 px-4 py-3 bg-black text-white rounded-full text-sm font-bold hover:bg-vibrant transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-[24px] border border-zinc-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">
              Preferences de notification
            </h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-bold text-sm">Taches</p>
                  <p className="text-xs text-zinc-400">Recevoir un email pour les nouvelles taches et deadlines</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_email_tasks === 1}
                  onChange={(e) => updateField('notify_email_tasks', e.target.checked ? 1 : 0)}
                  className="w-5 h-5 rounded border-zinc-300 text-vibrant focus:ring-vibrant"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-bold text-sm">Calendrier</p>
                  <p className="text-xs text-zinc-400">Rappels pour les evenements a venir</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_email_calendar === 1}
                  onChange={(e) => updateField('notify_email_calendar', e.target.checked ? 1 : 0)}
                  className="w-5 h-5 rounded border-zinc-300 text-vibrant focus:ring-vibrant"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-bold text-sm">Paiements</p>
                  <p className="text-xs text-zinc-400">Notifications de paiements recus</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_email_payments === 1}
                  onChange={(e) => updateField('notify_email_payments', e.target.checked ? 1 : 0)}
                  className="w-5 h-5 rounded border-zinc-300 text-vibrant focus:ring-vibrant"
                />
              </label>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-vibrant transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
