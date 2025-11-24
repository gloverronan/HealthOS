import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getLocalISODate } from '../../utils/dateUtils';

const CardioTab = ({ isReady, userId, showToast, selectedDate, onSelectDate, initialData, onSave }) => {
    const [type, setType] = useState(initialData ? initialData.type : 'run');
    const [distance, setDistance] = useState(initialData ? initialData.distance : '');
    const [time, setTime] = useState(initialData ? initialData.time : '');
    const [className, setClassName] = useState(initialData ? initialData.className : '');

    useEffect(() => {
        if (initialData) {
            setType(initialData.type);
            setDistance(initialData.distance);
            setTime(initialData.time);
            setClassName(initialData.className || '');
        } else {
            setType('run');
            setDistance('');
            setTime('');
            setClassName('');
        }
    }, [initialData]);

    const logCardio = async () => {
        if (!isReady || !userId) return showToast('Database not ready.', 'error');
        if (!time) return showToast('Enter duration', 'error');
        if (type !== 'class' && !distance) return showToast('Enter distance', 'error');
        if (type === 'class' && !className) return showToast('Enter class name', 'error');

        const dist = parseFloat(distance) || 0;
        const timeMin = parseFloat(time);

        if (isNaN(timeMin) || timeMin <= 0) return showToast('Invalid duration', 'error');
        if (type !== 'class' && (isNaN(dist) || dist <= 0)) return showToast('Invalid distance', 'error');

        let calories = 0;
        if (type === 'run') calories = Math.round(dist * 100);
        else if (type === 'cycle') calories = Math.round(dist * 40);
        else if (type === 'swim') calories = Math.round(dist * 250);
        else if (type === 'hike') calories = Math.round(dist * 70);
        else if (type === 'class') calories = Math.round(timeMin * 8);

        const data = {
            date: selectedDate,
            timestamp: serverTimestamp(),
            type,
            distance: dist,
            time: timeMin,
            calories,
            className: type === 'class' ? className : null
        };

        try {
            if (initialData) {
                await updateDoc(doc(db, 'users', userId, 'cardio_logs', initialData.id), data);
                showToast('Activity updated!', 'success');
                if (onSave) onSave();
            } else {
                await addDoc(collection(db, 'users', userId, 'cardio_logs'), data);
                setDistance(''); setTime(''); setClassName('');
                showToast('Cardio logged!', 'success');
                if (onSave) onSave();
            }
        } catch (e) {
            showToast('Logging failed. Check Security Rules.', 'error');
            console.error("Firestore Error:", e);
        }
    };

    const deleteLog = async () => {
        if (!initialData || !confirm('Delete this entry?')) return;
        try {
            await deleteDoc(doc(db, 'users', userId, 'cardio_logs', initialData.id));
            showToast('Entry deleted.', 'success');
            if (onSave) onSave();
        } catch (e) {
            showToast('Delete failed.', 'error');
        }
    };

    const isToday = selectedDate === getLocalISODate();
    const dateDisplay = isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="space-y-8 pb-24">
            <div className="flex items-center justify-between relative">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors relative">
                    {dateDisplay}
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onSelectDate(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </h2>
                {initialData && (
                    <button onClick={deleteLog} className="text-red-500 bg-red-500/10 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-colors">
                        Delete
                    </button>
                )}
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-pink-600 rounded-3xl p-8 text-center">
                <h2 className="text-4xl font-black mb-2">{initialData ? 'Edit Cardio' : 'Cardio'}</h2>
                <p className="text-white/80">{initialData ? 'Update your session details' : 'Log your runs, rides, swims, hikes...'}</p>
            </div>

            <div className="space-y-6">
                <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-900/80 rounded-xl px-6 py-4 text-lg font-bold border border-slate-700">
                    <option value="run">Running</option>
                    <option value="cycle">Cycling</option>
                    <option value="swim">Swimming</option>
                    <option value="hike">Hiking</option>
                    <option value="class">Class (Yoga, Pilates, etc.)</option>
                </select>

                {type === 'class' ? (
                    <input type="text" placeholder="Class Name (e.g. Yoga)" value={className} onChange={e => setClassName(e.target.value)}
                        className="w-full bg-slate-900/80 rounded-xl px-6 py-4 text-lg font-bold border border-slate-700" />
                ) : (
                    <input type="number" placeholder="Distance (km)" value={distance} onChange={e => setDistance(e.target.value)}
                        className="w-full bg-slate-900/80 rounded-xl px-6 py-4 text-lg font-bold border border-slate-700" />
                )}


                <input type="number" placeholder="Time (minutes)" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full bg-slate-900/80 rounded-xl px-6 py-4 text-2xl font-bold text-center" />

                <div className="flex gap-3">
                    {initialData && (
                        <button onClick={onSave} className="flex-1 py-6 bg-slate-800 rounded-2xl font-black text-2xl text-slate-400">
                            Cancel
                        </button>
                    )}
                    <button onClick={logCardio} className="flex-1 py-6 bg-gradient-to-r from-orange-600 to-pink-600 rounded-2xl font-black text-2xl">
                        {initialData ? 'Save Changes' : 'Log Cardio'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardioTab;
