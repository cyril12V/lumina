
import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';

interface HeroProps {
  onDashboard?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onDashboard }) => {
  return (
    <section className="relative pt-48 pb-32 overflow-hidden bg-[#FCFBF7]">
      <div className="glow -top-20 -right-20"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vibrant/10 text-vibrant text-[11px] font-bold uppercase tracking-widest mb-10 border border-vibrant/20">
            <Zap className="w-3 h-3 fill-current" />
            L'artisanat numérique pour photographes
          </div>
          
          <h1 className="text-7xl md:text-9xl font-display leading-[0.85] mb-12 tracking-tighter text-black">
            L'IMAGE EST VOTRE <span className="text-vibrant italic">MÉTIER.</span><br /> 
            LUMINA EST VOTRE CADRE.
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-start gap-12 mt-16">
            <p className="text-xl text-zinc-500 max-w-xl leading-relaxed font-medium">
              Une plateforme tout-en-un pensée pour les artisans visuels. Libérez votre créativité en automatisant la gestion, du contrat à la galerie finale.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5">
              <button 
                onClick={onDashboard}
                className="group relative px-10 py-6 bg-black text-white font-bold uppercase tracking-widest flex items-center gap-4 hover:bg-vibrant transition-all rounded-full shadow-lg hover:shadow-vibrant/30"
              >
                Accéder au Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-24 right-[-2%] w-[42%] h-[75%] hidden lg:block">
        <div className="relative w-full h-full p-4 bg-white shadow-2xl rounded-[40px] rotate-3 overflow-hidden border border-zinc-100">
           <img 
            src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop" 
            alt="Photography Workflow" 
            className="w-full h-full object-cover rounded-[30px]"
          />
          <div className="absolute inset-0 bg-vibrant/5 pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
