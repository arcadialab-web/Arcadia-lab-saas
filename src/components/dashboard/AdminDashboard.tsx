import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, Euro, CalendarCheck, ArrowUpRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const T = '#b56a56';
const S = '#8ba888';
const COLORS = [T, S, '#c4a882', '#d2ccb6', '#b0c4b1', '#8b9dc3'];
const MESI   = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const GIORNI = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const card   = 'bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] p-6 shadow-sm';

const FILTRI_KEY = 'admin_incassi_filtri';

type TipoIncasso   = 'tutto' | 'abbonamenti' | 'eventi';
type PeriodoIncasso = 'oggi' | 'ieri' | 'settimana' | 'mese' | 'mese_scorso' | 'personalizzato';

const TIPO_OPZIONI: { id: TipoIncasso; label: string }[] = [
  { id: 'tutto',        label: 'Tutto' },
  { id: 'abbonamenti',  label: 'Abbonamenti' },
  { id: 'eventi',       label: 'Eventi speciali' },
];

const PERIODO_OPZIONI: { id: PeriodoIncasso; label: string }[] = [
  { id: 'oggi',           label: 'Oggi' },
  { id: 'ieri',           label: 'Ieri' },
  { id: 'settimana',      label: 'Questa settimana' },
  { id: 'mese',           label: 'Questo mese' },
  { id: 'mese_scorso',    label: 'Mese scorso' },
  { id: 'personalizzato', label: 'Personalizzato' },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function rangeIncassi(periodo: PeriodoIncasso, customStart: string, customEnd: string): [Date, Date] {
  const oggi = startOfDay(new Date());
  switch (periodo) {
    case 'oggi':
      return [oggi, new Date(oggi.getTime() + 86400000)];
    case 'ieri': {
      const ieri = new Date(oggi.getTime() - 86400000);
      return [ieri, oggi];
    }
    case 'settimana': {
      const giornoSett = (oggi.getDay() + 6) % 7; // lunedì = 0
      const inizio = new Date(oggi.getTime() - giornoSett * 86400000);
      return [inizio, new Date(oggi.getTime() + 86400000)];
    }
    case 'mese': {
      const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
      return [inizio, new Date(oggi.getTime() + 86400000)];
    }
    case 'mese_scorso': {
      const inizio = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
      const fine   = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
      return [inizio, fine];
    }
    case 'personalizzato': {
      const inizio = customStart ? startOfDay(new Date(customStart)) : oggi;
      const fineBase = customEnd ? startOfDay(new Date(customEnd)) : inizio;
      return [inizio, new Date(fineBase.getTime() + 86400000)];
    }
  }
}

function serieIncassi(righe: { created_at: string; prezzo_pagato: number | null }[], start: Date, end: Date) {
  const giorni = Math.round((end.getTime() - start.getTime()) / 86400000);

  if (giorni > 31) {
    // raggruppa per mese
    const arr: { label: string; ricavi: number }[] = [];
    const cursore = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursore < end) {
      const meseStart = new Date(cursore);
      const meseEnd   = new Date(cursore.getFullYear(), cursore.getMonth() + 1, 1);
      const ricavi = righe
        .filter(r => { const t = new Date(r.created_at).getTime(); return t >= meseStart.getTime() && t < meseEnd.getTime(); })
        .reduce((s, r) => s + (r.prezzo_pagato || 0), 0);
      arr.push({ label: MESI[cursore.getMonth()], ricavi });
      cursore.setMonth(cursore.getMonth() + 1);
    }
    return arr;
  }

  // raggruppa per giorno
  const arr: { label: string; ricavi: number }[] = [];
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
    const giornoStart = d.getTime();
    const giornoEnd   = giornoStart + 86400000;
    const ricavi = righe
      .filter(r => { const t = new Date(r.created_at).getTime(); return t >= giornoStart && t < giornoEnd; })
      .reduce((s, r) => s + (r.prezzo_pagato || 0), 0);
    arr.push({ label: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), ricavi });
  }
  return arr;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-outline-variant/40 rounded-2xl px-4 py-3 shadow-xl text-sm">
      <p className="font-label uppercase tracking-widest text-on-surface-variant text-[10px] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? T }} className="font-bold">
          {p.name?.toLowerCase().includes('ricav') ? `€ ${Number(p.value).toLocaleString('it-IT')}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ abbonatiAttivi: 0, ricaviMese: 0, totaleUtenti: 0, tassoRinnovo: 0 });
  const [planData, setPlanData]           = useState<{ name: string; value: number; color: string }[]>([]);
  const [attivita, setAttivita]           = useState<any[]>([]);

  const filtriSalvati = (() => {
    try { return JSON.parse(localStorage.getItem(FILTRI_KEY) || '{}'); } catch { return {}; }
  })();
  const [filtroTipo, setFiltroTipo]       = useState<TipoIncasso>(filtriSalvati.tipo ?? 'tutto');
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoIncasso>(filtriSalvati.periodo ?? 'mese');
  const [customStart, setCustomStart]     = useState<string>(filtriSalvati.customStart ?? '');
  const [customEnd, setCustomEnd]         = useState<string>(filtriSalvati.customEnd ?? '');
  const [loadingIncassi, setLoadingIncassi] = useState(true);
  const [incassi, setIncassi] = useState({ totale: 0, abbonamenti: 0, eventi: 0 });
  const [incassiSerie, setIncassiSerie] = useState<{ label: string; ricavi: number }[]>([]);

  useEffect(() => {
    localStorage.setItem(FILTRI_KEY, JSON.stringify({ tipo: filtroTipo, periodo: filtroPeriodo, customStart, customEnd }));
  }, [filtroTipo, filtroPeriodo, customStart, customEnd]);

  const loadIncassi = async () => {
    setLoadingIncassi(true);
    const [start, end] = rangeIncassi(filtroPeriodo, customStart, customEnd);
    const [{ data: subsData }, { data: ticketsData }] = await Promise.all([
      supabase.from('subscriptions').select('prezzo_pagato, created_at').eq('is_test', false).gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
      supabase.from('event_tickets').select('prezzo_pagato, created_at').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    ]);
    const abbonamenti = subsData?.reduce((s, r) => s + (r.prezzo_pagato || 0), 0) || 0;
    const eventi      = ticketsData?.reduce((s, r) => s + (r.prezzo_pagato || 0), 0) || 0;
    const totale = filtroTipo === 'abbonamenti' ? abbonamenti : filtroTipo === 'eventi' ? eventi : abbonamenti + eventi;

    const righe = filtroTipo === 'abbonamenti' ? (subsData || [])
      : filtroTipo === 'eventi' ? (ticketsData || [])
      : [...(subsData || []), ...(ticketsData || [])];

    setIncassi({ totale, abbonamenti, eventi });
    setIncassiSerie(serieIncassi(righe, start, end));
    setLoadingIncassi(false);
  };

  useEffect(() => { loadIncassi(); }, [filtroTipo, filtroPeriodo, customStart, customEnd]);

  const load = async () => {
    setLoading(true);
    const oggi = new Date();
    const startMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString();

    const [
      { count: abbonatiAttivi },
      { data: ricaviMeseSubData },
      { data: ricaviMeseTicketData },
      { count: totaleUtenti },
      { count: totSub },
      { data: activeSubs },
      { data: recentSubs },
    ] = await Promise.all([
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('stato', 'attivo'),
      supabase.from('subscriptions').select('prezzo_pagato').eq('is_test', false).gte('created_at', startMese),
      supabase.from('event_tickets').select('prezzo_pagato').gte('created_at', startMese),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plans(nome)').eq('stato', 'attivo'),
      supabase.from('subscriptions')
        .select('created_at, stato, prezzo_pagato, is_test, profiles(email, nome, cognome), plans(nome)')
        .order('created_at', { ascending: false }).limit(6),
    ]);

    const ricaviMese = (ricaviMeseSubData?.reduce((s, r) => s + (r.prezzo_pagato || 0), 0) || 0)
      + (ricaviMeseTicketData?.reduce((s, r) => s + (r.prezzo_pagato || 0), 0) || 0);
    const tassoRinnovo = totSub ? Math.round(((abbonatiAttivi || 0) / totSub) * 100) : 0;

    // Distribuzione piani
    const planCounts: Record<string, number> = {};
    (activeSubs as any[])?.forEach(s => {
      const nome = s.plans?.nome?.split('—')[1]?.trim() ?? s.plans?.nome ?? 'Altro';
      planCounts[nome] = (planCounts[nome] || 0) + 1;
    });
    const total = Object.values(planCounts).reduce((a, b) => a + b, 0);
    const planArr = Object.entries(planCounts).map(([name, count], i) => ({
      name,
      value: total ? Math.round((count / total) * 100) : 0,
      color: COLORS[i % COLORS.length],
    }));

    setKpis({ abbonatiAttivi: abbonatiAttivi || 0, ricaviMese, totaleUtenti: totaleUtenti || 0, tassoRinnovo });
    setPlanData(planArr);
    setAttivita(recentSubs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);


  const kpiCards = [
    { label: 'Abbonati attivi',  value: String(kpis.abbonatiAttivi),              icon: Users,         sub: 'abbonamenti in corso' },
    { label: 'Ricavi questo mese', value: `€ ${kpis.ricaviMese.toLocaleString('it-IT')}`, icon: Euro, sub: 'mese corrente' },
    { label: 'Utenti registrati', value: String(kpis.totaleUtenti),              icon: CalendarCheck,  sub: 'totale iscritti' },
    { label: 'Tasso attività',   value: `${kpis.tassoRinnovo}%`,                 icon: TrendingUp,    sub: 'abbonamenti attivi / totale' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant">
        <RefreshCw size={20} className="animate-spin mr-3 text-primary" />
        <span className="font-serif italic">Caricamento dati...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className={`${card} flex flex-col gap-4`}>
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <kpi.icon size={17} className="text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                <ArrowUpRight size={11} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-on-surface">{kpi.value}</p>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-0.5">{kpi.label}</p>
              <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analisi incassi */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className={card}>
        <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
          <div>
            <h3 className="font-serif text-xl text-on-surface">Analisi incassi</h3>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-0.5">Filtra per tipo e periodo</p>
          </div>
          <div className="text-right">
            {loadingIncassi ? (
              <RefreshCw size={18} className="animate-spin text-primary ml-auto" />
            ) : (
              <p className="text-2xl font-serif font-bold text-primary">€ {incassi.totale.toLocaleString('it-IT')}</p>
            )}
            <p className="text-xs text-on-surface-variant">Incassi nel periodo</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            {TIPO_OPZIONI.map(o => (
              <button key={o.id} onClick={() => setFiltroTipo(o.id)}
                className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${filtroTipo === o.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
            {PERIODO_OPZIONI.map(o => (
              <button key={o.id} onClick={() => setFiltroPeriodo(o.id)}
                className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-all ${filtroPeriodo === o.id ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary'}`}>
                {o.label}
              </button>
            ))}
            {filtroPeriodo === 'personalizzato' && (
              <>
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Dal</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    className="bg-surface border border-outline-variant/50 rounded-2xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Al</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    className="bg-surface border border-outline-variant/50 rounded-2xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
                </div>
              </>
            )}
          </div>
        </div>

        {(filtroTipo === 'tutto') && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl p-4 bg-surface-container">
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Abbonamenti</p>
              <p className="text-lg font-serif font-bold text-on-surface">€ {incassi.abbonamenti.toLocaleString('it-IT')}</p>
            </div>
            <div className="rounded-2xl p-4 bg-surface-container">
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Eventi speciali</p>
              <p className="text-lg font-serif font-bold text-on-surface">€ {incassi.eventi.toLocaleString('it-IT')}</p>
            </div>
          </div>
        )}

        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={incassiSerie} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#efebdf" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5a544c', fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5a544c', fontFamily: 'Manrope' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ricavi" name="Ricavi" stroke={T} strokeWidth={2.5} fill="url(#gR)" dot={{ fill: T, strokeWidth: 0, r: 3 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Distribuzione piani + Attività recente */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Piani */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className={card}>
          <h3 className="font-serif text-xl text-on-surface mb-1">Piani abbonamento</h3>
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">Distribuzione abbonati attivi</p>
          {planData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-on-surface-variant font-serif italic text-sm">Nessun abbonamento attivo</div>
          ) : (
            <div className="flex items-center gap-4">
              <div style={{ height: 190, flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {planData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Quota']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {planData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <div>
                      <p className="text-xs font-bold text-on-surface leading-tight">{p.name}</p>
                      <p className="text-xs text-on-surface-variant">{p.value}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Attività recente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }} className={card}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif text-xl text-on-surface">Attività recente</h3>
            <button onClick={load} className="text-on-surface-variant hover:text-primary transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          {attivita.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-on-surface-variant font-serif italic text-sm">Nessuna attività</div>
          ) : (
            <div className="space-y-3">
              {attivita.map((a: any, i) => {
                const nome = a.profiles?.nome
                  ? `${a.profiles.nome} ${a.profiles.cognome || ''}`.trim()
                  : a.profiles?.email ?? 'Utente';
                const piano = a.plans?.nome?.split('—')[1]?.trim() ?? a.plans?.nome ?? '—';
                const tempo = new Date(a.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-outline-variant/10 last:border-0">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: a.stato === 'attivo' ? S : '#e57373' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface truncate">
                        <strong>{nome}</strong> — {piano}
                        {a.is_test && (
                          <span className="ml-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">Test</span>
                        )}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{tempo} · {a.stato} · € {a.prezzo_pagato?.toFixed(0) ?? '—'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
