import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Instagram, LayoutDashboard, LogOut } from 'lucide-react';

function PersonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { preLancio } = useSiteSettings();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Chi sono', href: '/#chi-sono', id: 'chi-sono' },
    { name: 'Studio', href: '/#studio', id: 'studio' },
    { name: 'Corsi', href: '/#courses', id: 'courses' },
    { name: 'Workshop', href: '/workshops', id: 'workshops' },
    { name: preLancio ? 'Iscriviti' : 'Abbonamenti', href: preLancio ? '/#register' : '/#pricing', id: 'pricing' },
  ];

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // link a pagine dedicate non vanno intercettati
    if (id === 'workshops') {
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      return;
    }
    if (location.pathname === '/') {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-700 ease-in-out ${
        isScrolled
          ? 'bg-surface/60 backdrop-blur-2xl py-4 border-b border-white/20 shadow-xl'
          : 'bg-transparent py-8'
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between lg:justify-start">

        {/* LOGO */}
        <div className="flex-1 flex justify-start">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="z-[60] relative">
            <Link to="/" className="flex items-center" onClick={handleLogoClick}>
              <div className="relative w-16 md:w-20 h-10 flex justify-center items-center mr-2">
                <img
                  src="https://fnvchbtcytugkrtnrvyj.supabase.co/storage/v1/object/public/Logo%20piattaforma/ARCADIA%20LAB%20(1).png"
                  alt="Arcadia Lab."
                  className="absolute h-[70px] md:h-[90px] object-contain drop-shadow-md max-w-none"
                />
              </div>
              <span className="text-2xl font-serif italic text-primary tracking-tight">Arcadia Lab.</span>
            </Link>
          </motion.div>
        </div>

        {/* DESKTOP NAV */}
        <div className="hidden lg:flex justify-center">
          <div className="flex gap-8 items-center">
            {navLinks.map((link) => (
              <motion.a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.id)}
                whileHover={{ y: -2 }}
                className="text-on-surface-variant font-label text-[11px] uppercase tracking-[0.2em] font-semibold hover:text-primary transition-all duration-300 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
              </motion.a>
            ))}
          </div>
        </div>

        {/* DESKTOP CTA */}
        <div className="hidden lg:flex flex-1 justify-end items-center gap-4">
          <motion.a
            href="https://www.instagram.com/arcadialab.cinzia/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="text-on-surface-variant hover:bg-primary hover:text-white transition-all duration-300 h-10 w-10 flex items-center justify-center rounded-full bg-surface-container-low"
          >
            <Instagram size={20} strokeWidth={1.5} />
          </motion.a>

          {user ? (
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 bg-surface-container border border-outline-variant/50 text-on-surface px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all hover:border-primary/40 hover:text-primary"
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all hover:bg-primary hover:text-white"
              >
                <LogOut size={14} />
                Esci
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/auth"
                  className="flex items-center gap-2 bg-surface-container border border-outline-variant/50 text-on-surface px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-bold transition-all hover:border-primary/40 hover:text-primary"
                >
                  <PersonIcon size={14} />
                  Accedi
                </Link>
              </motion.div>
              <Link to="/#register" onClick={(e) => handleNavClick(e, 'register')} className="flex">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-primary text-white px-8 py-3 rounded-full text-xs uppercase tracking-widest font-bold shadow-xl cursor-pointer"
                >
                  Prenota
                </motion.div>
              </Link>
            </div>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <div className="lg:hidden flex items-center z-[60]">
          <button
            className="text-primary p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <motion.span
              animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
              translate="no" className="material-symbols-outlined text-3xl font-light"
            >
              {isMobileMenuOpen ? 'close' : 'menu'}
            </motion.span>
          </button>
        </div>
      </div>

      {/* MOBILE FULLSCREEN MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-surface/95 backdrop-blur-2xl z-50 flex flex-col justify-center items-center h-screen w-screen px-6"
          >
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-surface-container-highest/30 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col gap-8 text-center w-full max-w-sm relative z-10">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: 'easeOut' }}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className="text-4xl font-serif italic text-on-surface hover:text-primary transition-colors duration-300"
                >
                  {link.name}
                </motion.a>
              ))}

              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
                transition={{ delay: navLinks.length * 0.05 + 0.05, duration: 0.4 }}
                href="https://www.instagram.com/arcadialab.cinzia/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                <Instagram size={24} strokeWidth={1} />
                <span className="font-serif italic text-xl">Instagram</span>
              </motion.a>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: navLinks.length * 0.05 + 0.1, duration: 0.4 }}
                className="mt-2 flex flex-col gap-3"
              >
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface px-8 py-4 rounded-full text-sm uppercase tracking-[0.2em] font-bold w-full active:scale-95 transition-transform text-center"
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center justify-center gap-2 bg-primary/10 text-primary px-8 py-4 rounded-full text-sm uppercase tracking-[0.2em] font-bold w-full active:scale-95 transition-transform"
                    >
                      <LogOut size={16} />
                      Esci
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface px-8 py-4 rounded-full text-sm uppercase tracking-[0.2em] font-bold w-full active:scale-95 transition-transform"
                    >
                      <PersonIcon size={16} />
                      Accedi
                    </Link>
                    <Link
                      to="/#register"
                      onClick={(e) => handleNavClick(e, 'register')}
                      className="block bg-primary text-white px-8 py-5 rounded-full text-sm uppercase tracking-[0.2em] font-bold w-full shadow-2xl active:scale-95 transition-transform text-center"
                    >
                      Prenota la tua lezione
                    </Link>
                  </>
                )}
              </motion.div>
            </div>

            <div className="absolute bottom-12 text-center w-full">
              <span className="font-serif italic text-on-surface-variant text-sm">Arcadia Lab.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
