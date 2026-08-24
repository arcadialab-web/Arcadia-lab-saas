import { Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-surface-container w-full mt-24 border-t border-outline-variant/20" id="contacts">
      <div className="container mx-auto">
        <div className="max-w-4xl px-6 md:px-12 pt-20 pb-16">
          <div className="space-y-12">
            <div>
              <h2 className="text-5xl font-serif italic text-primary mb-4">Arcadia Lab.</h2>
              <p className="text-on-surface-variant text-lg">Inizia il tuo percorso con Arcadia Lab.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <h4 className="font-label uppercase text-xs tracking-widest font-bold text-on-surface">Indirizzo</h4>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Sala+Energic+Ambiente+Largo+Torrelunga+7+Brescia"
                  target="_blank" rel="noopener noreferrer"
                  className="text-on-surface-variant leading-relaxed hover:text-primary transition-colors block"
                >
                  Arcadia Lab. · Sala Energic.ambiente<br/>
                  (sopra Mondo Liquido)<br/>
                  C/O Parco Dell'Acqua<br/>
                  Largo Torrelunga 7, Brescia
                </a>
              </div>
              <div className="space-y-4">
                <h4 className="font-label uppercase text-xs tracking-widest font-bold text-on-surface">Contatti</h4>
                <div className="space-y-2">
                  <div className="text-on-surface-variant leading-relaxed">
                    <a href="tel:+393466770909" className="hover:text-primary transition-colors flex items-center gap-2">
                      <span translate="no" className="material-symbols-outlined text-sm">call</span>
                      +39 346 677 0909
                    </a>
                    <a href="mailto:arcadialabyoga@gmail.com" className="hover:text-primary transition-colors flex items-center gap-2 mt-1">
                      <span translate="no" className="material-symbols-outlined text-sm">mail</span>
                      arcadialabyoga@gmail.com
                    </a>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <a href="https://www.instagram.com/arcadialab.cinzia/" target="_blank" rel="noopener noreferrer"
                      className="text-on-surface-variant hover:text-primary transition-all flex items-center gap-2 group"
                    >
                      <Instagram size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">@arcadialab.cinzia</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-10 w-full gap-6 border-t border-outline-variant/20">
          <div className="flex flex-col space-y-1 text-center md:text-left">
            <p className="font-label text-xs tracking-widest uppercase text-on-surface-variant/70">
              © {new Date().getFullYear()} Arcadia Lab.
            </p>
            <p className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant/50">
              P.IVA: 04712510983
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <Link className="font-label text-xs tracking-widest uppercase text-on-surface-variant/70 hover:text-primary transition-colors" to="/privacy-policy">Privacy Policy</Link>
            <Link className="font-label text-xs tracking-widest uppercase text-on-surface-variant/70 hover:text-primary transition-colors" to="/terms-of-service">Terms of Service</Link>
            <Link className="font-label text-xs tracking-widest uppercase text-on-surface-variant/70 hover:text-primary transition-colors" to="/cookie-policy">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
