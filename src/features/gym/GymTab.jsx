import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, query, where, orderBy, limit, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getLocalISODate } from '../../utils/dateUtils';
import { renameExercise, deleteExercise, addExercise, getExerciseLibrary } from '../../services/exerciseLibrary';

const GymTab = ({ workouts, setWorkouts, isReady, userId, showToast, stats, setStats, selectedDate, onSelectDate, gymLogs, initialData, onSave, exerciseSettings, setExerciseSettings, exerciseLibrary, setExerciseLibrary }) => {
    const [selected, setSelected] = useState(null);
    const [logData, setLogData] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newExercise, setNewExercise] = useState('');
    const [newExerciseType, setNewExerciseType] = useState('weighted'); // 'weighted' or 'bodyweight'

    const [draggedItem, setDraggedItem] = useState(null);
    const [editingExercise, setEditingExercise] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

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

                // Reconstruct logData structure from exercises array
                const newLogData = {};
                const exercises = lastLog.exercises || [];

                exercises.forEach(ex => {
                    const exerciseName = ex.exercise;
                    const sets = ex.sets || [];

                    // Convert sets array to object keyed by timestamps
                    const setsObj = {};
                    sets.forEach((set, idx) => {
                        setsObj[Date.now() + idx] = {
                            w: set.weight || '',
                            r: set.reps || ''
                        };
                    });

                    newLogData[exerciseName] = setsObj;
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

    const handleRename = async (oldName) => {
        if (!renameValue.trim() || renameValue === oldName) {
            setEditingExercise(null);
            return;
        }

        const newName = renameValue.trim();

        // Prevent duplicates
        if (logData[newName]) {
            showToast('Exercise name already exists in this session', 'error');
            return;
        }

        // Check if name exists in library
        if (exerciseLibrary.some(ex => ex.name === newName && ex.name !== oldName)) {
            showToast('Exercise name already exists in library', 'error');
            return;
        }

        setIsRenaming(true);
        try {
            // Call service to rename and propagate
            await renameExercise(userId, oldName, newName);

            // Update local logData
            const newLogData = {};
            Object.keys(logData).forEach(key => {
                if (key === oldName) {
                    newLogData[newName] = logData[key];
                } else {
                    newLogData[key] = logData[key];
                }
            });
            setLogData(newLogData);

            // Reload exercise library
            const updatedLibrary = await getExerciseLibrary(userId);
            setExerciseLibrary(updatedLibrary);

            showToast('Exercise renamed!', 'success');
        } catch (e) {
            console.error('Rename error:', e);
            showToast('Failed to rename exercise', 'error');
        }
        setIsRenaming(false);
        setEditingExercise(null);
    };

    const handleDeleteExercise = async (exerciseName) => {
        if (!confirm(`Delete "${exerciseName}" from your exercise library?\n\nThis will not delete historical workout logs.`)) {
            return;
        }

        try {
            await deleteExercise(userId, exerciseName);

            // Reload exercise library
            const updatedLibrary = await getExerciseLibrary(userId);
            setExerciseLibrary(updatedLibrary);

            showToast('Exercise deleted from library', 'success');
        } catch (e) {
            console.error('Delete error:', e);
            showToast('Failed to delete exercise', 'error');
        }
    };

    // --- 3. EXERCISE MANAGEMENT ---
    const handleAddExercise = async () => {
        if (!newExercise) return;

        try {
            // Add to exercise library if it doesn't exist
            if (!exerciseLibrary.some(ex => ex.name === newExercise)) {
                await addExercise(userId, newExercise, newExerciseType);

                // Reload library
                const updatedLibrary = await getExerciseLibrary(userId);
                setExerciseLibrary(updatedLibrary);
            }

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
        } catch (e) {
            console.error('Add exercise error:', e);
            showToast('Failed to add exercise', 'error');
        }
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
            // Delete the log
            await deleteDoc(doc(db, 'users', userId, 'gym_logs', initialData.id));

            // Recalculate stats from all remaining logs
            const logsRef = collection(db, 'users', userId, 'gym_logs');
            const allLogsSnapshot = await getDocs(logsRef);

            const newStats = {};

            // Go through all remaining logs and find the best performance for each exercise
            allLogsSnapshot.docs.forEach(logDoc => {
                const logData = logDoc.data();
                const exercises = logData.exercises || [];

                exercises.forEach(ex => {
                    const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
                    const bestSet = ex.sets.find(s => Number(s.weight) === maxWeight);

                    // If we don't have a record for this exercise yet, or this is better
                    if (!newStats[ex.exercise] || maxWeight > newStats[ex.exercise].w) {
                        newStats[ex.exercise] = {
                            w: maxWeight,
                            r: bestSet ? bestSet.reps : 0,
                            date: logData.date
                        };
                    }
                });
            });

            // Update stats in Firestore
            await setDoc(doc(db, 'users', userId, 'stats', 'exercises'), newStats);
            setStats(newStats);

            showToast('Workout deleted and PRs recalculated!', 'success');
            if (onSave) onSave();
        } catch (e) {
            showToast('Delete failed.', 'error');
            console.error(e);
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
    const activeExercises = Object.keys(logData);

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
                                    {editingExercise === ex ? (
                                        <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onBlur={() => handleRename(ex)}
                                            onKeyDown={e => e.key === 'Enter' && handleRename(ex)}
                                            className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xl font-bold text-white outline-none focus:border-cyan-500 w-full"
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <h3 className="font-bold text-xl flex items-center gap-2 group/title cursor-pointer" onClick={() => { setEditingExercise(ex); setRenameValue(ex); }}>
                                            {ex}
                                            <svg className="w-4 h-4 text-slate-600 group-hover/title:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            {isBodyweight && <span className="bg-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-300">BW</span>}
                                        </h3>
                                    )}
                                    {stats[ex] && <div className="text-xs text-emerald-400 font-bold mt-1">PB: {stats[ex].w}kg x {stats[ex].r}</div>}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => {
                                        if (confirm(`Remove ${ex} from this workout?`)) {
                                            const newLog = { ...logData };
                                            delete newLog[ex];
                                            setLogData(newLog);
                                        }
                                    }} className="text-slate-500 text-sm font-bold hover:text-red-500">REMOVE</button>
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
                                                className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg p-2 text-center font-bold text-white focus:border-cyan-500 outline-none transition-colors" />
                                        ) : (
                                            <div className="text-center text-slate-600 font-bold text-sm py-3">BW</div>
                                        )}
                                        <input key="reps" type="number" placeholder="0" value={set.r} onChange={e => setLogData(prev => ({ ...prev, [ex]: { ...prev[ex], [setId]: { ...set, r: e.target.value } } }))}
                                            className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg p-2 text-center font-bold text-white focus:border-cyan-500 outline-none transition-colors" />
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
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 animate-in fade-in text-left">
                        <h3 className="font-bold text-white mb-4">Add Exercise</h3>

                        {/* List of exercises from library */}
                        <div className="mb-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                            {exerciseLibrary.filter(ex => !logData[ex.name]).map(ex => (
                                <div key={ex.name} className="flex gap-2">
                                    <button onClick={() => {
                                        setLogData(prev => ({
                                            ...prev,
                                            [ex.name]: {
                                                [Date.now()]: { w: '', r: '' },
                                                [Date.now() + 1]: { w: '', r: '' },
                                                [Date.now() + 2]: { w: '', r: '' }
                                            }
                                        }));
                                        setIsAdding(false);
                                    }} className="flex-1 text-left px-4 py-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-colors flex justify-between items-center">
                                        <span className="font-bold">{ex.name}</span>
                                        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded">{ex.type === 'bodyweight' ? 'BW' : 'Weighted'}</span>
                                    </button>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteExercise(ex.name);
                                    }} className="w-10 h-auto flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors bg-slate-950 rounded-xl border border-slate-800">
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* New exercise input */}
                        <div className="flex gap-2 mb-4">
                            <input
                                autoFocus
                                value={newExercise}
                                onChange={e => setNewExercise(e.target.value)}
                                placeholder="Or type new exercise..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500"
                                onKeyDown={e => e.key === 'Enter' && handleAddExercise()}
                            />
                        </div>

                        {/* Exercise type selector */}
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setNewExerciseType('weighted')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${newExerciseType === 'weighted' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-500'}`}>Weighted</button>
                            <button onClick={() => setNewExerciseType('bodyweight')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${newExerciseType === 'bodyweight' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-500'}`}>Bodyweight</button>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400">Cancel</button>
                            <button onClick={handleAddExercise} disabled={!newExercise} className="flex-1 py-3 bg-cyan-600 rounded-xl font-bold text-white disabled:opacity-50">Add New</button>
                        </div>
                    </div>
                )}
            </div>

            <button onClick={finishWorkout} className="w-full py-6 rounded-2xl font-black text-2xl text-white shadow-lg shadow-cyan-900/20 hover:scale-[1.02] transition-transform" style={{ background: selected.color }}>
                Finish Workout
            </button>
        </div>
    );
};

export default GymTab;
