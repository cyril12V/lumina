
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onLogin?: () => void;
  onDashboard?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogin, onDashboard }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-md py-4 border-b border-zinc-100 shadow-sm' : 'bg-transparent py-8'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
          <div className="w-10 h-10 bg-vibrant rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <span className="text-2xl font-display tracking-tighter text-black uppercase">Lumina</span>
        </div>
        
        <div className="hidden md:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          <a href="#features" className="hover:text-vibrant transition-colors">Fonctions</a>
          <a href="#workflow" className="hover:text-vibrant transition-colors">Le Process</a>
          <a href="#ai" className="hover:text-vibrant transition-colors">Intelligence</a>
          <a href="#pricing" className="hover:text-vibrant transition-colors">Tarifs</a>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onDashboard}
            className="hidden sm:block px-6 py-3 border-2 border-vibrant text-vibrant text-[11px] font-bold uppercase tracking-widest hover:bg-vibrant hover:text-white transition-all rounded-full"
          >
            Dashboard
          </button>
          <button 
            onClick={onLogin}
            className="px-8 py-3 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-vibrant transition-all rounded-full"
          >
            Connexion
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
