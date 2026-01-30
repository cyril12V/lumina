import React from 'react';
import { Sparkles } from 'lucide-react';

const AiAssistant: React.FC = () => {
  return (
    <section id="ai" className="py-32 bg-white text-black relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vibrant/5 text-vibrant text-[11px] font-bold uppercase tracking-widest mb-6 border border-vibrant/10">
            <Sparkles className="w-4 h-4" />
            L'intelligence Lumina
          </div>
          <h2 className="text-6xl md:text-8xl font-display uppercase tracking-tighter mb-8 leading-[0.9]">
            PLANIFIEZ VOTRE <span className="text-vibrant italic">VISION.</span>
          </h2>
          <p className="text-zinc-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Notre assistant intelligent structure votre logistique et affine vos intentions creatives.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-[#F3F2EE] rounded-[48px] p-12 min-h-[300px] flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-vibrant opacity-5 blur-[100px]"></div>
            <div className="text-center">
              <p className="text-zinc-400 font-display uppercase tracking-widest text-sm mb-4">Bientot disponible</p>
              <p className="text-zinc-600 text-lg">L'assistant IA sera integre prochainement pour vous aider a planifier vos projets photo.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistant;
