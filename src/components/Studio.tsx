import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Studio() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [-100, 100]);

  return (
    <section ref={containerRef} className="py-32 bg-surface overflow-hidden" id="studio">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="lg:col-span-5 space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-serif">Un luogo, non solo uno spazio.</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              Situato all’interno del <span className="text-primary font-semibold">Parco dell’Acqua a Brescia</span>, Arcadia Lab. si trova nella Sala Energic Ambiente, con accesso diretto dal parco. Uno spazio luminoso e accogliente, dove il legno naturale delle travi, la luce che filtra dalle finestre affacciate sul verde e la quiete del parco creano un ambiente ideale per muoversi, respirare e ritrovare equilibrio.
            </p>
            
            <div className="space-y-6 pt-4">
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Sala+Energic+Ambiente+Largo+Torrelunga+7+Brescia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-6 p-4 rounded-2xl glass-dark border-none shadow-sm transition-all hover:bg-primary/5 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span translate="no" className="material-symbols-outlined text-primary group-hover:text-inherit">location_on</span>
                </div>
                <div>
                  <p className="font-serif group-hover:text-primary transition-colors">Sala Energic Ambiente</p>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest">Largo Torrelunga 7, Brescia</p>
                </div>
              </a>

              <motion.div 
                whileHover={{ x: 10 }}
                className="flex items-center gap-6 p-4 rounded-2xl glass border border-outline-variant/30 shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span translate="no" className="material-symbols-outlined text-primary">directions_walk</span>
                </div>
                <p className="text-sm text-on-surface-variant tracking-wide">Accesso diretto alla sala dall’ingresso del parco.</p>
              </motion.div>
            </div>
          </motion.div>

          <div className="lg:col-span-7 relative h-[500px] md:h-[650px]">
            {/* Background Image / Image 1 */}
            <motion.div 
              style={{ y: imageY }}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
              className="absolute top-0 right-0 w-[88%] h-[75%] rounded-3xl overflow-hidden shadow-xl border border-white/20 z-0"
            >
              <img
                alt="Sala Energic Ambiente - Arcadia Lab"
                className="w-full h-full object-cover"
                src="https://fnvchbtcytugkrtnrvyj.supabase.co/storage/v1/object/sign/Foto%20sito/struttura%20ok%20da%20usare%20.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81NzE2NTYwMS0yY2YzLTQzODUtOGE1Ni04ODdkZDI3MGY0OTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGb3RvIHNpdG8vc3RydXR0dXJhIG9rIGRhIHVzYXJlIC5wbmciLCJpYXQiOjE3Nzg3NTA0NTYsImV4cCI6MTkzNjQzMDQ1Nn0.JEZWt_MNV5f5K94549iyn3NguYiGPrr5ti51HJTRHNk"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Foreground Image / Image 2 */}
            <motion.div 
              initial={{ opacity: 0, x: -30, y: 50 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="absolute bottom-0 left-0 w-[55%] h-[50%] rounded-3xl overflow-hidden shadow-2xl border border-white/30 z-10"
            >
              <img
                alt="Arcadia Lab Studio View"
                className="w-full h-full object-cover"
                src="https://fnvchbtcytugkrtnrvyj.supabase.co/storage/v1/object/sign/Foto%20sito/ARCADIA%20SALA%20BIS.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81NzE2NTYwMS0yY2YzLTQzODUtOGE1Ni04ODdkZDI3MGY0OTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJGb3RvIHNpdG8vQVJDQURJQSBTQUxBIEJJUy5qcGciLCJpYXQiOjE3Nzg1MTc2NDUsImV4cCI6MTkzNjE5NzY0NX0.uVCQXuALwi5_Z0XRmaxbyFBheW8qebQ3tle78jgje_I"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

