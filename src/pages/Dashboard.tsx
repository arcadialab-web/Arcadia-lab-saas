import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2, Pencil, Check } from 'lucide-react';
import {
  LayoutDashboard, BarChart2, CreditCard, Users,
  Settings, CalendarCheck, BookOpen, Star, PackagePlus,
  CheckCircle2, XCircle, Lock, Mail, AlertCircle, Inbox,
  Phone, Award, FileText, Calendar, UserPlus, Euro,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import UserDashboard from '../components/dashboard/UserDashboard';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import SubscriptionsPanel from '../components/dashboard/SubscriptionsPanel';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import MyLessonsPanel from '../components/dashboard/MyLessonsPanel';
import PlansManagementPanel from '../components/dashboard/PlansManagementPanel';
import CoursesManagementPanel from '../components/dashboard/CoursesManagementPanel';
import EventsManagementPanel from '../components/dashboard/EventsManagementPanel';
import EmailMarketingPanel from '../components/dashboard/EmailMarketingPanel';
import LeadsPanel from '../components/dashboard/LeadsPanel';
import CourseBookingsPanel from '../components/dashboard/CourseBookingsPanel';

const ADMIN_EMAILS = ['ai.danielcorso@gmail.com', 'arcadialabyoga@gmail.com'];

const adminNav = [
  { id: 'overview',       label: 'Panoramica',        icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
  { id: 'analytics',      label: 'Analytics sito',    icon: <BarChart2 size={17} strokeWidth={1.5} /> },
  { id: 'plans',          label: 'Piani & Prezzi',    icon: <PackagePlus size={17} strokeWidth={1.5} /> },
  { id: 'courses',        label: 'Corsi',             icon: <CalendarCheck size={17} strokeWidth={1.5} /> },
  { id: 'events',         label: 'Eventi Speciali',   icon: <Star size={17} strokeWidth={1.5} /> },
  { id: 'subscriptions',  label: 'Abbonamenti',       icon: <CreditCard size={17} strokeWidth={1.5} /> },
  { id: 'users',          label: 'Utenti',            icon: <Users size={17} strokeWidth={1.5} /> },
  { id: 'bookings',       label: 'Prenotazioni',      icon: <BookOpen size={17} strokeWidth={1.5} /> },
  { id: 'email',          label: 'Email Marketing',   icon: <Mail size={17} strokeWidth={1.5} /> },
  { id: 'leads',          label: 'Contatti',          icon: <Inbox size={17} strokeWidth={1.5} /> },
  { id: 'settings',       label: 'Impostazioni',      icon: <Settings size={17} strokeWidth={1.5} /> },
];

const userNav = [
  { id: 'overview',  label: 'Il mio spazio',  icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
  { id: 'lessons',   label: 'Le mie lezioni', icon: <CalendarCheck size={17} strokeWidth={1.5} /> },
  { id: 'plan',      label: 'Abbonamento',    icon: <Star size={17} strokeWidth={1.5} /> },
  { id: 'bookings',  label: 'Prenotazioni',   icon: <BookOpen size={17} strokeWidth={1.5} /> },
  { id: 'events',    label: 'I miei eventi',  icon: <BarChart2 size={17} strokeWidth={1.5} /> },
  { id: 'settings',  label: 'Impostazioni',   icon: <Settings size={17} strokeWidth={1.5} /> },
];

function UnlockModal({ utente, onClose, onDone }: { utente: any; onClose: () => void; onDone: () => void }) {
  const [certScadenza, setCertScadenza] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSblocca = async () => {
    setLoading(true);
    const oggiStr = new Date().toISOString().split('T')[0];
    // Inizio corsi 2026: chi si abbona prima non perde giorni (eccezione valida solo per quest'anno)
    const dataInizioStr = oggiStr < '2026-09-08' ? '2026-09-08' : oggiStr;

    // Aggiorna profilo
    await supabase.from('profiles').update({
      prenotazioni_sbloccate: true,
      cert_medico_scadenza: certScadenza || null,
    }).eq('id', utente.id);

    // Attiva abbonamenti in_attesa → calcola date da inizio corsi (o da oggi se già iniziati)
    const subInAttesa = (utente.subscriptions ?? []).find((s: any) => s.stato === 'in_attesa');
    let dataScadenzaAttivata: string | null = null;
    let planNomeAttivato: string | null = null;
    if (subInAttesa) {
      const scad = new Date(dataInizioStr + 'T00:00:00');
      scad.setDate(scad.getDate() + subInAttesa.durata_giorni);
      dataScadenzaAttivata = scad.toISOString().split('T')[0];
      await supabase.from('subscriptions').update({
        stato:         'attivo',
        data_inizio:   dataInizioStr,
        data_scadenza: dataScadenzaAttivata,
      }).eq('id', subInAttesa.id);

      // Leggi nome piano per l'email
      const { data: planData } = await supabase.from('plans').select('nome').eq('id', subInAttesa.plan_id).single();
      planNomeAttivato = planData?.nome ?? null;
    }

    // Invia email di attivazione all'utente e notifica admin
    const nomeDisplay = [utente.nome, utente.cognome].filter(Boolean).join(' ') || utente.email;
    await supabase.functions.invoke('notify-activation', {
      body: {
        email:       utente.email,
        nome:        nomeDisplay,
        planNome:    planNomeAttivato,
        dataScadenza: dataScadenzaAttivata,
      },
    });

    setLoading(false);
    onDone();
  };

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/10 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-label uppercase tracking-[0.25em] text-primary mb-1">Sblocca utente</p>
            <h3 className="font-serif text-lg text-on-surface">{utente.nome ? `${utente.nome} ${utente.cognome || ''}`.trim() : utente.email}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
              Scadenza certificato medico <span className="text-on-surface-variant/50">(opzionale)</span>
            </label>
            <input type="date" value={certScadenza} onChange={e => setCertScadenza(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <p className="text-xs text-on-surface-variant mt-1.5">Se inserita, l'utente verrà bloccato automaticamente alla scadenza.</p>
          </div>
          {(utente.subscriptions ?? []).some((s: any) => s.stato === 'in_attesa') && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span className="flex-shrink-0">⚠️</span>
              L'utente ha un abbonamento in attesa — verrà attivato da oggi (o dall'8 settembre 2026 se sblocchi prima di allora).
            </div>
          )}
          <button onClick={handleSblocca} disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Attendere...</> : <><CheckCircle2 size={16} /> Sblocca prenotazioni</>}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function UsersPanel() {
  const [utenti, setUtenti]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [unlockTarget, setUnlockTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => {
    supabase
      .from('profiles')
      .select('id, nome, cognome, email, telefono, created_at, role, prenotazioni_sbloccate, tessera_scadenza, cert_medico_scadenza, subscriptions(id, data_inizio, data_scadenza, stato, durata_giorni, prezzo_pagato, lezioni_totali, lezioni_usate, created_at, plans(nome))')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUtenti(data || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const blocca = async (id: string) => {
    await supabase.from('profiles').update({ prenotazioni_sbloccate: false }).eq('id', id);
    load();
  };

  if (loading) return <div className="text-center py-16 font-serif italic text-on-surface-variant">Caricamento utenti...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
        <Lock size={14} className="flex-shrink-0 mt-0.5 text-blue-600" strokeWidth={1.5} />
        <p>Clicca su <strong>"Sblocca"</strong> per abilitare le prenotazioni dopo aver ricevuto il certificato medico. Puoi inserire la data di scadenza del certificato per blocco automatico.</p>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
        >
          <UserPlus size={14} strokeWidth={2} /> Aggiungi utente
        </button>
      </div>
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20">
                {['Utente', 'Iscrizione', 'Inizio Abbonamento', 'Scad. Abbonamento', 'Scad. Tessera', 'Cert. Medico', 'Ruolo', 'Prenotazioni'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utenti.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 font-serif italic text-on-surface-variant">Nessun utente registrato</td></tr>
              ) : utenti.map((u) => {
                const displayName = u.nome ? `${u.nome} ${u.cognome || ''}`.trim() : (u.email ?? 'Utente');
                const isAdmin = u.role === 'admin';
                const subAttivo = (u.subscriptions ?? []).find((s: any) => s.stato === 'attivo' || s.stato === 'in_attesa');
                const inizioAbb = subAttivo?.data_inizio ? new Date(subAttivo.data_inizio) : null;
                const scadAbb = subAttivo?.data_scadenza ? new Date(subAttivo.data_scadenza) : null;
                const scadTessera = u.tessera_scadenza ? new Date(u.tessera_scadenza) : null;
                const scadCert = u.cert_medico_scadenza ? new Date(u.cert_medico_scadenza) : null;
                const oggi = new Date(); oggi.setHours(0,0,0,0);
                const giorniAbb  = scadAbb    ? Math.ceil((scadAbb.getTime()    - oggi.getTime()) / 86400000) : null;
                const giorniTess = scadTessera ? Math.ceil((scadTessera.getTime() - oggi.getTime()) / 86400000) : null;
                const giorniCert = scadCert   ? Math.ceil((scadCert.getTime()   - oggi.getTime()) / 86400000) : null;
                const fmtData = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                const scadClass = (giorni: number | null) => giorni === null ? 'text-on-surface-variant' : giorni <= 3 ? 'text-red-600 font-bold' : giorni <= 7 ? 'text-amber-600 font-semibold' : 'text-on-surface-variant';
                const subInAttesa = (u.subscriptions ?? []).some((s: any) => s.stato === 'in_attesa');
                return (
                  <tr key={u.id} onClick={() => setDetailTarget(u)} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container transition-colors cursor-pointer">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{displayName}</p>
                          <p className="text-xs text-on-surface-variant">{u.email ?? '—'}</p>
                          {subInAttesa && <p className="text-[10px] font-bold text-amber-600 mt-0.5">Abbonamento in attesa</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {subInAttesa ? '—' : (inizioAbb ? fmtData(inizioAbb) : '—')}
                    </td>
                    <td className="px-5 py-4">
                      {subInAttesa
                        ? <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">In attesa cert.</span>
                        : <><span className={`text-sm ${scadClass(giorniAbb)}`}>{scadAbb ? fmtData(scadAbb) : '—'}</span>
                          {giorniAbb !== null && giorniAbb <= 7 && <p className={`text-xs mt-0.5 ${giorniAbb <= 3 ? 'text-red-500' : 'text-amber-500'}`}>{giorniAbb <= 0 ? 'Scaduto' : `tra ${giorniAbb}g`}</p>}</>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm ${scadClass(giorniTess)}`}>{scadTessera ? fmtData(scadTessera) : '—'}</span>
                      {giorniTess !== null && giorniTess <= 7 && <p className={`text-xs mt-0.5 ${giorniTess <= 3 ? 'text-red-500' : 'text-amber-500'}`}>{giorniTess <= 0 ? 'Scaduta' : `tra ${giorniTess}g`}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {scadCert
                        ? <><span className={`text-sm ${scadClass(giorniCert)}`}>{fmtData(scadCert)}</span>
                          {giorniCert !== null && giorniCert <= 30 && <p className={`text-xs mt-0.5 ${giorniCert <= 0 ? 'text-red-500' : giorniCert <= 7 ? 'text-amber-500' : 'text-on-surface-variant'}`}>{giorniCert <= 0 ? 'Scaduto' : `tra ${giorniCert}g`}</p>}</>
                        : <span className="text-xs text-on-surface-variant">—</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{
                        background: isAdmin ? 'rgba(181,106,86,0.12)' : 'rgba(139,168,136,0.15)',
                        color:      isAdmin ? '#b56a56' : '#8ba888',
                      }}>
                        {isAdmin ? 'Admin' : 'Utente'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {isAdmin ? (
                        <span className="text-xs text-on-surface-variant">—</span>
                      ) : u.prenotazioni_sbloccate ? (
                        <button onClick={e => { e.stopPropagation(); blocca(u.id); }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
                        >
                          <CheckCircle2 size={12} /> Sbloccate
                        </button>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setUnlockTarget(u); }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <XCircle size={12} /> Bloccate — Sblocca
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {unlockTarget && (
          <UnlockModal utente={unlockTarget} onClose={() => setUnlockTarget(null)} onDone={() => { setUnlockTarget(null); load(); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {detailTarget && (
          <UserDetailModal utente={detailTarget} onClose={() => setDetailTarget(null)} onSaved={load} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {addOpen && (
          <AddUserModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Modal aggiungi utente manualmente (pagamento contanti) ─────
function AddUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { tesseraPrezzo, requireMedicalCert } = useSiteSettings();
  const [piani, setPiani] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [planId, setPlanId] = useState('');
  const [aggiungiTessera, setAggiungiTessera] = useState(false);
  const [importoPagato, setImportoPagato] = useState('');
  const [sbloccaPrenotazioni, setSbloccaPrenotazioni] = useState(false);
  const [isTest, setIsTest] = useState(false);
  const [importoTouched, setImportoTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('plans').select('*').eq('is_attivo', true).order('ordine')
      .then(({ data }) => {
        setPiani(data || []);
        if (data && data.length > 0) setPlanId(data[0].id);
      });
  }, []);

  const planSelezionato = piani.find(p => p.id === planId);

  // Precompila l'importo pagato in base al piano + tessera, finché l'admin non lo modifica manualmente
  useEffect(() => {
    if (importoTouched || !planSelezionato) return;
    const totale = Number(planSelezionato.prezzo ?? 0) + (aggiungiTessera ? tesseraPrezzo : 0);
    setImportoPagato(String(totale));
  }, [planSelezionato, aggiungiTessera, tesseraPrezzo, importoTouched]);

  const handleSubmit = async () => {
    setError('');
    if (!nome.trim() || !cognome.trim() || !email.trim() || !planId) {
      setError('Compila nome, cognome, email e seleziona un piano.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
        body: {
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
          plan_id: planId,
          aggiungi_tessera: aggiungiTessera,
          importo_pagato: importoPagato === '' ? 0 : Number(importoPagato),
          sblocca_prenotazioni: sbloccaPrenotazioni,
          is_test: isTest,
        },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message || 'Errore sconosciuto');
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Errore durante la creazione dell\'utente.');
      setLoading(false);
    }
  };

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full max-w-lg mx-auto rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/10 flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-label uppercase tracking-[0.25em] text-primary mb-1">Nuovo utente</p>
            <h3 className="font-serif text-lg text-on-surface">Aggiungi utente manualmente</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
            <Euro size={14} className="flex-shrink-0 mt-0.5 text-blue-600" strokeWidth={1.5} />
            <p>Usa questo form per registrare un cliente che ha pagato in contanti o di persona. Verrà creato l'account e inviata l'email di benvenuto con le credenziali, senza passare da Stripe.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">Nome *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">Cognome *</label>
              <input value={cognome} onChange={e => setCognome(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">Telefono</label>
            <input value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">Piano abbonamento *</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {piani.map(p => (
                <option key={p.id} value={p.id}>{p.nome} — € {Number(p.prezzo).toLocaleString('it-IT')}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-on-surface cursor-pointer">
            <input type="checkbox" checked={aggiungiTessera} onChange={e => setAggiungiTessera(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Aggiungi tessera associativa annuale (€ {tesseraPrezzo.toLocaleString('it-IT')})
          </label>

          {requireMedicalCert && (
            <label className="flex items-center gap-2.5 text-sm text-on-surface cursor-pointer">
              <input type="checkbox" checked={sbloccaPrenotazioni} onChange={e => setSbloccaPrenotazioni(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              Certificato medico già ricevuto — sblocca subito le prenotazioni
            </label>
          )}

          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5">Importo pagato (€)</label>
            <input
              type="number" min="0" step="0.01" value={importoPagato}
              onChange={e => { setImportoTouched(true); setImportoPagato(e.target.value); }}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1.5 text-xs text-on-surface-variant">
              Precompilato in base al piano scelto, modificabile liberamente.{' '}
              {isTest ? 'Non verrà conteggiato negli incassi nella Panoramica (account di test).' : 'Verrà conteggiato negli incassi nella Panoramica.'}
            </p>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-on-surface cursor-pointer">
            <input type="checkbox" checked={isTest} onChange={e => setIsTest(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Account di test — non conteggiare l'importo nei ricavi della Panoramica
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container transition-colors">
            Annulla
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Crea utente
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ── Modal dettaglio utente ────────────────────────────────────
const toDateInput = (d: string | null) => d ? new Date(d).toISOString().split('T')[0] : '';
const dateInputCls = 'w-full bg-white border border-outline-variant/40 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const numberInputCls = 'w-20 bg-white border border-outline-variant/40 rounded-xl px-2 py-1.5 text-sm text-on-surface text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

function UserDetailModal({ utente, onClose, onSaved }: { utente: any; onClose: () => void; onSaved: () => void }) {
  const displayName = utente.nome ? `${utente.nome} ${utente.cognome || ''}`.trim() : (utente.email ?? 'Utente');
  const isAdmin = utente.role === 'admin';
  const fmtData = (d: string | null) => d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const subOrdinati = [...(utente.subscriptions ?? [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const subAttuale = subOrdinati.find((s: any) => s.stato === 'attivo' || s.stato === 'in_attesa') ?? subOrdinati[0] ?? null;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');
  const [iscrittoIl, setIscrittoIl]           = useState(toDateInput(utente.created_at));
  const [tesseraScadenza, setTesseraScadenza] = useState(toDateInput(utente.tessera_scadenza));
  const [subInizio, setSubInizio]             = useState(toDateInput(subAttuale?.data_inizio ?? null));
  const [subScadenza, setSubScadenza]         = useState(toDateInput(subAttuale?.data_scadenza ?? null));
  const [lezioniTotali, setLezioniTotali]     = useState(String(subAttuale?.lezioni_totali ?? 0));
  const [lezioniUsate, setLezioniUsate]       = useState(String(subAttuale?.lezioni_usate ?? 0));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const { error: profErr } = await supabase.from('profiles').update({
        created_at:       new Date(iscrittoIl).toISOString(),
        tessera_scadenza: tesseraScadenza || null,
      }).eq('id', utente.id);
      if (profErr) throw profErr;

      if (subAttuale) {
        const { error: subErr } = await supabase.from('subscriptions').update({
          data_inizio:    subInizio || null,
          data_scadenza:  subScadenza || null,
          lezioni_totali: Number(lezioniTotali) || 0,
          lezioni_usate:  Number(lezioniUsate) || 0,
        }).eq('id', subAttuale.id);
        if (subErr) throw subErr;
      }

      setEditing(false);
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.message || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const statoBadge = (stato: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      attivo:    { label: 'Attivo',          cls: 'bg-green-100 text-green-700' },
      in_attesa: { label: 'In attesa',       cls: 'bg-amber-100 text-amber-700' },
      scaduto:   { label: 'Scaduto',         cls: 'bg-red-100 text-red-600' },
      annullato: { label: 'Annullato',       cls: 'bg-surface-container text-on-surface-variant' },
    };
    const v = map[stato] ?? { label: stato, cls: 'bg-surface-container text-on-surface-variant' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.cls}`}>{v.label}</span>;
  };

  const InfoRow = ({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: React.ReactNode; extra?: React.ReactNode }) => (
    <div className="flex items-start gap-3 p-3.5 bg-surface rounded-2xl border border-outline-variant/20">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">{label}</p>
        <p className="text-sm font-semibold text-on-surface truncate">{value}</p>
        {extra}
      </div>
    </div>
  );

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full max-w-lg mx-auto rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
      >
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/10 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-label uppercase tracking-[0.25em] text-primary mb-1">Dettagli utente</p>
              <h3 className="font-serif text-lg text-on-surface truncate">{displayName}</h3>
              <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{
                background: isAdmin ? 'rgba(181,106,86,0.12)' : 'rgba(139,168,136,0.15)',
                color:      isAdmin ? '#b56a56' : '#8ba888',
              }}>
                {isAdmin ? 'Admin' : 'Utente'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isAdmin && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/15 transition-colors">
                <Pencil size={13} strokeWidth={2} /> Modifica
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow icon={<Mail size={16} strokeWidth={1.5} />} label="Email" value={utente.email ?? '—'} />
            <InfoRow icon={<Phone size={16} strokeWidth={1.5} />} label="Telefono" value={utente.telefono ?? '—'} />
            <InfoRow
              icon={<Calendar size={16} strokeWidth={1.5} />}
              label="Iscritto il"
              value={editing ? <input type="date" value={iscrittoIl} onChange={e => setIscrittoIl(e.target.value)} className={dateInputCls} /> : fmtData(utente.created_at)}
            />
            <InfoRow
              icon={<Lock size={16} strokeWidth={1.5} />}
              label="Prenotazioni"
              value={isAdmin ? '—' : (utente.prenotazioni_sbloccate ? 'Sbloccate' : 'Bloccate')}
            />
          </div>

          <div>
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2 mt-2">Abbonamento</p>
            {subAttuale ? (
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant/20 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-on-surface truncate">{subAttuale.plans?.nome ?? 'Piano'}</p>
                  {statoBadge(subAttuale.stato)}
                </div>
                {editing ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Inizio</label>
                      <input type="date" value={subInizio} onChange={e => setSubInizio(e.target.value)} className={dateInputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Scadenza</label>
                      <input type="date" value={subScadenza} onChange={e => setSubScadenza(e.target.value)} className={dateInputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Lezioni totali</label>
                      <input type="number" min="0" value={lezioniTotali} onChange={e => setLezioniTotali(e.target.value)} className={numberInputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Lezioni usate</label>
                      <input type="number" min="0" value={lezioniUsate} onChange={e => setLezioniUsate(e.target.value)} className={numberInputCls} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
                    <span>Inizio: <strong className="text-on-surface">{fmtData(subAttuale.data_inizio)}</strong></span>
                    <span>Scadenza: <strong className="text-on-surface">{fmtData(subAttuale.data_scadenza)}</strong></span>
                    <span>Lezioni: <strong className="text-on-surface">{subAttuale.lezioni_usate ?? 0} / {subAttuale.lezioni_totali ?? '—'}</strong></span>
                    <span>Pagato: <strong className="text-on-surface">{subAttuale.prezzo_pagato != null ? `€ ${Number(subAttuale.prezzo_pagato).toLocaleString('it-IT')}` : '—'}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant/20 text-sm text-on-surface-variant text-center">
                Nessun abbonamento registrato
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow
              icon={<Award size={16} strokeWidth={1.5} />}
              label="Scadenza tessera"
              value={editing ? <input type="date" value={tesseraScadenza} onChange={e => setTesseraScadenza(e.target.value)} className={dateInputCls} /> : fmtData(utente.tessera_scadenza)}
            />
            <InfoRow icon={<FileText size={16} strokeWidth={1.5} />} label="Scadenza certificato medico" value={fmtData(utente.cert_medico_scadenza)} />
          </div>

          {editing && (
            <div className="space-y-2">
              {saveError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p>{saveError}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} disabled={saving} className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container transition-colors">
                  Annulla
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Salva modifiche
                </button>
              </div>
            </div>
          )}

          {subOrdinati.length > 1 && (
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2 mt-2">Storico abbonamenti</p>
              <div className="space-y-1.5">
                {subOrdinati.slice(1).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant/10 text-xs">
                    <span className="font-semibold text-on-surface truncate">{s.plans?.nome ?? 'Piano'}</span>
                    <span className="text-on-surface-variant flex-shrink-0">{fmtData(s.data_inizio)} → {fmtData(s.data_scadenza)}</span>
                    {statoBadge(s.stato)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ── Modal rinnovo abbonamento ─────────────────────────────────
function RenewalModal({ plan, renewalFrom, userEmail, tesseraGiorni, onClose }: {
  plan: any; renewalFrom: string; userEmail: string; tesseraGiorni: number | null; onClose: () => void;
}) {
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [includeTessera, setIncludeTessera] = useState(false);
  const { tesseraPrezzo } = useSiteSettings();
  const offreTessera = tesseraGiorni !== null && tesseraGiorni <= 7;

  const handleRenew = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan_id: plan.id,
          email: userEmail,
          renewal_from: renewalFrom,
          ...(offreTessera ? { include_tessera: includeTessera } : {}),
        },
      });
      if (fnErr || !data?.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError('Errore durante la preparazione del pagamento. Riprova.');
      setLoading(false);
    }
  };

  const nuovaInizio   = new Date(renewalFrom);
  nuovaInizio.setDate(nuovaInizio.getDate() + 1);
  const nuovaScadenza = new Date(nuovaInizio);
  nuovaScadenza.setDate(nuovaScadenza.getDate() + plan.durata_giorni);
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/10 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-label uppercase tracking-[0.25em] text-primary mb-1">Rinnovo abbonamento</p>
            <h3 className="font-serif text-lg text-on-surface">{plan.nome?.split('—')[1]?.trim() ?? plan.nome}</h3>
            <p className="text-2xl font-bold text-on-surface mt-1">
              € {plan.prezzo.toFixed(0)}
              <span className="text-sm font-normal text-on-surface-variant ml-1">/ {plan.durata_giorni} giorni</span>
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-surface-container-low rounded-2xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Inizio nuovo abbonamento</span>
              <span className="font-bold text-on-surface">{fmt(nuovaInizio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Scadenza nuovo abbonamento</span>
              <span className="font-bold text-on-surface">{fmt(nuovaScadenza)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Lezioni incluse</span>
              <span className="font-bold text-on-surface">{plan.lezioni_totali}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-on-surface-variant">
            <span className="flex-shrink-0 text-primary">ℹ</span>
            Il rinnovo parte dal giorno successivo alla scadenza attuale, senza interruzioni.
          </div>

          {offreTessera && (
            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${includeTessera ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface-container-low'}`}>
              <input type="checkbox" checked={includeTessera} onChange={e => setIncludeTessera(e.target.checked)} className="mt-0.5 accent-primary w-4 h-4 flex-shrink-0" />
              <div>
                <p className={`text-sm font-bold ${tesseraGiorni! <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
                  Rinnova anche la tessera associativa <span className="font-normal">(+ € {tesseraPrezzo})</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {tesseraGiorni! <= 0 ? 'La tua tessera è scaduta.' : `Scade tra ${tesseraGiorni} giorni.`} Puoi rinnovarla ora o in un secondo momento.
                </p>
              </div>
            </label>
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={handleRenew} disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Preparazione...</> : <><ArrowRight size={16} /> Procedi al pagamento</>}
          </motion.button>
          <p className="text-center text-xs text-on-surface-variant">Pagamento sicuro tramite Stripe 🔒</p>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function MyPlanPanel() {
  const { user } = useAuth();
  const { tesseraPrezzo } = useSiteSettings();
  const [sub, setSub]                     = useState<any>(null);
  const [piani, setPiani]                 = useState<any[]>([]);
  const [tesseraScadenza, setTessera]     = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [renewPlan, setRenewPlan]         = useState<any>(null);
  const [tesseraLoading, setTesseraLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('subscriptions').select('*, plans(*)').eq('user_id', user.id).in('stato', ['attivo', 'in_attesa']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('plans').select('*').eq('is_attivo', true).order('ordine'),
      supabase.from('profiles').select('tessera_scadenza').eq('id', user.id).single(),
    ]).then(([{ data: s }, { data: p }, { data: prof }]) => {
      setSub(s); setPiani(p || []); setTessera(prof?.tessera_scadenza ?? null); setLoading(false);
    });
  }, [user]);

  const rinnovaTesseraStandalone = async () => {
    if (!user?.email) return;
    setTesseraLoading(true);
    const { data } = await supabase.functions.invoke('create-checkout-session', {
      body: { tessera_only: true, email: user.email, include_tessera: true },
    });
    if (data?.url) window.location.href = data.url;
    else setTesseraLoading(false);
  };

  if (loading) return <div className="text-center py-16 font-serif italic text-on-surface-variant">Caricamento...</div>;

  const lezioniTotali  = sub?.lezioni_totali || 0;
  const lezioniUsate   = sub?.lezioni_usate  || 0;
  const pct            = lezioniTotali > 0 ? Math.round((lezioniUsate / lezioniTotali) * 100) : 0;
  const inizio         = sub?.data_inizio ? new Date(sub.data_inizio) : null;
  const scadenza       = sub?.data_scadenza ? new Date(sub.data_scadenza) : null;
  const giorniRimasti  = scadenza ? Math.ceil((scadenza.getTime() - Date.now()) / 86400000) : 0;
  const planNome       = sub?.plans?.nome?.split('—')[1]?.trim() ?? sub?.plans?.nome ?? '—';
  const mostraRinnovo  = sub && giorniRimasti <= 7;
  const oggi2 = new Date(); oggi2.setHours(0,0,0,0);
  const tesseraDate    = tesseraScadenza ? new Date(tesseraScadenza) : null;
  const tesseraGiorni  = tesseraDate ? Math.ceil((tesseraDate.getTime() - oggi2.getTime()) / 86400000) : null;


  const tesseraScadutaFmt = tesseraDate
    ? tesseraDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const tesseraStatoLabel = !tesseraDate ? 'Nessuna tessera'
    : tesseraGiorni! <= 0 ? 'Scaduta'
    : tesseraGiorni! <= 3 ? `Scade tra ${tesseraGiorni}g`
    : tesseraGiorni! <= 7 ? `Scade tra ${tesseraGiorni}g`
    : 'Attiva';
  const tesseraStatoColor = !tesseraDate ? 'bg-surface-container text-on-surface-variant'
    : tesseraGiorni! <= 3 ? 'bg-red-100 text-red-600'
    : tesseraGiorni! <= 7 ? 'bg-amber-100 text-amber-700'
    : 'bg-green-100 text-green-700';

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── ABBONAMENTO ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant mb-3">Abbonamento</p>
        {sub?.stato === 'in_attesa' ? (
          <div className="border border-amber-200 rounded-2xl p-6 space-y-3" style={{ background: 'rgba(251,191,36,0.07)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">⏳</span>
              <p className="text-sm font-bold text-amber-800">Abbonamento in attesa di attivazione</p>
            </div>
            <p className="text-sm text-amber-700 leading-relaxed">
              Il tuo pagamento è stato ricevuto correttamente. Per attivare l'abbonamento è necessario inviarci il <strong>certificato medico di sana e robusta costituzione</strong>.
            </p>
            <div className="bg-white/60 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">Come procedere</p>
              <p className="text-sm text-amber-700">📧 Invia il certificato a <a href="mailto:arcadialabyoga@gmail.com" className="font-bold underline">arcadialabyoga@gmail.com</a></p>
              <p className="text-sm text-amber-700">📱 Oppure contattaci su WhatsApp al <a href="tel:+393466770909" className="font-bold underline">+39 346 677 0909</a></p>
            </div>
            <p className="text-xs text-amber-600 bg-amber-100/60 rounded-xl px-4 py-2.5">
              ✅ <strong>Non perderai nessun giorno</strong> — l'abbonamento <strong>{sub?.plans?.nome}</strong> partirà dalla data in cui verificheremo il tuo certificato.
            </p>
          </div>
        ) : !sub ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-amber-800 mb-1">Nessun abbonamento attivo</p>
            <p className="text-xs text-amber-700">Acquista un abbonamento dalla <a href="/#pricing" className="underline font-bold">pagina principale</a>.</p>
          </div>
        ) : (
          <div className="border border-primary/20 rounded-[1.5rem] p-6" style={{ background: 'linear-gradient(135deg, rgba(181,106,86,0.08), rgba(139,168,136,0.04))' }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Piano attivo</p>
                <h3 className="text-3xl font-serif text-on-surface mt-1">{planNome}</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${giorniRimasti <= 3 ? 'bg-red-100 text-red-600' : giorniRimasti <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                {giorniRimasti <= 0 ? 'Scaduto' : giorniRimasti <= 7 ? `Scade tra ${giorniRimasti}g` : 'Attivo'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline-variant/20">
              {[
                { label: 'Lezioni incluse',  value: String(lezioniTotali) },
                { label: 'Lezioni rimaste',  value: String(lezioniTotali - lezioniUsate) },
                { label: 'Giorni rimasti',   value: String(Math.max(giorniRimasti, 0)) },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-serif font-bold text-on-surface">{s.value}</p>
                  <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-on-surface-variant font-label uppercase tracking-wider">Utilizzo</span>
                <span className="font-bold text-on-surface">{lezioniUsate}/{lezioniTotali} lezioni</span>
              </div>
              <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                Inizio: {inizio?.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—'}
                {' · '}
                Scadenza: {scadenza?.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—'}
              </p>
            </div>
          </div>
        )}

        {/* Banner rinnovo abbonamento */}
        {mostraRinnovo && (
          <div className={`mt-3 rounded-2xl p-4 border ${giorniRimasti <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm font-bold mb-1 ${giorniRimasti <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
              {giorniRimasti <= 0 ? 'Il tuo abbonamento è scaduto' : `Scade tra ${giorniRimasti} giorn${giorniRimasti === 1 ? 'o' : 'i'}`}
            </p>
            <p className={`text-xs mb-3 ${giorniRimasti <= 3 ? 'text-red-600' : 'text-amber-700'}`}>
              Rinnova ora — il nuovo abbonamento partirà dal giorno successivo alla scadenza.
            </p>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Scegli il piano:</p>
            <div className="space-y-2">
              {piani.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-outline-variant/20">
                  <div>
                    <p className="text-sm font-bold text-on-surface">{p.nome?.split('—')[1]?.trim() ?? p.nome}</p>
                    <p className="text-xs text-on-surface-variant">{p.lezioni_totali} lezioni · {p.durata_giorni} giorni</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-on-surface">€ {p.prezzo.toFixed(0)}</span>
                    <button onClick={() => setRenewPlan(p)} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-opacity-90 transition-all">
                      Rinnova
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TESSERA ──────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant mb-3">Tessera Associativa</p>
        <div className="border border-outline-variant/30 rounded-[1.5rem] p-5 bg-surface-container-low">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Tessera Annuale</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {tesseraScadutaFmt ? `Scadenza: ${tesseraScadutaFmt}` : 'Nessuna tessera registrata'}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${tesseraStatoColor}`}>
              {tesseraStatoLabel}
            </span>
          </div>

          {/* Avviso + bottone rinnovo se in scadenza o scaduta */}
          {tesseraDate && tesseraGiorni! <= 7 && (
            <div className={`mt-4 pt-4 border-t ${tesseraGiorni! <= 3 ? 'border-red-200' : 'border-amber-200'}`}>
              <p className={`text-xs mb-3 ${tesseraGiorni! <= 3 ? 'text-red-600' : 'text-amber-700'}`}>
                {tesseraGiorni! <= 0
                  ? 'Senza tessera valida non puoi prenotare le lezioni.'
                  : 'Puoi rinnovarla ora o aspettare e rinnovarla insieme al prossimo abbonamento.'}
              </p>
              <button
                onClick={rinnovaTesseraStandalone}
                disabled={tesseraLoading}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-primary text-white hover:bg-opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {tesseraLoading ? <><Loader2 size={12} className="animate-spin" /> Attendere...</> : `Rinnova tessera — € ${tesseraPrezzo}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista piani (quando non in scadenza) */}
      {!mostraRinnovo && piani.length > 0 && (
        <div>
          <p className="text-[10px] font-label uppercase tracking-[0.25em] text-on-surface-variant mb-3">Acquista un nuovo abbonamento</p>
          <div className="grid gap-3">
            {piani.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl hover:border-primary/30 transition-all group">
                <div>
                  <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{p.nome}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{p.lezioni_totali} lezioni · {p.durata_giorni} giorni</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-serif font-bold text-on-surface">€ {p.prezzo.toFixed(0)}</p>
                  <button onClick={() => setRenewPlan(p)} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-opacity-90 transition-all">
                    Acquista
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {renewPlan && sub?.data_scadenza && (
          <RenewalModal
            plan={renewPlan}
            renewalFrom={sub.data_scadenza}
            userEmail={user?.email ?? ''}
            tesseraGiorni={tesseraGiorni}
            onClose={() => setRenewPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const GIORNI_IT = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

// Inizio corsi 2026: nessuna lezione prenotabile prima di questa data (eccezione valida solo per quest'anno)
const INIZIO_CORSI_2026 = new Date('2026-09-08T00:00:00');

function generateSlots(courses: any[], exceptions: any[], weeksAhead = 4, inizioAbbonamento?: string | null) {
  const slots: { course: any; date: Date; dateStr: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let primoGiornoPrenotabile = today < INIZIO_CORSI_2026 ? INIZIO_CORSI_2026 : today;
  // Non si può prenotare prima che inizi effettivamente l'abbonamento dell'utente
  // (può essere stato posticipato manualmente dall'admin rispetto alla data di iscrizione)
  if (inizioAbbonamento) {
    const inizioSub = new Date(inizioAbbonamento + 'T00:00:00');
    if (inizioSub > primoGiornoPrenotabile) primoGiornoPrenotabile = inizioSub;
  }

  for (let w = 0; w < weeksAhead; w++) {
    for (const course of courses) {
      const d = new Date(today);
      const diff = (course.giorno_settimana - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff + w * 7);
      if (d < primoGiornoPrenotabile) continue;
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const isException = exceptions.some(e => e.course_id === course.id && e.data === dateStr);
      if (isException) continue;
      slots.push({ course, date: d, dateStr });
    }
  }
  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function BookingsPanel() {
  const { user } = useAuth();
  const [courses, setCourses]         = useState<any[]>([]);
  const [exceptions, setExceptions]   = useState<any[]>([]);
  const [myBookings, setMyBookings]   = useState<any[]>([]);
  const [sub, setSub]                 = useState<any>(null);
  const [unlocked, setUnlocked]       = useState(false);
  const [tesseraScadenza, setTesseraScadenza] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [booking, setBooking]         = useState<string | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<{ course: any; dateStr: string } | null>(null);
  const [alertMsg, setAlertMsg]       = useState<{ title: string; text: string } | null>(null);
  const [cancelBooking, setCancelBooking] = useState<{ id: string; subId: string } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [
      { data: c }, { data: ex }, { data: b },
      { data: s }, { data: p },
    ] = await Promise.all([
      supabase.from('courses').select('*').eq('is_attivo', true).order('giorno_settimana'),
      supabase.from('course_exceptions').select('*'),
      supabase.from('course_bookings').select('*').eq('user_id', user.id).eq('stato', 'confermata'),
      supabase.from('subscriptions').select('id, lezioni_totali, lezioni_usate, stato, data_inizio, plans(frequenza_sett)').eq('user_id', user.id).in('stato', ['attivo', 'in_attesa']).maybeSingle(),
      supabase.from('profiles').select('prenotazioni_sbloccate, tessera_scadenza').eq('id', user.id).single(),
    ]);
    setCourses(c || []);
    setExceptions(ex || []);
    setMyBookings(b || []);
    setSub(s ?? null);
    setUnlocked(p?.prenotazioni_sbloccate ?? false);
    setTesseraScadenza(p?.tessera_scadenza ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const prenota = async (slot: { course: any; dateStr: string }) => {
    if (!user || !sub) return;
    if (slot.dateStr < INIZIO_CORSI_2026.toISOString().split('T')[0]) {
      setAlertMsg({ title: 'Corsi non ancora iniziati', text: 'Le lezioni iniziano l\'8 settembre 2026: non è possibile prenotare prima di questa data.' });
      return;
    }
    if (sub.data_inizio && slot.dateStr < sub.data_inizio) {
      setAlertMsg({ title: 'Abbonamento non ancora iniziato', text: `Il tuo abbonamento parte dal ${new Date(sub.data_inizio + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}: non puoi prenotare lezioni prima di questa data.` });
      return;
    }
    if (sub.lezioni_usate >= sub.lezioni_totali) {
      setAlertMsg({ title: 'Lezioni esaurite', text: 'Hai esaurito tutte le lezioni del tuo abbonamento.' });
      return;
    }
    const frequenza: number | null = sub.plans?.frequenza_sett ?? null;
    if (frequenza) {
      const slotDate = new Date(slot.dateStr + 'T12:00:00');
      const dow = slotDate.getDay() === 0 ? 7 : slotDate.getDay();
      const lun = new Date(slotDate); lun.setDate(slotDate.getDate() - dow + 1); lun.setHours(0,0,0,0);
      const dom = new Date(lun); dom.setDate(lun.getDate() + 6); dom.setHours(23,59,59,999);
      const lunStr = lun.toISOString().split('T')[0];
      const domStr = dom.toISOString().split('T')[0];
      const prenoteSettimana = myBookings.filter(b => b.data >= lunStr && b.data <= domStr).length;
      if (prenoteSettimana >= frequenza) {
        setAlertMsg({
          title: 'Limite settimanale raggiunto',
          text: `Il tuo abbonamento prevede ${frequenza} lezione${frequenza > 1 ? 'i' : 'e'} a settimana. Hai già raggiunto il limite per questa settimana.`,
        });
        return;
      }
    }
    setConfirmSlot(slot);
  };

  const confermaPrenota = async () => {
    if (!confirmSlot || !user || !sub) return;
    const slot = confirmSlot;
    setConfirmSlot(null);
    setBooking(slot.course.id + slot.dateStr);

    const { data: existing } = await supabase
      .from('course_bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', slot.course.id)
      .eq('data', slot.dateStr)
      .eq('stato', 'cancellata')
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('course_bookings')
        .update({ stato: 'confermata', subscription_id: sub.id })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('course_bookings').insert({
        user_id: user.id, course_id: slot.course.id,
        data: slot.dateStr, subscription_id: sub.id,
      }));
    }

    if (!error) {
      await supabase.rpc('increment_lezioni_usate', { sub_id: sub.id });
    } else if (error.code === '23505') {
      setAlertMsg({ title: 'Già prenotata', text: 'Hai già una prenotazione attiva per questa lezione.' });
    }
    setBooking(null);
    load();
  };

  const disdici = async (bookingId: string, subId: string) => {
    setCancelBooking({ id: bookingId, subId });
  };

  const confermaDisdici = async () => {
    if (!cancelBooking) return;
    const { id, subId } = cancelBooking;
    setCancelBooking(null);
    await supabase.from('course_bookings').update({ stato: 'cancellata' }).eq('id', id);
    await supabase.rpc('decrement_lezioni_usate', { sub_id: subId });
    load();
  };

  if (loading) return <div className="text-center py-16 font-serif italic text-on-surface-variant">Caricamento...</div>;

  const lezioniRimaste = sub ? sub.lezioni_totali - sub.lezioni_usate : 0;
  const slots = generateSlots(courses, exceptions, 4, sub?.data_inizio);
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const tesseraScaduta = tesseraScadenza ? new Date(tesseraScadenza) < oggi : false;
  const tesseraGiorni  = tesseraScadenza ? Math.ceil((new Date(tesseraScadenza).getTime() - oggi.getTime()) / 86400000) : null;

  if (!sub) return (
    <div className="text-center py-16 max-w-md mx-auto">
      <p className="font-serif italic text-on-surface-variant mb-3">Nessun abbonamento attivo.</p>
      <a href="/#pricing" className="text-primary font-bold text-sm hover:underline">Acquista un abbonamento →</a>
    </div>
  );

  const { requireMedicalCert } = useSiteSettings();

  if (!unlocked && requireMedicalCert) return (
    <div className="max-w-lg mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-[1.5rem] p-8 text-center">
        <Lock size={32} className="text-blue-500 mx-auto mb-4" strokeWidth={1.5} />
        <h3 className="font-serif text-xl text-on-surface mb-2">Prenotazioni bloccate</h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          Per sbloccare le prenotazioni, invia il tuo <strong>certificato medico di buona salute</strong> a:
        </p>
        <a href="mailto:arcadialabyoga@gmail.com" className="inline-block mt-3 text-blue-700 font-bold text-base hover:underline">
          arcadialabyoga@gmail.com
        </a>
        <p className="text-xs text-blue-600 mt-3">L'admin abiliterà le prenotazioni appena ricevuto il certificato.</p>
      </div>
    </div>
  );

  if (tesseraScaduta) return (
    <div className="max-w-lg mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-[1.5rem] p-8 text-center">
        <AlertCircle size={32} className="text-red-500 mx-auto mb-4" strokeWidth={1.5} />
        <h3 className="font-serif text-xl text-on-surface mb-2">Tessera scaduta</h3>
        <p className="text-sm text-red-800 leading-relaxed">
          La tua <strong>tessera associativa annuale</strong> è scaduta. Per continuare a prenotare le lezioni è necessario rinnovarla acquistando un nuovo abbonamento.
        </p>
        <a href="/#pricing" className="inline-block mt-5 bg-primary text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
          Rinnova abbonamento →
        </a>
        <p className="text-xs text-red-600 mt-3">La tessera viene rinnovata automaticamente ad ogni nuovo abbonamento.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {!unlocked && !requireMedicalCert && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-bold text-amber-800">Certificato medico richiesto</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Porta il tuo <strong>certificato medico di buona salute</strong> alla prima lezione oppure invialo a{' '}
              <a href="mailto:arcadialabyoga@gmail.com" className="underline font-bold">arcadialabyoga@gmail.com</a>.
            </p>
          </div>
        </div>
      )}
      {tesseraGiorni !== null && tesseraGiorni <= 7 && (
        <div className={`rounded-2xl p-4 border ${tesseraGiorni <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-sm font-bold mb-1 ${tesseraGiorni <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
            La tua tessera associativa scade tra {tesseraGiorni} giorn{tesseraGiorni === 1 ? 'o' : 'i'}
          </p>
          <p className={`text-xs ${tesseraGiorni <= 3 ? 'text-red-600' : 'text-amber-700'}`}>
            Rinnova l'abbonamento prima della scadenza per non interrompere le prenotazioni.
          </p>
        </div>
      )}
      {/* Lezioni rimaste */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl">
        <span className="text-sm text-on-surface-variant">Lezioni rimaste nell'abbonamento</span>
        <span className="font-serif font-bold text-on-surface text-lg" style={{ color: lezioniRimaste <= 2 ? '#e57373' : '#8ba888' }}>
          {lezioniRimaste} / {sub.lezioni_totali}
        </span>
      </div>

      {/* Slot disponibili */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] p-6">
        <h3 className="font-serif text-xl text-on-surface mb-1">Corsi disponibili</h3>
        <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-5">Prossime 4 settimane</p>

        {slots.length === 0 ? (
          <p className="text-center py-8 font-serif italic text-on-surface-variant text-sm">Nessuna lezione disponibile</p>
        ) : (
          <div className="space-y-3">
            {slots.map(slot => {
              const key    = slot.course.id + slot.dateStr;
              const booked = myBookings.find(b => b.course_id === slot.course.id && b.data === slot.dateStr);
              const isLoading = booking === key;
              const frequenza: number | null = sub.plans?.frequenza_sett ?? null;
              let settimanapiena = false;
              if (frequenza && !booked) {
                const slotDate = new Date(slot.dateStr + 'T12:00:00');
                const dow = slotDate.getDay() === 0 ? 7 : slotDate.getDay();
                const lun = new Date(slotDate); lun.setDate(slotDate.getDate() - dow + 1);
                const lunStr = lun.toISOString().split('T')[0];
                const domStr = new Date(lun.getTime() + 6 * 86400000).toISOString().split('T')[0];
                settimanapiena = myBookings.filter(b => b.data >= lunStr && b.data <= domStr).length >= frequenza;
              }
              return (
                <div key={key} className={`p-4 rounded-2xl border transition-all ${booked ? 'bg-green-50 border-green-200' : settimanapiena ? 'bg-surface-container-low border-outline-variant/20 opacity-60' : 'bg-surface border-outline-variant/20 hover:border-primary/30'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: slot.course.colore }} />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-on-surface leading-tight">{slot.course.nome}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {GIORNI_IT[slot.course.giorno_settimana]}{' '}
                          {slot.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-xs text-on-surface-variant">{slot.course.ora_inizio.slice(0,5)}–{slot.course.ora_fine.slice(0,5)}</p>
                        {settimanapiena && <p className="text-[10px] text-primary/70 mt-0.5 font-bold">Limite settimana raggiunto</p>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {booked ? (() => {
                        const ora = slot.course.ora_inizio?.slice(0, 5) ?? '23:59';
                        const lezioneStart = new Date(`${slot.dateStr}T${ora}:00`);
                        const canCancel = (lezioneStart.getTime() - Date.now()) > 24 * 60 * 60 * 1000;
                        return canCancel ? (
                          <button onClick={() => disdici(booked.id, sub.id)}
                            className="text-xs text-green-700 font-bold hover:text-red-500 transition-colors px-3 py-2 rounded-2xl bg-green-100 hover:bg-red-50 whitespace-nowrap">
                            ✓ Disdici
                          </button>
                        ) : (
                          <button onClick={() => setAlertMsg({ title: 'Disdetta non possibile', text: 'Non è più possibile disdire questa lezione. La disdetta deve essere effettuata almeno 24 ore prima dell\'inizio.' })}
                            className="text-xs text-green-700 font-bold px-3 py-2 rounded-2xl bg-green-100 opacity-70 whitespace-nowrap">
                            ✓ Prenotata
                          </button>
                        );
                      })() : (
                        <button onClick={() => prenota(slot)} disabled={isLoading || lezioniRimaste <= 0 || settimanapiena}
                          className="text-xs font-bold px-3 py-2 rounded-2xl bg-primary text-white hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                          {isLoading ? '...' : lezioniRimaste <= 0 ? 'Esaurite' : settimanapiena ? 'Limite' : 'Prenota'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal conferma prenotazione */}
      {confirmSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7 space-y-5">
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-1">Conferma prenotazione</p>
              <h3 className="font-serif text-lg text-on-surface">{confirmSlot.course.nome}</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                {new Date(confirmSlot.dateStr + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                {` · ${confirmSlot.course.ora_inizio.slice(0,5)}–${confirmSlot.course.ora_fine.slice(0,5)}`}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                Puoi annullare la prenotazione fino a <strong>24 ore prima</strong> della lezione. Dopo tale termine la prenotazione non potrà essere annullata e la lezione verrà scalata dall'abbonamento.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSlot(null)}
                className="flex-1 py-3 rounded-2xl border border-outline-variant/40 text-sm text-on-surface-variant hover:border-outline-variant transition-all"
              >
                Annulla
              </button>
              <button
                onClick={confermaPrenota}
                className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-opacity-90 transition-all"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal disdetta */}
      {cancelBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7 space-y-5">
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-red-500 mb-1">Disdici prenotazione</p>
              <h3 className="font-serif text-lg text-on-surface">Vuoi disdire questa lezione?</h3>
              <p className="text-sm text-on-surface-variant mt-1">La lezione verrà rimossa dalle tue prenotazioni e il credito sarà restituito all'abbonamento.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelBooking(null)}
                className="flex-1 py-3 rounded-2xl border border-outline-variant/40 text-sm text-on-surface-variant hover:border-outline-variant transition-all"
              >
                Annulla
              </button>
              <button
                onClick={confermaDisdici}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all"
              >
                Sì, disdici
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal avviso generico */}
      {alertMsg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7 space-y-5">
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-1">Avviso</p>
              <h3 className="font-serif text-lg text-on-surface">{alertMsg.title}</h3>
              <p className="text-sm text-on-surface-variant mt-1">{alertMsg.text}</p>
            </div>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-opacity-90 transition-all"
            >
              Capito
            </button>
          </div>
        </div>
      )}

      {/* Le mie prenotazioni */}
      {myBookings.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] p-4 sm:p-6">
          <h3 className="font-serif text-xl text-on-surface mb-4">Le mie prenotazioni attive</h3>
          <div className="space-y-2">
            {myBookings
              .sort((a, b) => a.data.localeCompare(b.data))
              .map(b => {
                const course = courses.find(c => c.id === b.course_id);
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-3 border-b border-outline-variant/10 last:border-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: course?.colore ?? '#ccc' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{course?.nome ?? '—'}</p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(b.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                        </p>
                        {course && <p className="text-xs text-on-surface-variant">{course.ora_inizio.slice(0,5)}–{course.ora_fine.slice(0,5)}</p>}
                      </div>
                    </div>
                    {(() => {
                      const ora = course?.ora_inizio?.slice(0, 5) ?? '23:59';
                      const lezioneStart = new Date(`${b.data}T${ora}:00`);
                      const canCancel = (lezioneStart.getTime() - Date.now()) > 24 * 60 * 60 * 1000;
                      return canCancel ? (
                        <button onClick={() => disdici(b.id, sub.id)}
                          className="text-xs text-on-surface-variant hover:text-red-500 transition-colors font-label uppercase tracking-wider">
                          Disdici
                        </button>
                      ) : (
                        <button onClick={() => setAlertMsg({ title: 'Disdetta non possibile', text: 'Non è più possibile disdire questa lezione. La disdetta deve essere effettuata almeno 24 ore prima dell\'inizio.' })}
                          className="text-xs text-on-surface-variant/40 font-label uppercase tracking-wider">
                          Non disdibile
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── I miei eventi (utente) ────────────────────────────────────
function MyEventsPanel() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('event_tickets')
      .select('*, special_events(titolo, data_evento, luogo)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTickets(data || []); setLoading(false); });
  }, [user]);

  const copy = (codice: string) => {
    navigator.clipboard.writeText(codice);
    setCopied(codice);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="text-center py-16 font-serif italic text-on-surface-variant">Caricamento...</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      {tickets.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif italic text-on-surface-variant mb-3">Nessun biglietto acquistato.</p>
          <a href="/#workshops" className="text-primary font-bold text-sm hover:underline">Scopri gli eventi →</a>
        </div>
      ) : tickets.map(t => {
        const ev      = t.special_events as any;
        const isPast  = ev?.data_evento ? new Date(ev.data_evento) < new Date() : false;
        return (
          <div key={t.id} className={`bg-surface-container-low border rounded-[1.5rem] p-5 ${isPast ? 'opacity-60 border-outline-variant/15' : 'border-outline-variant/30'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-on-surface">{ev?.titolo ?? '—'}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {ev?.data_evento ? new Date(ev.data_evento).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  {ev?.data_evento && ` · ${new Date(ev.data_evento).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
                {ev?.luogo && <p className="text-xs text-on-surface-variant">📍 {ev.luogo}</p>}
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: t.stato === 'presente' ? 'rgba(139,168,136,0.15)' : isPast ? 'rgba(0,0,0,0.06)' : 'rgba(139,168,136,0.12)', color: t.stato === 'presente' ? '#8ba888' : isPast ? '#999' : '#8ba888' }}>
                {t.stato === 'presente' ? 'Presente' : isPast ? 'Concluso' : 'Confermato'}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between bg-surface rounded-2xl px-4 py-3 border border-outline-variant/20">
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-0.5">Codice di riferimento</p>
                <p className="font-mono text-xl font-black text-primary tracking-widest">{t.codice_ref}</p>
              </div>
              <button onClick={() => copy(t.codice_ref)}
                className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                {copied === t.codice_ref ? '✓ Copiato' : '📋 Copia'}
              </button>
            </div>

            {!isPast && (
              <p className="text-[11px] text-on-surface-variant mt-3 flex items-center gap-1.5">
                <span>📌</span>
                Porta questo codice all'evento.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { section = 'overview', subsection } = useParams();
  const navigate = useNavigate();
  const admin = ADMIN_EMAILS.includes(user?.email ?? '');
  const nav = admin ? adminNav : userNav;

  const handleSectionChange = (id: string) => {
    navigate(`/dashboard/${id}`, { replace: true });
  };

  const validAdminSections = ['overview', 'analytics', 'plans', 'courses', 'events', 'subscriptions', 'users', 'bookings', 'email', 'leads', 'settings'];
  const validUserSections  = ['overview', 'lessons', 'plan', 'bookings', 'events', 'settings'];
  const validSections = admin ? validAdminSections : validUserSections;
  const activeSection = validSections.includes(section) ? section : 'overview';

  const renderContent = () => {
    if (admin) {
      switch (activeSection) {
        case 'overview':       return <AdminDashboard />;
        case 'analytics':      return <AnalyticsPanel />;
        case 'plans':          return <PlansManagementPanel />;
        case 'courses':        return <CoursesManagementPanel />;
        case 'events':         return <EventsManagementPanel />;
        case 'subscriptions':  return <SubscriptionsPanel />;
        case 'users':          return <UsersPanel />;
        case 'email':          return <EmailMarketingPanel initialTab={subsection === 'storico' ? 'storico' : 'componi'} />;
        case 'bookings':       return <CourseBookingsPanel />;
        case 'leads':          return <LeadsPanel />;
        case 'settings':       return <SettingsPanel isAdmin />;
        default:               return <AdminDashboard />;
      }
    } else {
      const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Utente';
      switch (activeSection) {
        case 'overview':  return <UserDashboard userName={userName} />;
        case 'lessons':   return <MyLessonsPanel />;
        case 'plan':      return <MyPlanPanel />;
        case 'bookings':  return <BookingsPanel />;
        case 'events':    return <MyEventsPanel />;
        case 'settings':  return <SettingsPanel isAdmin={false} />;
        default:          return <UserDashboard userName={userName} />;
      }
    }
  };

  return (
    <DashboardLayout
      navItems={nav}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      isAdmin={admin}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
