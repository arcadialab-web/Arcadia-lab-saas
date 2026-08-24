import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, X, Check, AlertCircle, CalendarX, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Course {
  id: string;
  nome: string;
  descrizione: string;
  luogo: string;
  testo_pulsante: string;
  giorno_settimana: number;
  ora_inizio: string;
  ora_fine: string;
  posti_max: number;
  colore: string;
  is_attivo: boolean;
}

interface Exception {
  id: string;
  course_id: string;
  data: string;
  motivo: string;
}

const GIORNI = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const COLORI = ['#b56a56','#8ba888','#c4a882','#8b9dc3','#b0a4c4','#c4a4a4'];

const input = 'w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-on-surface text-sm placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
const label = 'block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1.5';

const emptyForm = {
  nome: '', descrizione: '', luogo: 'Studio Arcadia Lab', testo_pulsante: '', giorno_settimana: 2,
  ora_inizio: '19:00', ora_fine: '20:00',
  posti_max: 15, colore: '#b56a56', is_attivo: true,
};

function CourseModal({ course, onClose, onSave }: {
  course: Partial<Course> | null;
  onClose: () => void;
  onSave: (data: typeof emptyForm) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...emptyForm, ...course });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
          <h3 className="font-serif text-lg text-on-surface">{course?.id ? 'Modifica corso' : 'Nuovo corso'}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>
        <form onSubmit={async e => { e.preventDefault(); setSaving(true); await onSave(form as any); setSaving(false); }}
          className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
        >
          <div>
            <label className={label}>Nome corso *</label>
            <input className={input} required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Es. Vinyasa Flow" />
          </div>
          <div>
            <label className={label}>Descrizione</label>
            <input className={input} value={form.descrizione} onChange={e => set('descrizione', e.target.value)} placeholder="Breve descrizione" />
          </div>
          <div>
            <label className={label}>Luogo</label>
            <input className={input} value={form.luogo} onChange={e => set('luogo', e.target.value)} placeholder="Es. Studio Arcadia Lab" />
          </div>
          <div>
            <label className={label}>Testo pulsante</label>
            <input className={input} value={form.testo_pulsante} onChange={e => set('testo_pulsante', e.target.value)} placeholder="Es. Prenota Mercoledì (lascia vuoto per auto)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Giorno *</label>
              <select className={input} value={form.giorno_settimana} onChange={e => set('giorno_settimana', parseInt(e.target.value))}>
                {GIORNI.map((g, i) => <option key={i} value={i}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Posti max</label>
              <input className={input} type="number" min="1" value={form.posti_max} onChange={e => set('posti_max', parseInt(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Ora inizio *</label>
              <input className={input} type="time" required value={form.ora_inizio} onChange={e => set('ora_inizio', e.target.value)} />
            </div>
            <div>
              <label className={label}>Ora fine *</label>
              <input className={input} type="time" required value={form.ora_fine} onChange={e => set('ora_fine', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Colore</label>
            <div className="flex gap-2">
              {COLORI.map(c => (
                <button key={c} type="button" onClick={() => set('colore', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.colore === c ? 'border-on-surface scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant text-sm font-bold hover:bg-surface-container transition-all">Annulla</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? 'Salvataggio...' : <><Check size={15} /> Salva</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ExceptionsPanel({ course, exceptions, onAdd, onDelete }: {
  course: Course;
  exceptions: Exception[];
  onAdd: (courseId: string, data: string, motivo: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen]     = useState(false);
  const [newDate, setDate]  = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const mine = exceptions.filter(e => e.course_id === course.id).sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="border-t border-outline-variant/10 pt-3 mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
        <CalendarX size={13} />
        {mine.length > 0 ? `${mine.length} data cancellata` : 'Gestisci date cancellate'}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {mine.map(ex => (
            <div key={ex.id} className="flex items-center justify-between gap-2 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <span className="font-semibold text-red-700">
                {new Date(ex.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
              </span>
              {ex.motivo && <span className="text-red-500 italic flex-1 truncate ml-1">— {ex.motivo}</span>}
              <button onClick={() => onDelete(ex.id)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="date" value={newDate} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
              className="flex-1 bg-surface border border-outline-variant/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary" />
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (opz.)"
              className="flex-1 bg-surface border border-outline-variant/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary" />
            <button
              onClick={async () => {
                if (!newDate) return;
                setSaving(true);
                await onAdd(course.id, newDate, motivo);
                setDate(''); setMotivo(''); setSaving(false);
              }}
              disabled={!newDate || saving}
              className="bg-red-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {saving ? '...' : 'Cancella'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoursesManagementPanel() {
  const [courses, setCourses]       = useState<Course[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [modal, setModal]           = useState<Partial<Course> | null | undefined>(undefined);
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: ex }] = await Promise.all([
      supabase.from('courses').select('*').order('giorno_settimana'),
      supabase.from('course_exceptions').select('*').order('data'),
    ]);
    setCourses(c || []);
    setExceptions(ex || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form: typeof emptyForm) => {
    if (modal?.id) {
      const { error } = await supabase.from('courses').update(form).eq('id', modal.id);
      if (error) { notify('error', 'Errore durante il salvataggio.'); return; }
    } else {
      const { error } = await supabase.from('courses').insert(form);
      if (error) { notify('error', 'Errore durante la creazione.'); return; }
    }
    notify('success', 'Corso salvato.');
    setModal(undefined);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo corso? Tutte le prenotazioni saranno cancellate.')) return;
    await supabase.from('courses').delete().eq('id', id);
    notify('success', 'Corso eliminato.');
    load();
  };

  const handleToggle = async (course: Course) => {
    await supabase.from('courses').update({ is_attivo: !course.is_attivo }).eq('id', course.id);
    load();
  };

  const addException = async (courseId: string, data: string, motivo: string) => {
    const { error } = await supabase.from('course_exceptions').insert({ course_id: courseId, data, motivo: motivo || null });
    if (error) notify('error', 'Errore: ' + error.message);
    else load();
  };

  const deleteException = async (id: string) => {
    await supabase.from('course_exceptions').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">{courses.length} corsi configurati</p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModal(null)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg"
        >
          <Plus size={15} /> Nuovo corso
        </motion.button>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${msg.type === 'success' ? 'border border-primary/20 text-primary' : 'bg-red-50 border border-red-200 text-red-600'}`}
            style={msg.type === 'success' ? { background: 'rgba(181,106,86,0.07)' } : {}}
          >
            {msg.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-16 font-serif italic text-on-surface-variant">Caricamento corsi...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif italic text-on-surface-variant mb-4">Nessun corso configurato.</p>
          <button onClick={() => setModal(null)} className="text-primary text-sm font-bold hover:underline">+ Crea il primo corso</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-surface-container-low border rounded-[1.5rem] p-5 flex flex-col gap-3 transition-all ${course.is_attivo ? 'border-outline-variant/30' : 'border-outline-variant/15 opacity-60'}`}
            >
              {/* Header corso */}
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: course.colore }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface">{course.nome}</p>
                  {course.descrizione && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{course.descrizione}</p>}
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: course.is_attivo ? 'rgba(139,168,136,0.15)' : 'rgba(0,0,0,0.06)', color: course.is_attivo ? '#8ba888' : '#999' }}>
                  {course.is_attivo ? 'Attivo' : 'Inattivo'}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                  {GIORNI[course.giorno_settimana]}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                  {course.ora_inizio.slice(0,5)} – {course.ora_fine.slice(0,5)}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                  max {course.posti_max} posti
                </span>
              </div>

              {/* Eccezioni */}
              <ExceptionsPanel
                course={course}
                exceptions={exceptions}
                onAdd={addException}
                onDelete={deleteException}
              />

              {/* Azioni */}
              <div className="flex gap-2 pt-1 border-t border-outline-variant/20">
                <button onClick={() => handleToggle(course)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-outline-variant/40 text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all">
                  {course.is_attivo ? 'Disattiva' : 'Attiva'}
                </button>
                <button onClick={() => setModal(course)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-outline-variant/40 text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-1">
                  <Pencil size={12} /> Modifica
                </button>
                <button onClick={() => handleDelete(course.id)}
                  className="p-2 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:border-red-300 hover:text-red-500 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal !== undefined && (
          <CourseModal course={modal} onClose={() => setModal(undefined)} onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  );
}
