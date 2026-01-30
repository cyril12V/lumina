
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const WorkflowAnatomy: React.FC = () => {
  return (
    <section id="workflow" className="py-32 relative overflow-hidden bg-[#FCFBF7]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-24 items-center">
          <div className="flex-1 space-y-12">
            <h2 className="text-5xl md:text-7xl font-display leading-[0.9] tracking-tighter uppercase">
              UNE SESSION, <br /><span className="text-vibrant italic">ZÉRO FRICTION.</span>
            </h2>
            
            <div className="space-y-10">
              {[
                { title: "Acquisition & Brief", desc: "Le client remplit vos besoins. Lumina s'occupe de la paperasse et de la logistique." },
                { title: "Shooting Serein", desc: "Concentrez-vous sur la lumière. Nous gérons les rappels et les briefs techniques." },
                { title: "Sélection Express", desc: "Importez vos fichiers. L'IA fait le gros du travail. Vous gardez le contrôle final." },
                { title: "Livraison & Vente", desc: "Vos galeries sont des boutiques. Augmentez vos revenus grâce à la vente intégrée." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 group">
                   <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-vibrant flex items-center justify-center text-vibrant font-bold text-xs bg-white group-hover:bg-vibrant group-hover:text-white transition-all">
                        0{idx + 1}
                      </div>
                      {idx !== 3 && <div className="w-[2px] h-full bg-zinc-100 my-2"></div>}
                   </div>
                   <div className="pb-8">
                      <h4 className="text-xl font-display uppercase tracking-tight mb-2 text-black">{item.title}</h4>
                      <p className="text-zinc-500 text-sm leading-relaxed max-w-sm font-medium">{item.desc}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full lg:w-auto relative">
            <div className="bg-white p-6 rounded-[48px] shadow-2xl shadow-zinc-200 border border-zinc-100 relative z-10">
              <div className="bg-zinc-50 rounded-[32px] overflow-hidden p-8 space-y-8">
                <div className="flex justify-between items-center">
                   <div className="h-2 w-24 bg-zinc-200 rounded-full"></div>
                   <div className="h-8 w-8 bg-vibrant rounded-full"></div>
                </div>
                <div className="space-y-4">
                   <div className="h-4 w-full bg-zinc-100 rounded-lg"></div>
                   <div className="h-4 w-2/3 bg-zinc-100 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                   <div className="aspect-square bg-white rounded-2xl shadow-sm p-4 flex flex-col justify-end">
                      <div className="h-3 w-10 bg-vibrant/20 rounded-full mb-2"></div>
                      <div className="h-2 w-full bg-zinc-100 rounded-full"></div>
                   </div>
                   <div className="aspect-square bg-vibrant rounded-2xl shadow-lg p-4 text-white flex flex-col justify-center items-center text-center">
                      <CheckCircle2 className="w-8 h-8 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Done</span>
                   </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-vibrant rounded-full blur-[80px] opacity-20"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowAnatomy;
