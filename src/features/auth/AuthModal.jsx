import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

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
