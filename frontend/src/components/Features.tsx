
import React from 'react';
import { Camera, Layers, Shield, Sparkles } from 'lucide-react';

const Features: React.FC = () => {
  const features = [
    {
      title: "Gestion Juridique",
      description: "Des contrats clairs, signés en un clic. Protégez votre art sans complexité administrative.",
      icon: Shield
    },
    {
      title: "Culling Assisté",
      description: "Dites adieu aux heures de tri. Notre IA identifie vos meilleurs clichés en quelques secondes.",
      icon: Sparkles
    },
    {
      title: "Galeries Immersion",
      description: "Offrez à vos clients une expérience de visionnage à couper le souffle, digne d'une expo.",
      icon: Layers
    },
    {
      title: "Finance & Print",
      description: "Vendez vos tirages et gérez vos factures sur une interface unique et intuitive.",
      icon: Camera
    }
  ];

  return (
    <section id="features" className="py-32 bg-[#F3F2EE]">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group p-12 bg-white rounded-[32px] border border-zinc-100 hover:border-vibrant/40 transition-all duration-500 hover:shadow-xl hover:shadow-zinc-200/50">
              <div className="w-14 h-14 bg-vibrant text-white rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-display mb-4 text-black uppercase tracking-tight">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
