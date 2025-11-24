import React, { useState } from 'react';
import { auth, googleProvider } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

const AuthModal = ({ showToast }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async () => {
        setError('');
        // const auth = getFirebaseAuth(); // Removed, using imported auth
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                showToast('Welcome back!', 'success');
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                showToast('Account created!', 'success');
            }
        } catch (e) {
            setError(e.message);
            showToast('Authentication failed.', 'error');
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
            showToast('Welcome back!', 'success');
        } catch (e) {
            setError(e.message);
            showToast('Google sign-in failed.', 'error');
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                {isLogin ? 'WELCOME BACK' : 'JOIN HEALTHOS'}
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition-colors"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition-colors"
                        placeholder="••••••••"
                    />
                </div>

                {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}

                <button
                    onClick={handleAuth}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-cyan-500/20"
                >
                    {isLogin ? 'Sign In' : 'Create Account'}
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase">Or</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-slate-500 text-sm hover:text-white transition-colors"
                    >
                        {isLogin ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
