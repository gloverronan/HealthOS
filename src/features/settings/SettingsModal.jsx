import React, { useState, useEffect } from 'react';
import Icon from '../../components/ui/Icon';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const SettingsModal = ({ isVisible, onClose, onSave, currentKey, goals, setGoals, calendarView, setCalendarView, userId }) => {
    const [key, setKey] = useState(currentKey);
    const [localGoals, setLocalGoals] = useState(goals);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        setKey(currentKey);
        setLocalGoals(goals);
    }, [currentKey, goals]);

    // Check if current user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            if (!userId) {
                setIsAdmin(false);
                return;
            }

            try {
                const adminDocRef = doc(db, 'app_config', 'shared_keys');
                const adminDocSnap = await getDoc(adminDocRef);

                if (adminDocSnap.exists()) {
                    const adminUID = adminDocSnap.data().adminUID;
                    setIsAdmin(userId === adminUID);
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            }
        };

        if (isVisible) {
            checkAdmin();
        }
    }, [userId, isVisible]);

    const handleSaveGoals = () => {
        // Ensure all values are numbers before saving
        const sanitizedGoals = Object.entries(localGoals).reduce((acc, [k, v]) => ({
            ...acc,
            [k]: v === '' ? 0 : Number(v)
        }), {});

        setGoals(sanitizedGoals);
        onSave(key, sanitizedGoals); // Save key and goals
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in" onClick={onClose}>
            <div className="bg-slate-900/90 border border-slate-700 p-6 rounded-xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Application Settings</h3>

                {/* Goals for all users (Always Visible) */}
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pt-4 pb-2 text-cyan-400">Personal Goals</h3>
                <div className="space-y-3">
                    {Object.entries(localGoals).map(([k, v]) => (
                        <div key={k}>
                            <label className="text-sm text-slate-400 uppercase">{k === 'calories' ? 'Calories' : `${k} (g)`}</label>
                            <input
                                type="number"
                                value={v}
                                onChange={e => setLocalGoals(prev => ({ ...prev, [k]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                className="w-full bg-slate-950 p-3 rounded-xl border border-slate-700 mt-2"
                            />
                        </div>
                    ))}
                    <button onClick={handleSaveGoals} className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-lg hover:bg-emerald-500 transition-colors mt-4">Save My Goals</button>
                </div>

                {/* Calendar View Settings */}
                <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pt-8 pb-2 text-cyan-400">Calendar View</h3>
                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="font-bold text-slate-300">Default View</span>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={() => setCalendarView('week')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${calendarView === 'week' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setCalendarView('month')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${calendarView === 'month' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Month
                        </button>
                    </div>
                </div>

                {/* API Key Section (Admin Only) */}
                {isAdmin && (
                    <>
                        <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pt-8 pb-2 text-red-400">Advanced (Admin Only)</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-400 mb-2">Gemini API Key (Shared)</label>
                            <input
                                type="password"
                                value={key}
                                onChange={e => setKey(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-sm focus:border-cyan-500 outline-none"
                                placeholder="AIza..."
                            />
                            <p className="text-xs text-slate-500 mt-2">This key is shared across the app. Changing it affects all users.</p>
                        </div>
                    </>
                )}

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">Cancel</button>
                    <button onClick={() => onSave(key)} className="flex-1 py-3 bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500">Save Config</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
