import { motion } from "framer-motion";

export default function Philosophy() {
  return (
    <section className="py-32 bg-surface overflow-hidden" id="philosophy">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto text-center mb-24"
        >
          <span className="text-primary font-label tracking-[0.2em] uppercase text-sm block mb-6">Filosofia</span>
          <h2 className="text-4xl md:text-5xl font-serif mb-8 italic">Arcadia è un luogo di presenza.</h2>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Qui il movimento diventa ascolto, il respiro diventa equilibrio, la pratica diventa trasformazione.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { 
              icon: "auto_awesome", 
              title: "Autenticità", 
              desc: "Onorare il corpo in ogni gesto, lasciando che la percezione interna orienti il movimento" 
            },
            { 
              icon: "self_improvement", 
              title: "Presenza", 
              desc: "Essere qui, nel movimento che si apre e nel respiro che guida" 
            },
            { 
              icon: "bolt", 
              title: "Movimento", 
              desc: "Rinforzare i muscoli, risvegliare l’energia, trovare stabilità attraverso il movimento" 
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              whileHover={{ 
                rotateX: 5, 
                rotateY: 5, 
                y: -10,
                transition: { duration: 0.3 } 
              }}
              className="perspective-container h-full"
            >
              <div className="group p-10 bg-surface-container-low rounded-3xl space-y-6 transition-all duration-500 border border-outline-variant/30 text-center flex flex-col items-center hover:shadow-[0_40px_80px_-15px_rgba(181,106,86,0.15)] hover:bg-white glass-dark h-full">
                <motion.span 
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  translate="no" className="material-symbols-outlined text-primary font-light" 
                  style={{ fontSize: '100px' }}
                >
                  {item.icon}
                </motion.span>
                <h3 className="text-2xl font-serif">{item.title}</h3>
                <p className="text-on-surface-variant leading-relaxed flex-grow">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

