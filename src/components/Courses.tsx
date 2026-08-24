import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const GIORNI = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

interface CourseCard {
  title: string;
  luogo: string;
  giorno: string;
  time: string;
  desc: string;
  btn: string;
}

const FALLBACK_COURSES: CourseCard[] = [
  {
    title: "Vinyasa Foundations",
    luogo: "Studio Arcadia Lab",
    giorno: "Martedì",
    time: "19:30 / 20:30",
    desc: "Una pratica fluida e accessibile, pensata per ritrovare le fondamenta del movimento. L’attenzione agli allineamenti rende questa lezione preziosa per costruire una base solida e consapevole.",
    btn: "Prenota Martedì"
  },
  {
    title: "Katonah Yoga Inspired",
    luogo: "Studio Arcadia Lab",
    giorno: "Mercoledì",
    time: "19:00 / 20:00",
    desc: "Una pratica dinamica che unisce geometria, respiro e immaginazione, ispirata al Katonah Yoga. Integra la fluidità del Vinyasa, la struttura dell’Ashtanga e i principi del taoismo.",
    btn: "Prenota Mercoledì"
  },
  {
    title: "Vinyasa Expansion",
    luogo: "Studio Arcadia Lab",
    giorno: "Giovedì",
    time: "19:00 — 20:00",
    desc: "Una pratica dinamica e creativa che riprende e sviluppa il lavoro del martedì. Aperta a tutti i livelli, pensata per chi desidera esplorare il movimento con curiosità e apertura.",
    btn: "Prenota Giovedì"
  }
];

export default function Courses() {
  const { preLancio } = useSiteSettings();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseCard[]>(FALLBACK_COURSES);

  const ctaHref = preLancio ? '#register' : user ? '/dashboard/bookings' : '#pricing';
  const ctaLabel = (btn: string) => preLancio ? btn : user ? 'Prenota lezione' : 'Abbonati';

  useEffect(() => {
    supabase.from('courses').select('*').eq('is_attivo', true).order('giorno_settimana').then(({ data }) => {
      if (!data || data.length === 0) return;
      setCourses(data.map(c => ({
        title: c.nome,
        luogo: c.luogo || 'Studio Arcadia Lab',
        giorno: GIORNI[c.giorno_settimana],
        time: `${c.ora_inizio.slice(0, 5)} / ${c.ora_fine.slice(0, 5)}`,
        desc: c.descrizione || '',
        btn: c.testo_pulsante || `Prenota ${GIORNI[c.giorno_settimana]}`
      })));
    });
  }, []);

  return (
    <section className="py-32 bg-surface-container-low overflow-hidden" id="courses">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="max-w-2xl"
          >
            <h2 className="text-4xl font-serif italic mb-6">Corsi Arcadia.</h2>
            <p className="text-on-surface-variant mt-2 max-w-lg">
              Tre appuntamenti settimanali pensati per ogni livello. Una pratica che radica, una che trasforma e una che espande.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {courses.map((course, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              whileHover={{ 
                y: -10,
                rotateX: i % 2 === 0 ? 2 : -2,
                transition: { duration: 0.4 }
              }}
              className="perspective-container group"
            >
              <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 border border-outline-variant/20 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-serif mb-1 transition-colors duration-300 group-hover:text-primary leading-tight">{course.title}</h3>
                    {course.luogo && (
                      <p className="text-on-surface-variant text-xs md:text-sm mb-3">{course.luogo}</p>
                    )}
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className="text-primary font-label tracking-wider text-[10px] md:text-xs uppercase px-3 py-1 bg-primary/10 rounded-full inline-block"
                    >
                      {course.giorno} • {course.time}
                    </motion.span>
                  </div>
                </div>
                
                <p className="text-on-surface-variant text-sm md:text-base mb-8 leading-relaxed flex-grow relative z-10">
                  {course.desc}
                </p>
                
                <motion.a
                  href={ctaHref}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 border border-primary/30 text-primary font-bold rounded-2xl bg-surface-container hover:bg-primary hover:text-white transition-all duration-400 text-center block relative z-10 shadow-sm text-sm"
                >
                  {ctaLabel(course.btn)}
                </motion.a>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

