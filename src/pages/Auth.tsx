import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';

type Mode = 'login' | 'register' | 'recovery' | 'reset';

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-primary">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

const inputClass = "w-full bg-white border border-outline-variant/50 rounded-2xl px-4 py-3.5 text-on-surface text-sm placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-200";
const labelClass = "block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2";

export default function Auth() {
  const [mode, setMode]               = useState<Mode>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();

  // Rileva il ritorno dal link di recupero password
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  const reset = () => { setEmail(''); setPassword(''); setConfirm(''); setMessage(null); };
  const switchMode = (m: Mode) => { reset(); setMode(m); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else if (mode === 'reset') {
        if (password !== confirmPassword) { setMessage({ type: 'error', text: 'Le password non coincidono.' }); return; }
        if (password.length < 6) { setMessage({ type: 'error', text: 'Password di almeno 6 caratteri.' }); return; }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password aggiornata con successo!' });
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Email inviata! Controlla la tua casella di posta.' });
        setEmail('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore. Riprova.';
      setMessage({ type: 'error', text: translateError(msg) });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login:    'Accedi',
    register: 'Abbonati',
    recovery: 'Recupera password',
    reset:    'Nuova password',
  };

  const subtitles: Record<Mode, string> = {
    login:    'Bentornata/o nel tuo spazio Arcadia Lab.',
    register: 'Scegli il tuo piano per iniziare a praticare',
    recovery: 'Ti invieremo un link via email',
    reset:    'Scegli una nuova password per il tuo account',
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar />

      {/* Decorazioni sfondo */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-primary-container/5 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-24 relative z-10">
        <div className="w-full max-w-md">

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-[2rem] shadow-2xl shadow-primary/8 border border-outline-variant/20 overflow-hidden"
          >
            {/* Header card */}
            <div className="px-8 pt-8 pb-6 border-b border-outline-variant/10 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center">
                  <PersonIcon />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="text-2xl font-serif text-on-surface">{titles[mode]}</h1>
                  <p className="text-xs text-on-surface-variant mt-1.5 font-label">{subtitles[mode]}</p>
                </motion.div>
              </AnimatePresence>

              {/* Tab login/register */}
              {mode !== 'recovery' && mode !== 'reset' && (
                <div className="flex gap-1 bg-surface-container-low p-1 rounded-2xl mt-5">
                  {(['login', 'register'] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ${mode === m ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      {m === 'login' ? 'Accedi' : 'Abbonati'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Form / Avviso abbonamento */}
            <div className="px-8 py-7">
              <AnimatePresence mode="wait">
                {mode === 'register' ? (
                  <motion.div
                    key="register-notice"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="text-center space-y-5"
                  >
                    <div className="w-14 h-14 mx-auto rounded-full bg-primary/8 flex items-center justify-center">
                      <Sparkles size={22} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Per accedere allo spazio Arcadia Lab è necessario un abbonamento attivo.
                      Scegliendo un piano riceverai automaticamente le credenziali per accedere al tuo account.
                    </p>
                    <Link
                      to="/#pricing"
                      className="w-full inline-block bg-primary text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-opacity-90 transition-all"
                    >
                      Scopri i piani
                    </Link>
                  </motion.div>
                ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Email (non mostrata in reset) */}
                  {mode !== 'reset' && (
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email" required
                      placeholder="la-tua@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  )}

                  {/* Password */}
                  {(mode !== 'recovery') && (
                    <div>
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className={`${inputClass} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Conferma password */}
                  {mode === 'reset' && (
                    <div>
                      <label className={labelClass}>Conferma password</label>
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirm(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}

                  {/* Link recupero */}
                  {mode === 'login' && (
                    <div className="flex justify-end -mt-1">
                      <button type="button" onClick={() => switchMode('recovery')} className="text-xs text-primary hover:underline">
                        Password dimenticata?
                      </button>
                    </div>
                  )}

                  {/* Messaggio feedback */}
                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-primary/7 text-primary border border-primary/15' : 'bg-red-50 text-red-600 border border-red-100'}`}
                        style={message.type === 'success' ? { background: 'rgba(181,106,86,0.07)' } : {}}
                      >
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Caricamento...
                        </span>
                      : mode === 'login' ? 'Accedi al tuo spazio'
                      : mode === 'reset' ? 'Salva nuova password'
                      : 'Invia email di recupero'
                    }
                  </motion.button>

                  {/* Back (solo recovery) */}
                  {mode === 'recovery' && (
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="w-full flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors py-1"
                    >
                      <ArrowLeft size={14} />
                      Torna al login
                    </button>
                  )}
                </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Footer card (nascosto nell'avviso abbonamento, già ha il proprio CTA) */}
            {mode !== 'register' && (
              <div className="px-8 pb-7 text-center">
                <p className="text-xs text-on-surface-variant">
                  Acquistando un abbonamento ricevi automaticamente le credenziali di accesso.{' '}
                  <Link to="/#pricing" className="text-primary hover:underline">Scopri i piani →</Link>
                </p>
              </div>
            )}
          </motion.div>

          {/* Link torna al sito */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6 text-sm text-on-surface-variant"
          >
            <Link to="/" className="hover:text-primary transition-colors flex items-center justify-center gap-1.5">
              <ArrowLeft size={13} />
              Torna al sito
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email o password non corretti.';
  if (msg.includes('Email not confirmed'))        return 'Devi prima confermare la tua email.';
  if (msg.includes('User already registered'))    return 'Questa email è già registrata. Prova ad accedere.';
  if (msg.includes('rate limit'))                 return 'Troppi tentativi. Riprova tra qualche minuto.';
  return msg;
}
