
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-32 bg-[#F3F2EE] relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-24">
          <h2 className="text-6xl md:text-8xl font-display uppercase tracking-tighter mb-6 leading-none">VOTRE <span className="text-vibrant italic">LIBERTÉ.</span></h2>
          <p className="text-zinc-500 uppercase tracking-widest text-[11px] font-extrabold">Un abonnement simple pour des possibilités infinies.</p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
          {/* Plan Artisan */}
          <div className="p-16 bg-white rounded-[48px] border border-zinc-100 flex flex-col justify-between group hover:shadow-2xl hover:shadow-zinc-200 transition-all duration-500">
            <div>
              <div className="text-vibrant text-xs font-bold uppercase tracking-widest mb-6">Indépendant</div>
              <h3 className="text-4xl font-display mb-6 text-black uppercase tracking-tight">Artisan</h3>
              <div className="text-6xl font-display mb-12 text-black">29€<span className="text-sm text-zinc-400 font-sans font-medium lowercase tracking-normal ml-2">/mois</span></div>
              <ul className="space-y-6 mb-16">
                {["Projets Illimités", "Signature Contrats", "Galeries 100Go", "Tri IA (10 shoots/mois)"].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-zinc-600 font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-vibrant" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button className="w-full py-6 rounded-full border-2 border-vibrant text-vibrant uppercase text-xs font-bold tracking-widest hover:bg-vibrant hover:text-white transition-all">
              S'abonner maintenant
            </button>
          </div>

          {/* Plan Studio */}
          <div className="p-16 bg-vibrant rounded-[48px] text-white flex flex-col justify-between shadow-2xl shadow-vibrant/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <div className="w-40 h-40 bg-white rounded-full"></div>
            </div>
            <div>
              <div className="bg-white/20 inline-block px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">Le standard des pros</div>
              <h3 className="text-4xl font-display mb-6 uppercase tracking-tight">Studio</h3>
              <div className="text-6xl font-display mb-12">59€<span className="text-sm text-white/60 font-sans font-medium lowercase tracking-normal ml-2">/mois</span></div>
              <ul className="space-y-6 mb-16">
                {["Multi-utilisateurs", "Tri IA illimité", "Galeries 1To", "Vente automatisée", "Support prioritaire"].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button className="w-full py-6 rounded-full bg-white text-vibrant uppercase text-xs font-bold tracking-widest hover:bg-zinc-100 transition-all shadow-xl">
              Démarrer l'essai gratuit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
