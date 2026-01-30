import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { team, auth } from '../lib/api';

interface InvitationInfo {
  team_name: string;
  inviter_name: string;
  inviter_email: string;
  role: string;
  email: string;
}

const JoinTeam: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);

  const isAuthenticated = auth.isAuthenticated();

  useEffect(() => {
    if (token) {
      loadInvitationInfo();
    }
  }, [token]);

  const loadInvitationInfo = async () => {
    try {
      setLoading(true);
      const data = await team.getInvitationInfo(token!);
      setInvitation(data);
    } catch (err: any) {
      setError(err.message || 'Invitation invalide ou expiree');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Store the token and redirect to auth
      localStorage.setItem('pendingTeamInvitation', token!);
      navigate('/auth');
      return;
    }

    try {
      setAccepting(true);
      setError('');
      await team.acceptInvitation(token!);
      setSuccess(true);

      // Refresh user data
      const userData = await auth.me();
      if (userData) {
        auth.setSession(localStorage.getItem('token')!, userData);
      }

      // Redirect after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'acceptation');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietaire';
      case 'admin': return 'Administrateur';
      case 'member': return 'Membre';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-vibrant mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-display uppercase tracking-tight mb-4">
            Bienvenue !
          </h1>
          <p className="text-zinc-500 mb-6">
            Vous avez rejoint l'equipe <span className="font-bold text-black">{invitation?.team_name}</span>
          </p>
          <p className="text-sm text-zinc-400">Redirection vers le dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-vibrant transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au site
        </button>

        <div className="bg-white rounded-3xl p-12 shadow-xl">
          {error ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-display uppercase tracking-tight mb-4">
                Invitation Invalide
              </h1>
              <p className="text-zinc-500 mb-8">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-black text-white rounded-full text-sm font-bold uppercase tracking-wider hover:bg-vibrant transition-colors"
              >
                Retour a l'accueil
              </button>
            </div>
          ) : invitation ? (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-vibrant/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-vibrant" />
                </div>
                <h1 className="text-3xl font-display uppercase tracking-tight mb-2">
                  Rejoindre l'equipe
                </h1>
                <p className="text-zinc-500">
                  Vous etes invite a rejoindre une equipe
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">
                    Equipe
                  </p>
                  <p className="text-lg font-bold text-black">{invitation.team_name}</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">
                    Invite par
                  </p>
                  <p className="text-lg font-bold text-black">
                    {invitation.inviter_name || invitation.inviter_email}
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">
                    Votre role
                  </p>
                  <p className="text-lg font-bold text-black">{getRoleLabel(invitation.role)}</p>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6">
                  <p className="text-sm text-amber-800">
                    Vous devez vous connecter ou creer un compte pour accepter cette invitation.
                  </p>
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest rounded-full hover:bg-vibrant transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Traitement...
                  </>
                ) : isAuthenticated ? (
                  'Accepter l\'invitation'
                ) : (
                  'Se connecter pour accepter'
                )}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default JoinTeam;
