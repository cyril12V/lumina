import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { auth } from '../lib/api';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;

      if (mode === 'signup') {
        response = await auth.register(email, password, fullName);
      } else {
        response = await auth.login(email, password);
      }

      if (response.token && response.user) {
        auth.setSession(response.token, response.user);

        // Check for pending team invitation
        const pendingInvitation = localStorage.getItem('pendingTeamInvitation');
        if (pendingInvitation) {
          localStorage.removeItem('pendingTeamInvitation');
          navigate(`/join-team/${pendingInvitation}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Reponse invalide du serveur');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FCFBF7] text-black">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#F3F2EE]">
        <img
          src="https://images.unsplash.com/photo-1493863641943-9b68992a8d07?q=80&w=2058&auto=format&fit=crop"
          alt="Artisan studio"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply grayscale"
        />
        <div className="absolute inset-0 bg-vibrant/10"></div>

        <div className="absolute bottom-24 left-24 max-w-sm">
          <div className="w-20 h-2 bg-vibrant mb-10 rounded-full"></div>
          <p className="text-6xl font-display uppercase tracking-tighter leading-none text-black mb-8">
            L'ART DE <span className="text-vibrant italic">CREER.</span>
          </p>
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500 font-extrabold">
            Lumina Workspace
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-24 justify-center relative">
        <button
          onClick={() => navigate('/')}
          className="absolute top-12 left-8 md:left-24 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-vibrant transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au site
        </button>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-16">
            <h2 className="text-6xl md:text-7xl font-display uppercase tracking-tighter mb-6 leading-none">
              {mode === 'login' ? 'HELLO.' : 'WELCOME.'}
            </h2>
            <p className="text-zinc-500 text-xl font-medium">
              {mode === 'login'
                ? 'Pret pour votre prochaine seance ?'
                : 'Rejoignez la nouvelle ere creative.'}
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-10" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="group border-b-2 border-zinc-100 focus-within:border-vibrant transition-all pb-4">
                <label className="block text-[10px] uppercase tracking-widest text-vibrant mb-3 font-bold">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent outline-none text-2xl font-display uppercase py-1 text-black placeholder:text-zinc-200"
                  placeholder="Jean Dupont"
                  required
                />
              </div>
            )}

            <div className="group border-b-2 border-zinc-100 focus-within:border-vibrant transition-all pb-4">
              <label className="block text-[10px] uppercase tracking-widest text-vibrant mb-3 font-bold">
                Adresse Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none text-2xl font-display uppercase py-1 text-black placeholder:text-zinc-200"
                placeholder="hello@studio.art"
                required
              />
            </div>

            <div className="group border-b-2 border-zinc-100 focus-within:border-vibrant transition-all pb-4">
              <label className="block text-[10px] uppercase tracking-widest text-vibrant mb-3 font-bold">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-2xl font-display uppercase py-1 text-black placeholder:text-zinc-200"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full py-7 bg-black text-white font-bold uppercase tracking-widest flex items-center justify-center gap-4 rounded-full hover:bg-vibrant transition-all shadow-xl hover:shadow-vibrant/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Entrer au Studio' : 'Commencer le Voyage'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-20 text-center">
            <p className="text-zinc-400 text-[11px] uppercase tracking-widest font-extrabold">
              {mode === 'login' ? 'Nouveau ici ?' : 'Deja membre ?'}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
                className="ml-4 text-vibrant hover:underline underline-offset-[12px]"
              >
                {mode === 'login' ? 'Creer un acces' : 'Se connecter'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
