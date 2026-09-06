import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CalendarCheck, Clock, Flame, Star, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const T = '#b56a56';
const S = '#8ba888';
const card = 'bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] shadow-sm';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-outline-variant/40 rounded-2xl px-4 py-3 shadow-xl text-sm">
      <p className="font-label uppercase tracking-widest text-on-surface-variant text-[10px] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: T }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function UserDashboard({ userName }: { userName: string }) {
  const { user } = useAuth();
  const [loading, setLoading]         = useState(true);
  const [sub, setSub]                 = useState<any>(null);
  const [tesseraScadenza, setTesseraScadenza] = useState<string | null>(null);
  const [presenzeMensili, setPresenze] = useState<{ settimana: string; presenze: number }[]>([]);
  const [prossimeLezioni, setProssime] = useState<any[]>([]);
  const [totaleFatte, setTotaleFatte] = useState(0);
  const [presenzeMese, setPresenzeMese] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const oggi = new Date();
    const oggiStr = oggi.toISOString().split('T')[0];
    const startMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split('T')[0];

    const [
      { data: abbonamento },
      { data: profile },
      { data: allBookings },
    ] = await Promise.all([
      supabase.from('subscriptions')
        .select('*, plans(nome)')
        .eq('user_id', user.id)
        .in('stato', ['attivo', 'in_attesa'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('profiles')
        .select('tessera_scadenza')
        .eq('id', user.id)
        .single(),
      supabase.from('course_bookings')
        .select('id, data, stato, courses(id, nome, ora_inizio, ora_fine, colore)')
        .eq('user_id', user.id)
        .eq('stato', 'confermata')
        .order('data', { ascending: true }),
    ]);

    const bookings = allBookings ?? [];
    const prossime = bookings.filter(b => b.data >= oggiStr).slice(0, 3);
    const bookingsMese = bookings.filter(b => b.data >= startMese && b.data < oggiStr);

    // Presenze per settimana nel mese corrente (lezioni passate)
    const settimane = ['Sett 1', 'Sett 2', 'Sett 3', 'Sett 4'];
    const presenzeCalc = settimane.map((settimana, idx) => ({
      settimana,
      presenze: bookingsMese.filter(b => {
        const day = new Date(b.data + 'T12:00:00').getDate();
        return Math.floor((day - 1) / 7) === idx;
      }).length,
    }));

    setSub(abbonamento);
    setTesseraScadenza(profile?.tessera_scadenza ?? null);
    setPresenze(presenzeCalc);
    setProssime(prossime);
    setTotaleFatte(bookings.filter(b => b.data < oggiStr).length);
    setPresenzeMese(bookingsMese.length);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const tesseraDate     = tesseraScadenza ? new Date(tesseraScadenza) : null;
  const tesseraGiorni   = tesseraDate ? Math.ceil((tesseraDate.getTime() - oggi.getTime()) / 86400000) : null;
  const tesseraScaduta  = tesseraGiorni !== null && tesseraGiorni < 0;

  const lezioniTotali    = sub?.lezioni_totali || 0;
  const lezioniUsate     = sub?.lezioni_usate  || 0;
  const lezioniRimanenti = lezioniTotali - lezioniUsate;
  const percentuale      = lezioniTotali > 0 ? Math.round((lezioniRimanenti / lezioniTotali) * 100) : 0;
  const inizio           = sub?.data_inizio ? new Date(sub.data_inizio) : null;
  const scadenza         = sub?.data_scadenza ? new Date(sub.data_scadenza) : null;
  const giorniRimasti    = scadenza ? Math.ceil((scadenza.getTime() - Date.now()) / 86400000) : 0;
  const planNome         = sub?.plans?.nome?.split('—')[1]?.trim() ?? sub?.plans?.nome ?? '—';

  const donutData = [
    { name: 'Usate',     value: lezioniUsate,     fill: T },
    { name: 'Rimanenti', value: lezioniRimanenti,  fill: `${S}55` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant">
        <RefreshCw size={20} className="animate-spin mr-3 text-primary" />
        <span className="font-serif italic">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Benvenuto */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low"
      >
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-serif italic text-primary font-bold flex-shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">
            Bentornata/o, <span className="text-primary">{userName}</span>
          </p>
        </div>
        {sub && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border flex-shrink-0" style={{ borderColor: `${T}30`, background: `${T}0a` }}>
            <Star size={11} style={{ color: T }} fill={T} strokeWidth={0} />
            <span className="text-[11px] font-bold" style={{ color: T }}>{planNome}</span>
          </div>
        )}
      </motion.div>

      {/* Banner abbonamento in attesa di certificato */}
      {sub?.stato === 'in_attesa' && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="border border-amber-200 rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(251,191,36,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <p className="text-sm font-bold text-amber-800">Abbonamento in attesa di attivazione</p>
          </div>
          <p className="text-sm text-amber-700 leading-relaxed">
            Il tuo pagamento è stato ricevuto. Per attivare l'abbonamento inviaci il <strong>certificato medico di sana e robusta costituzione</strong>:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href="mailto:arcadialabyoga@gmail.com"
              className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all"
            >
              📧 arcadialabyoga@gmail.com
            </a>
            <a href="tel:+393466770909"
              className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all"
            >
              📱 +39 346 677 0909
            </a>
          </div>
          <p className="text-xs text-amber-600">
            ✅ Non perderai nessun giorno — l'abbonamento partirà dalla data in cui verificheremo il certificato.
          </p>
        </motion.div>
      )}

      {/* Banner tessera in scadenza / scaduta */}
      {tesseraScaduta && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-700 mb-1">Tessera associativa scaduta</p>
          <p className="text-xs text-red-600">La tua tessera è scaduta. Acquista un nuovo abbonamento per rinnovarla e continuare a prenotare le lezioni.</p>
          <a href="/#pricing" className="inline-block mt-3 text-xs font-bold text-red-700 underline">Rinnova abbonamento →</a>
        </div>
      )}
      {!tesseraScaduta && tesseraGiorni !== null && tesseraGiorni <= 7 && (
        <div className={`rounded-2xl p-4 border ${tesseraGiorni <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-sm font-bold mb-1 ${tesseraGiorni <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
            La tua tessera scade tra {tesseraGiorni} giorn{tesseraGiorni === 1 ? 'o' : 'i'}
          </p>
          <p className={`text-xs ${tesseraGiorni <= 3 ? 'text-red-600' : 'text-amber-700'}`}>
            Rinnova l'abbonamento prima della scadenza per non interrompere le prenotazioni.
          </p>
          <a href="/#pricing" className={`inline-block mt-3 text-xs font-bold underline ${tesseraGiorni <= 3 ? 'text-red-700' : 'text-amber-800'}`}>Rinnova ora →</a>
        </div>
      )}

      {/* Nessun abbonamento */}
      {!sub && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-amber-800 mb-1">Nessun abbonamento attivo</p>
          <p className="text-xs text-amber-700">
            Acquista un abbonamento dalla{' '}
            <a href="/#pricing" className="underline font-bold">pagina principale</a>.
          </p>
        </div>
      )}

      {sub && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Lezioni rimaste', value: `${lezioniRimanenti}/${lezioniTotali}`, icon: CalendarCheck, color: T,        sub: `${percentuale}% disponibili` },
              { label: 'Giorni alla scadenza', value: `${Math.max(giorniRimasti, 0)}`, icon: Clock, color: S, sub: scadenza?.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) ?? '—' },
              { label: 'Presenze questo mese', value: String(presenzeMese), icon: Flame, color: '#c4a882', sub: 'mese corrente' },
              { label: 'Lezioni totali fatte', value: String(totaleFatte), icon: Star, color: T, sub: "dall'inizio" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-surface-container-low border border-outline-variant/30 rounded-[1.5rem] p-4 sm:p-6 shadow-sm flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}15` }}>
                  <stat.icon size={16} style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-serif font-bold text-on-surface">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs font-label uppercase tracking-widest text-on-surface-variant mt-0.5 leading-tight">{stat.label}</p>
                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{stat.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Donut + presenze */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className={`${card} p-4 sm:p-6`}>
              <h3 className="font-serif text-base sm:text-xl text-on-surface mb-0.5">Utilizzo abbonamento</h3>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">Piano: {planNome}</p>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                        {donutData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-serif font-bold text-on-surface">{percentuale}%</span>
                    <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant">rimaste</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Usate',     count: lezioniUsate,     color: T },
                    { label: 'Rimanenti', count: lezioniRimanenti, color: S },
                  ].map(b => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-on-surface-variant font-label uppercase tracking-wider">{b.label}</span>
                        <span className="font-bold text-on-surface">{b.count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${lezioniTotali > 0 ? (b.count / lezioniTotali) * 100 : 0}%`, background: b.color }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2.5 border-t border-outline-variant/20 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-wider">Inizio</p>
                      <p className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">
                        {inizio?.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-wider">Scadenza</p>
                      <p className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">
                        {scadenza?.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—'}
                      </p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: giorniRimasti < 10 ? '#e57373' : S }}>
                        {giorniRimasti > 0 ? `${giorniRimasti} giorni rimasti` : 'Abbonamento scaduto'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className={`${card} p-4 sm:p-6`}>
              <h3 className="font-serif text-base sm:text-xl text-on-surface mb-0.5">Presenze mensili</h3>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">
                {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </p>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={presenzeMensili} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={S} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={S} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#efebdf" vertical={false} />
                    <XAxis dataKey="settimana" tick={{ fontSize: 10, fill: '#5a544c', fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#5a544c', fontFamily: 'Manrope' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="presenze" name="Presenze" stroke={S} strokeWidth={2.5} fill="url(#gU)" dot={{ fill: S, strokeWidth: 0, r: 5 }} activeDot={{ r: 7 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Prossime lezioni */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} className={`${card} p-4 sm:p-6`}>
            <h3 className="font-serif text-base sm:text-xl text-on-surface mb-0.5">Prossime lezioni</h3>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">Lezioni disponibili</p>
            {prossimeLezioni.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant font-serif italic text-sm">
                Nessuna lezione prenotata
              </div>
            ) : (
              <div className="space-y-2">
                {prossimeLezioni.map((b, i) => {
                  const course = (b as any).courses;
                  const dataFmt = new Date(b.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
                  const ore = course ? `${course.ora_inizio?.slice(0,5)}–${course.ora_fine?.slice(0,5)}` : '';
                  return (
                    <motion.div key={b.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.07 }}
                      className="flex items-center gap-3 p-3 sm:p-4 bg-surface rounded-2xl border border-outline-variant/20 hover:border-primary/30 group transition-all"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: course?.colore ? course.colore + '22' : `${T}12` }}>
                        <CalendarCheck size={14} style={{ color: course?.colore ?? T }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors">{course?.nome ?? '—'}</p>
                        <p className="text-[10px] sm:text-xs text-on-surface-variant">{dataFmt}{ore && ` · ${ore}`}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
