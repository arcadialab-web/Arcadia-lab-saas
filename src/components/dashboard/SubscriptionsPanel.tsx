import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Abbonamento {
  id: string;
  stato: string;
  lezioni_totali: number;
  lezioni_usate: number;
  data_scadenza: string;
  prezzo_pagato: number | null;
  is_test: boolean;
  plans: { nome: string } | null;
  profiles: { nome: string | null; cognome: string | null; email: string | null; stripe_customer_id: string | null } | null;
  user_email: string;
}

const statoConfig = {
  attivo:        { label: 'Attivo',       color: '#8ba888', bg: 'rgba(139,168,136,0.12)', icon: CheckCircle2 },
  scaduto:       { label: 'Scaduto',      color: '#e57373', bg: 'rgba(229,115,115,0.1)',  icon: AlertCircle },
  'in-scadenza': { label: 'In scadenza',  color: '#f0a500', bg: 'rgba(240,165,0,0.1)',    icon: Clock },
  sospeso:       { label: 'Sospeso',      color: '#999',    bg: 'rgba(0,0,0,0.06)',        icon: Clock },
};

function getStato(row: Abbonamento): 'attivo' | 'scaduto' | 'in-scadenza' | 'sospeso' {
  if (row.stato === 'sospeso') return 'sospeso';
  if (row.stato === 'scaduto') return 'scaduto';
  const giorniRimasti = Math.ceil(
    (new Date(row.data_scadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (giorniRimasti <= 7 && giorniRimasti > 0) return 'in-scadenza';
  if (giorniRimasti <= 0) return 'scaduto';
  return 'attivo';
}

function getNome(row: Abbonamento) {
  const nome = row.profiles?.nome;
  const cognome = row.profiles?.cognome;
  if (nome || cognome) return [nome, cognome].filter(Boolean).join(' ');
  return row.user_email;
}

export default function SubscriptionsPanel() {
  const [abbonamenti, setAbbonamenti] = useState<Abbonamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'tutti' | 'attivo' | 'scaduto' | 'in-scadenza'>('tutti');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    // Legge subscriptions con join su profiles e plans
    const { data, error: dbError } = await supabase
      .from('subscriptions')
      .select(`
        id, stato, lezioni_totali, lezioni_usate,
        data_scadenza, prezzo_pagato, is_test,
        plans ( nome ),
        profiles ( nome, cognome, email, stripe_customer_id )
      `)
      .order('created_at', { ascending: false });

    if (dbError) {
      setError('Errore nel caricamento: ' + dbError.message);
      setLoading(false);
      return;
    }

    // Per ogni subscription recupera l'email dall'auth tramite user_id
    // (profiles.id = auth.users.id quindi usiamo una query separata)
    const enriched: Abbonamento[] = (data ?? []).map((row: any) => ({
      ...row,
      user_email: row.profiles?.email ?? row.profiles?.stripe_customer_id ?? '—',
    }));

    setAbbonamenti(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const computed = abbonamenti.map(a => ({ ...a, statoCalcolato: getStato(a) }));

  const filtered = computed.filter(a => {
    const nome = getNome(a).toLowerCase();
    const matchSearch = nome.includes(search.toLowerCase()) ||
      a.user_email.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'tutti' || a.statoCalcolato === filtro;
    return matchSearch && matchFiltro;
  });

  const counts = {
    attivo:        computed.filter(a => a.statoCalcolato === 'attivo').length,
    'in-scadenza': computed.filter(a => a.statoCalcolato === 'in-scadenza').length,
    scaduto:       computed.filter(a => a.statoCalcolato === 'scaduto').length,
  };

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Attivi',       count: counts.attivo,        color: '#8ba888' },
          { label: 'In scadenza',  count: counts['in-scadenza'], color: '#f0a500' },
          { label: 'Scaduti',      count: counts.scaduto,        color: '#e57373' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] p-5 text-center">
            <p className="text-3xl font-serif font-bold" style={{ color: s.color }}>
              {loading ? '—' : s.count}
            </p>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Errore */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl pl-10 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['tutti', 'attivo', 'in-scadenza', 'scaduto'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${filtro === f ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'}`}>
              {f === 'tutti' ? 'Tutti' : f === 'attivo' ? 'Attivi' : f === 'in-scadenza' ? 'In scadenza' : 'Scaduti'}
            </button>
          ))}
          <button onClick={load} className="p-2.5 rounded-2xl border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-colors" title="Aggiorna">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-on-surface-variant font-serif italic">Caricamento abbonamenti...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  {['Utente', 'Piano', 'Lezioni', 'Scadenza', 'Stato'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const stato = a.statoCalcolato;
                  const cfg = statoConfig[stato] ?? statoConfig.scaduto;
                  const usedPct = a.lezioni_totali > 0
                    ? Math.min((a.lezioni_usate / a.lezioni_totali) * 100, 100)
                    : 0;

                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container transition-colors"
                    >
                      {/* Utente */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {getNome(a).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                              {getNome(a)}
                              {a.is_test && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Test</span>
                              )}
                            </p>
                            <p className="text-xs text-on-surface-variant">{a.user_email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Piano */}
                      <td className="px-5 py-4 text-sm text-on-surface">
                        {a.plans?.nome ?? '—'}
                      </td>

                      {/* Lezioni */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
                          </div>
                          <span className="text-xs text-on-surface-variant whitespace-nowrap">
                            {a.lezioni_usate}/{a.lezioni_totali}
                          </span>
                        </div>
                      </td>

                      {/* Scadenza */}
                      <td className="px-5 py-4 text-sm text-on-surface whitespace-nowrap">
                        {new Date(a.data_scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Stato */}
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full w-fit" style={{ background: cfg.bg, color: cfg.color }}>
                          <cfg.icon size={11} strokeWidth={2} />
                          {cfg.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant">
                <p className="font-serif italic">
                  {abbonamenti.length === 0 ? 'Nessun abbonamento nel database.' : 'Nessun risultato trovato.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
