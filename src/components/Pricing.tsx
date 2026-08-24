import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useAuth } from '../context/AuthContext';

interface Plan {
  id: string;
  nome: string;
  descrizione: string;
  prezzo: number;
  lezioni_totali: number;
  durata_giorni: number;
  frequenza_sett: number | null;
  ordine: number;
}

// ── Modal email pre-checkout ──────────────────────────────────
function CheckoutModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [emailEsistente, setEmailEsistente] = useState(false);
  const [tesseraGiorni, setTesseraGiorni] = useState<number | null>(null);
  const { tesseraPrezzo } = useSiteSettings();
  const [includeTessera, setIncludeTessera] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Quando l'utente esce dal campo email: controlla se esiste già un account
  const checkEmail = async (email: string) => {
    const norm = email.toLowerCase().trim();
    if (!norm.includes('@')) return;

    setEmailEsistente(false);
    setTesseraGiorni(null);

    const { data } = await supabase
      .from('profiles')
      .select('tessera_scadenza')
      .eq('email', norm)
      .maybeSingle();

    if (data) {
      setEmailEsistente(true);
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan_id:          plan.id,
          email:            form.email.toLowerCase().trim(),
          nome:             form.nome.trim(),
          cognome:          form.cognome.trim(),
          telefono:         form.telefono.trim(),
          include_tessera:  includeTessera || undefined,
        },
      });
      if (data?.error === 'email_exists') {
        setEmailEsistente(true);
        setLoading(false);
        return;
      }
      if (fnError || !data?.url) throw new Error('Errore nella creazione del pagamento');
      window.location.href = data.url;
    } catch {
      setError('Si è verificato un errore. Riprova o contattaci.');
      setLoading(false);
    }
  };

  const inp = 'w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3.5 text-on-surface text-sm placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
  const lbl = 'block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2';

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full max-w-md mx-4 sm:mx-auto rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header fisso */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/10 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-label uppercase tracking-[0.25em] text-primary mb-1">Acquisto piano</p>
              <h3 className="font-serif text-lg leading-tight text-on-surface">{plan.nome}</h3>
              <p className="text-2xl font-bold text-on-surface mt-1">
                € {plan.prezzo.toFixed(0)}
                <span className="text-sm font-normal text-on-surface-variant ml-1">/ {plan.durata_giorni} giorni</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form scrollabile su schermi piccoli */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nome *</label>
              <input className={inp} required autoFocus type="text" placeholder="Es. Giulia" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Cognome</label>
              <input className={inp} type="text" placeholder="Es. Rossi" value={form.cognome} onChange={e => set('cognome', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Email *</label>
            <input
              className={`${inp} ${emailEsistente ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
              required type="email" inputMode="email" autoComplete="email"
              placeholder="nome@email.com" value={form.email}
              onChange={e => { set('email', e.target.value); setEmailEsistente(false); }}
              onBlur={e => checkEmail(e.target.value)}
            />
            {emailEsistente ? (
              <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
                <p className="text-xs text-red-700 leading-relaxed">
                  Esiste già un account con questa email. Effettua il <a href="/login" className="font-bold underline">login</a> per gestire il tuo abbonamento, oppure contattaci a{' '}
                  <a href="mailto:arcadialabyoga@gmail.com" className="font-bold underline">arcadialabyoga@gmail.com</a>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant mt-1.5">Le credenziali del tuo account verranno inviate qui.</p>
            )}
          </div>

          <div>
            <label className={lbl}>Telefono *</label>
            <input className={inp} required type="tel" inputMode="tel" autoComplete="tel" placeholder="+39 333 000 0000" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>

          {tesseraGiorni !== null && (
            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${includeTessera ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface-container-low'}`}>
              <input type="checkbox" checked={includeTessera} onChange={e => setIncludeTessera(e.target.checked)} className="mt-0.5 accent-primary w-4 h-4 flex-shrink-0" />
              <div>
                <p className={`text-sm font-bold ${tesseraGiorni <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
                  Rinnova anche la tessera associativa <span className="font-normal">(+ € {tesseraPrezzo})</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {tesseraGiorni <= 0 ? 'La tua tessera è scaduta.' : `La tua tessera scade tra ${tesseraGiorni} giorni.`} Puoi rinnovarla ora o in un secondo momento.
                </p>
              </div>
            </label>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || !form.email || !form.nome || !form.telefono || emailEsistente}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Preparazione pagamento...</>
              : <><ArrowRight size={16} /> Procedi al pagamento</>
            }
          </motion.button>

          <p className="text-center text-xs text-on-surface-variant pb-1">
            Pagamento sicuro tramite Stripe 🔒
          </p>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
}

async function directCheckout(planId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cognome, email, telefono, tessera_scadenza')
    .single();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('data_scadenza')
    .in('stato', ['attivo', 'in_attesa'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      plan_id:       planId,
      email:         profile?.email ?? '',
      nome:          profile?.nome ?? '',
      cognome:       profile?.cognome ?? '',
      telefono:      profile?.telefono ?? '',
      renewal_from:  sub?.data_scadenza ?? undefined,
    },
  });
  if (error || !data?.url) throw new Error('Errore checkout');
  window.location.href = data.url;
}

// ── Riga piano con bottone individuale ───────────────────────
function PlanRow({ plan }: { plan: Plan }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]     = useState(false);
  const { preLancio } = useSiteSettings();
  const { user } = useAuth();
  const durataNome = plan.nome.split('—')[1]?.trim() ?? plan.nome;

  const handleClick = async () => {
    if (preLancio) { window.location.href = '#register'; return; }
    if (user) {
      setLoading(true);
      try { await directCheckout(plan.id); } catch { setLoading(false); }
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-2xl border border-outline-variant/20 hover:border-primary/30 hover:bg-surface-container-low transition-all group/row">
        <div className="min-w-0">
          <p className="font-serif text-base text-on-surface">{durataNome}</p>
          {plan.descrizione && (
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary/60 mt-0.5">{plan.descrizione}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="text-xl font-bold text-on-surface">€ {plan.prezzo.toFixed(0)}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            disabled={loading}
            className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-60 flex items-center gap-1.5"
          >
            {loading ? <><Loader2 size={12} className="animate-spin" /> Attendi...</> : 'Scegli'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showModal && <CheckoutModal plan={plan} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}

// ── Pulsante piano (usato per i pacchetti) ────────────────────
function PlanButton({ plan, label = 'Inizia ora' }: { plan: Plan; label?: string }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]     = useState(false);
  const { preLancio } = useSiteSettings();
  const { user } = useAuth();

  const handleClick = async () => {
    if (preLancio) { window.location.href = '#register'; return; }
    if (user) {
      setLoading(true);
      try { await directCheckout(plan.id); } catch { setLoading(false); }
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <motion.button
        onClick={handleClick}
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 text-center border-2 border-primary/20 hover:border-primary hover:bg-primary hover:text-white text-primary font-bold rounded-2xl transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Attendi...</> : label}
      </motion.button>

      <AnimatePresence>
        {showModal && <CheckoutModal plan={plan} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}

// ── Raggruppa piani per frequenza ─────────────────────────────
function groupByFrequenza(plans: Plan[]) {
  const groups: Record<string, Plan[]> = {};
  for (const plan of plans) {
    const key = plan.frequenza_sett ? `${plan.frequenza_sett}` : 'pacchetto';
    if (!groups[key]) groups[key] = [];
    groups[key].push(plan);
  }
  return groups;
}

// ── Componente principale ─────────────────────────────────────
export default function Pricing() {
  const [plans, setPlans]   = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { tesseraPrezzo } = useSiteSettings();

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_attivo', true)
      .order('ordine', { ascending: true })
      .then(({ data }) => {
        if (data) setPlans(data);
        setLoading(false);
      });
  }, []);

  const groups     = groupByFrequenza(plans);
  const freqGroups = Object.entries(groups).filter(([k]) => k !== 'pacchetto');
  const pacchetti  = groups['pacchetto'] ?? [];

  return (
    <section className="py-24 md:py-32 bg-surface overflow-hidden" id="pricing">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            className="text-primary font-label tracking-[0.2em] uppercase text-sm block mb-4"
          >
            ABBONAMENTI
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif italic mb-6"
          >
            Unisciti ad Arcadia Lab.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-on-surface-variant max-w-xl mx-auto"
          >
            Scegli il ritmo che fa per te. Tutti gli abbonamenti danno accesso a qualsiasi delle lezioni settimanali.
          </motion.p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Loader2 className="animate-spin h-5 w-5 text-primary" />
              <span className="font-serif italic">Caricamento piani...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Piani per frequenza */}
            {freqGroups.length > 0 && (
              <div className="grid lg:grid-cols-3 gap-8 mb-16">
                {freqGroups.map(([freq, groupPlans], i) => (
                  <motion.div
                    key={freq}
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col hover:shadow-xl transition-all duration-500 group"
                  >
                    <div className="flex items-center gap-2 mb-10">
                      <div className="flex-shrink-0 w-11 h-11 rounded-full border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                        {freq}
                      </div>
                      <h3 className="text-lg md:text-xl font-serif whitespace-nowrap">
                        {freq === '1' ? 'volta' : 'volte'} / settimana
                      </h3>
                    </div>

                    <div className="space-y-3 mb-8 flex-grow">
                      {groupPlans.map((plan) => (
                        <PlanRow key={plan.id} plan={plan} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pacchetti */}
            {pacchetti.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="max-w-4xl mx-auto mb-10"
              >
                <div className="bg-primary-container/10 border-2 border-primary/10 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
                  <div className="relative z-10 text-center md:text-left">
                    <span className="bg-primary text-on-primary text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest mb-4 inline-block">Pacchetto Accesso</span>
                    <h3 className="text-3xl font-serif mb-3">{pack.nome}</h3>
                    {pack.descrizione && <p className="text-on-surface-variant max-w-sm">{pack.descrizione}</p>}
                  </div>
                  <div className="relative z-10 text-center md:text-right flex flex-col items-center md:items-end gap-4 min-w-[200px]">
                    <div className="text-5xl font-bold text-primary">€ {pack.prezzo.toFixed(0)}</div>
                    <PlanButton plan={pack} label="Acquista Pacchetto" />
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}

        {/* Note legali */}
        <div className="max-w-3xl mx-auto space-y-6 opacity-80 mt-8">
          <div className="flex items-start gap-4 p-6 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl text-sm italic group">
            <span translate="no" className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">info</span>
            <p>Gli abbonamenti sono nominativi e non rimborsabili. Il numero di lezioni è consecutivo su base settimanale.</p>
          </div>
          <div className="flex items-start gap-4 p-6 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl text-sm group">
            <span translate="no" className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">card_membership</span>
            <p>
              <strong className="text-on-surface uppercase tracking-wider text-xs block mb-1">Tessera associativa annuale — € {tesseraPrezzo}</strong>
              Obbligatoria per l'iscrizione. Include copertura assicurativa. Valida 365 giorni dall'acquisto. È richiesto il certificato medico di buona salute.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
