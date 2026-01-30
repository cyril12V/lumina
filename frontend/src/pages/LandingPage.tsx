import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import WorkflowAnatomy from '../components/WorkflowAnatomy';
import AiAssistant from '../components/AiAssistant';
import Features from '../components/Features';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <Header
        onLogin={() => navigate('/auth')}
        onDashboard={() => navigate('/dashboard')}
      />
      <main className="flex-grow">
        <Hero onDashboard={() => navigate('/dashboard')} />

        <section className="py-12 border-y border-zinc-100 bg-white/50">
          <div className="container mx-auto px-6">
            <p className="text-center text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-bold mb-8 italic">
              Utilise par les studios de reference
            </p>
            <div className="flex flex-wrap justify-center gap-12 grayscale opacity-40 font-serif font-bold italic">
              <span className="text-xl">VOGUE</span>
              <span className="text-xl">LEICA</span>
              <span className="text-xl">HASSELBLAD</span>
              <span className="text-xl">TASCHEN</span>
            </div>
          </div>
        </section>

        <Features />
        <WorkflowAnatomy />
        <AiAssistant />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
