
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-24 bg-white border-t border-zinc-100">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-16 mb-24">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-vibrant rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
              </div>
              <span className="text-2xl font-display tracking-tighter text-black uppercase">Lumina</span>
            </div>
            <p className="text-zinc-500 max-w-sm text-lg leading-relaxed font-medium">
              Le futur de l'artisanat photographique commence ici. Simplifiez votre vie, sublimez votre talent.
            </p>
          </div>
          
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10 text-vibrant">La Solution</h4>
            <ul className="space-y-4 text-sm font-semibold text-zinc-400">
              <li><a href="#" className="hover:text-black transition-colors">Workspace</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Galeries Pro</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Intelligence IA</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Print-on-demand</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10 text-vibrant">Contact</h4>
            <ul className="space-y-4 text-sm font-semibold text-zinc-400">
              <li><a href="#" className="hover:text-black transition-colors">Support Artisan</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Communité</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Twitter (X)</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-zinc-100 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
          <p>© 2025 LUMINA DIGITAL ARTISANS. MADE WITH PASSION.</p>
          <div className="flex gap-10 mt-6 md:mt-0">
            <span className="hover:text-vibrant cursor-pointer">Privacy</span>
            <span className="hover:text-vibrant cursor-pointer">Terms</span>
            <span className="hover:text-vibrant cursor-pointer">Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
