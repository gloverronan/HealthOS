import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, query, where, orderBy, limit, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getLocalISODate } from '../../utils/dateUtils';

const GymTab = ({ workouts, setWorkouts, isReady, userId, showToast, stats, setStats, selectedDate, onSelectDate, gymLogs, initialData, onSave, exerciseSettings, setExerciseSettings }) => {
    const [selected, setSelected] = useState(null);
    const [logData, setLogData] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newExercise, setNewExercise] = useState('');
    const [newExerciseType, setNewExerciseType] = useState('weighted'); // 'weighted' or 'bodyweight'
    const [skippedExercises, setSkippedExercises] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    // --- 1. INITIALIZATION & HISTORY LOADING ---
    useEffect(() => {
        if (selected && userId) {
            loadLastSession(selected.id);
        }
    }, [selected]);

    const loadLastSession = async (workoutId) => {
        if (!isReady) return;

        try {
            const q = query(
                collection(db, 'users', userId, 'gym_logs'),
                where('workoutId', '==', workoutId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const lastLog = snapshot.docs[0].data();
                // Filter out skipped exercises from the last session
                const exercisesToLoad = Object.keys(lastLog.exercises || {}).filter(ex => {
                    // Check if it was skipped in the last session (if we tracked that)
                    // For now, just load all that have data
                    return true;
                });

                // Reconstruct logData structure
                const newLogData = {};
                exercisesToLoad.forEach(ex => {
                    newLogData[ex] = lastLog.exercises[ex];
                });
                setLogData(newLogData);
            } else {
                throw new Error("No history");
            }
        } catch (e) {
            console.log("History load error (or no history):", e);
            if (e.code === 'failed-precondition') {
                console.warn("Missing Index. Please create it:", e.message);
                // Optional: showToast("Dev: Missing Index. Check Console.", "error");
            }

            // Fallback to default list
            const defaultExercises = selected.exercises || [];
            const newLogData = {};
            defaultExercises.forEach(ex => {
                const name = typeof ex === 'string' ? ex : ex.name;
                newLogData[name] = {
                    [Date.now() + Math.random()]: { w: '', r: '' },
                    [Date.now() + Math.random()]: { w: '', r: '' },
                    [Date.now() + Math.random()]: { w: '', r: '' }
                };
            });
            setLogData(newLogData);
        }
    };

    // --- 2. DRAG AND DROP HANDLERS ---
    const handleDragStart = (e, exercise) => {
        setDraggedItem(exercise);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, exercise) => {
        e.preventDefault();
        if (draggedItem === exercise) return;

        // Reorder logData keys
        const keys = Object.keys(logData);
        const fromIndex = keys.indexOf(draggedItem);
        const toIndex = keys.indexOf(exercise);

        if (fromIndex !== -1 && toIndex !== -1) {
            const newKeys = [...keys];
            newKeys.splice(fromIndex, 1);
            newKeys.splice(toIndex, 0, draggedItem);

            const newLogData = {};
            newKeys.forEach(k => newLogData[k] = logData[k]);
            setLogData(newLogData);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    // --- 3. EXERCISE MANAGEMENT ---
    const handleAddExercise = async () => {
        if (!newExercise) return;

        // Add to current session
        setLogData(prev => ({
            ...prev,
            [newExercise]: {
                [Date.now()]: { w: '', r: '' },
                [Date.now() + 1]: { w: '', r: '' },
                [Date.now() + 2]: { w: '', r: '' }
            }
        }));

        // Save metadata if new
        if (!exerciseSettings?.[newExercise]) {
            const newSettings = { ...exerciseSettings, [newExercise]: { type: newExerciseType } };
            setExerciseSettings(newSettings);
            try {
                await setDoc(doc(db, 'users', userId, 'settings', 'exercises'), newSettings, { merge: true });
            } catch (e) { console.error("Failed to save exercise settings", e); }
        }

        setNewExercise('');
        setIsAdding(false);
    };

    const finishWorkout = async () => {
        if (!isReady || !userId) return showToast('Database not ready.', 'error');

        const exercises = Object.entries(logData).map(([name, setsObj]) => {
            const sets = Object.values(setsObj)
                .filter(s => s.w || s.r) // Filter empty sets
                .map(s => ({ weight: s.w, reps: s.r }));
            return { exercise: name, sets };
        }).filter(e => e.sets.length > 0); // Filter exercises with no sets

        if (exercises.length === 0) return showToast('Log at least one set.', 'error');

        const data = {
            date: selectedDate,
            timestamp: serverTimestamp(),
            workoutId: selected.id,
            workoutName: selected.name,
            exercises
        };

        try {
            await addDoc(collection(db, 'users', userId, 'gym_logs'), data);

            // Update stats (PRs)
            const newStats = { ...stats };
            exercises.forEach(ex => {
                const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
                const bestSet = ex.sets.find(s => Number(s.weight) === maxWeight);

                if (!stats[ex.exercise] || maxWeight > stats[ex.exercise].w) {
                    newStats[ex.exercise] = { w: maxWeight, r: bestSet.reps, date: selectedDate };
                }
            });
            setStats(newStats);
            await setDoc(doc(db, 'users', userId, 'stats', 'exercises'), newStats, { merge: true });

            showToast('Workout logged!', 'success');
            if (onSave) onSave(); // Go back
        } catch (e) {
            showToast('Logging failed.', 'error');
            console.error(e);
        }
    };

    const deleteLog = async () => {
        if (!initialData || !confirm('Delete this workout?')) return;
        try {
            await deleteDoc(doc(db, 'users', userId, 'gym_logs', initialData.id));
            showToast('Workout deleted.', 'success');
            if (onSave) onSave();
        } catch (e) {
            showToast('Delete failed.', 'error');
        }
    };

    // --- RENDER: DETAILS VIEW (READ ONLY) ---
    if (initialData) {
        return (
            <div className="space-y-6 pb-24">
                <div className="flex items-center justify-between relative">
                    <h2 className="text-2xl font-bold text-white">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h2>
                    <button onClick={deleteLog} className="text-red-500 bg-red-500/10 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-colors">
                        Delete
                    </button>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
                    <h2 className="text-3xl font-black text-white mb-6">{initialData.workoutName}</h2>
                    <div className="space-y-6">
                        {initialData.exercises.map((ex, idx) => (
                            <div key={idx} className="border-b border-slate-800 pb-4 last:border-0">
                                <h3 className="font-bold text-xl text-cyan-400 mb-2">{ex.exercise}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {ex.sets.map((set, sIdx) => (
                                        <div key={sIdx} className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-sm">
                                            <span className="font-bold text-white">{set.weight}kg</span> <span className="text-slate-500">x</span> <span className="font-bold text-white">{set.reps}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={onSave} className="w-full py-4 bg-slate-800 rounded-2xl font-bold text-slate-400">Close</button>
            </div>
        );
    }

    // --- RENDER: WORKOUT SELECTION ---
    if (!selected) {
        return (
            <div className="space-y-6 pb-24 animate-in fade-in">
                <div className="flex items-center justify-between relative">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors relative">
                        {selectedDate === getLocalISODate() ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        <input type="date" value={selectedDate} onChange={(e) => onSelectDate(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {workouts.map(w => (
                        <button key={w.id} onClick={() => setSelected(w)} className="bg-slate-900/80 border border-slate-700 p-8 rounded-3xl flex items-center justify-between hover:bg-slate-800 transition-all hover:scale-[1.02] group" style={{ borderColor: w.color }}>
                            <span className="text-3xl font-black text-white">{w.name}</span>
                            <span className="text-4xl group-hover:scale-110 transition-transform">{w.emoji || '💪'}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // --- RENDER: ACTIVE SESSION ---
    const activeExercises = Object.keys(logData).filter(ex => !skippedExercises.includes(ex));

    return (
        <div className="space-y-6 pb-24 animate-in slide-in-from-right">
            <div className="flex items-center justify-between">
                <button onClick={() => setSelected(null)} className="text-slate-400 font-bold hover:text-white">← Change Workout</button>
                <h2 className="text-2xl font-black text-white" style={{ color: selected.color }}>{selected.name}</h2>
            </div>

            <div className="space-y-4">
                {activeExercises.map((ex, idx) => {
                    // Check settings OR default workout definition for bodyweight status
                    const defaultEx = selected.exercises.find(e => (typeof e === 'string' ? e : e.name) === ex);
                    const isBodyweight = exerciseSettings?.[ex]?.type === 'bodyweight' || defaultEx?.bodyweight;

                    return (
                        <div
                            key={ex}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ex)}
                            onDragOver={(e) => handleDragOver(e, ex)}
                            onDragEnd={handleDragEnd}
                            className={`bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700 transition-all ${draggedItem === ex ? 'opacity-50 scale-95' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-4 cursor-move">
                                <div>
                                    <h3 className="font-bold text-xl flex items-center gap-2">
                                        {ex}
                                        {isBodyweight && <span className="bg-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-300">BW</span>}
                                    </h3>
                                    {stats[ex] && <div className="text-xs text-emerald-400 font-bold mt-1">Last: {stats[ex].w}kg x {stats[ex].r}</div>}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setSkippedExercises(prev => [...prev, ex])} className="text-slate-500 text-sm font-bold hover:text-white">SKIP</button>
                                    <button onClick={() => setLogData(prev => ({ ...prev, [ex]: { ...prev[ex], [Date.now()]: { w: '', r: '' } } }))} className="text-cyan-400 text-sm font-bold">+ ADD SET</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center mb-2 text-xs text-slate-500 font-bold uppercase text-center">
                                <div className="w-6">#</div>
                                <div>{isBodyweight ? '+Weight' : 'Weight'}</div>
                                <div>Reps</div>
                                <div className="w-8"></div>
                            </div>

                            <div className="space-y-2">
                                {Object.entries(logData[ex] || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([setId, set], i) => (
                                    <div key={setId} className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center">
                                        <div className="w-6 text-center text-slate-500 font-bold">{i + 1}</div>
                                        {!isBodyweight ? (
                                            <input key="weight" type="number" placeholder="kg" value={set.w} onChange={e => setLogData(prev => ({ ...prev, [ex]: { ...prev[ex], [setId]: { ...set, w: e.target.value } } }))}
                                                className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center font-bold text-white focus:border-cyan-500 outline-none transition-colors" />
                                        ) : (
                                            <div className="text-center text-slate-600 font-bold text-sm py-3">BW</div>
                                        )}
                                        <input key="reps" type="number" placeholder="0" value={set.r} onChange={e => setLogData(prev => ({ ...prev, [ex]: { ...prev[ex], [setId]: { ...set, r: e.target.value } } }))}
                                            className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center font-bold text-white focus:border-cyan-500 outline-none transition-colors" />
                                        <button onClick={() => {
                                            const newSets = { ...logData[ex] };
                                            delete newSets[setId];
                                            setLogData(prev => ({ ...prev, [ex]: newSets }));
                                        }} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                {!isAdding ? (
                    <button onClick={() => setIsAdding(true)} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 font-bold hover:border-cyan-500 hover:text-cyan-500 transition-colors">+ Add Exercise</button>
                ) : (
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 animate-in fade-in">
                        <h3 className="font-bold text-white mb-4">Add Exercise</h3>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setNewExerciseType('weighted')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${newExerciseType === 'weighted' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Weighted</button>
                            <button onClick={() => setNewExerciseType('bodyweight')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${newExerciseType === 'bodyweight' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Bodyweight</button>
                        </div>
                        <input autoFocus className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white" placeholder="Exercise Name (e.g. Bench Press)" value={newExercise} onChange={e => setNewExercise(e.target.value)} />

                        {/* History Suggestions */}
                        {Object.keys(stats).length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {Object.keys(stats).filter(k => k.toLowerCase().includes(newExercise.toLowerCase()) && !activeExercises.includes(k)).slice(0, 5).map(ex => (
                                    <button key={ex} onClick={() => { setNewExercise(ex); setNewExerciseType(exerciseSettings?.[ex]?.type || 'weighted'); }} className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-300 hover:bg-slate-700 border border-slate-700">{ex}</button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400">Cancel</button>
                            <button onClick={handleAddExercise} className="flex-1 py-3 bg-cyan-600 rounded-xl font-bold text-white">Add</button>
                        </div>
                    </div>
                )}
            </div>

            {skippedExercises.length > 0 && (
                <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase mb-2">Skipped Exercises</div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {skippedExercises.map(ex => (
                            <button key={ex} onClick={() => setSkippedExercises(prev => prev.filter(e => e !== ex))} className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">+ {ex}</button>
                        ))}
                    </div>
                </div>
            )}

            <button onClick={finishWorkout} className="w-full py-6 rounded-2xl font-black text-2xl text-white shadow-lg shadow-cyan-900/20 hover:scale-[1.02] transition-transform" style={{ background: selected.color }}>
                Finish Workout
            </button>
        </div>
    );
};

export default GymTab;
