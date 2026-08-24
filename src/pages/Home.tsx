import { useEffect } from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Philosophy from '../components/Philosophy';
import About from '../components/About';
import Studio from '../components/Studio';
import Courses from '../components/Courses';
import Workshops from '../components/Workshops';
import Pricing from '../components/Pricing';
import Testimonials from '../components/Testimonials';
import Registration from '../components/Registration';
import Footer from '../components/Footer';

export default function Home() {
  const { preLancio } = useSiteSettings();
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Small delay to ensure everything is rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [hash]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Philosophy />
      <About />
      <Studio />
      <Courses />
      <Workshops />
      <Pricing />
      <Testimonials />
      <Registration />
      <Footer />
      
      {/* FAB for quick booking */}
      <a href={preLancio ? '#register' : '#pricing'} className="fixed bottom-10 right-10 z-40 bg-primary text-on-primary w-16 h-16 rounded-full flex items-center justify-center shadow-xl hover:scale-105 hover:bg-opacity-90 transition-all duration-300 active:scale-95">
        <span translate="no" className="material-symbols-outlined">calendar_today</span>
      </a>
    </div>
  );
}
