import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn, Mail, UserPlus, Github, Chrome } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
}

export function AuthModal({ isOpen, onClose, isMandatory = false }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/90 backdrop-blur-md"
            onClick={() => !isMandatory && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-ink border border-white/10 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/10 blur-[80px] rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-44 h-44 bg-gold/5 blur-[60px] rounded-full" />

            {!isMandatory && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}

            <div className="text-center mb-8">
              <h2 className="font-serif text-3xl text-gold mb-2">
                {mode === 'login' ? 'Bienvenido a Élite' : 'Únete a Ketut'}
              </h2>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-medium">
                {mode === 'login' ? 'Accede a tu concierge personal' : 'Crea tu perfil de miembro exclusivo'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-500">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                    placeholder="Tu nombre"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 ml-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2 ml-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-ink font-bold text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-white transition-all disabled:opacity-50 mt-4 shadow-lg shadow-gold/10"
              >
                {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-ink px-4 text-white/30 uppercase tracking-[0.2em] text-[9px]">O continúa con</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-2xl py-4 text-white hover:bg-white/10 transition-all mb-8"
            >
              <Chrome size={18} className="text-gold" />
              <span className="text-[11px] uppercase tracking-widest font-medium">Google Access</span>
            </button>

            <p className="text-center text-[11px] text-white/40">
              {mode === 'login' ? '¿Aún no eres miembro?' : '¿Ya tienes una cuenta?'}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-gold ml-2 font-semibold hover:underline"
              >
                {mode === 'login' ? 'Solicitar Membresía' : 'Iniciar Sesión'}
              </button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
