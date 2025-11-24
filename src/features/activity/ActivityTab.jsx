import React from 'react';
import { getLocalISODate } from '../../utils/dateUtils';
import GymTab from '../gym/GymTab';
import CardioTab from '../cardio/CardioTab';

const ActivityTab = ({ workouts, setWorkouts, isReady, userId, showToast, stats, setStats, selectedDate, onSelectDate, subTab, setSubTab, cardioLogs, gymLogs, editingLog, setEditingLog, exerciseSettings, setExerciseSettings }) => {
    // Filter logs for selected date
    const todaysGym = (gymLogs || []).filter(g => g.date === selectedDate);
    const todaysCardio = (cardioLogs || []).filter(c => c.date === selectedDate);
    const hasActivity = todaysGym.length > 0 || todaysCardio.length > 0;

    const handleBack = () => {
        setSubTab('list');
        setEditingLog(null);
    };

    if (subTab === 'gym') {
        return (
            <div className="animate-in fade-in">
                <button onClick={handleBack} className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Activity
                </button>
                <GymTab workouts={workouts} setWorkouts={setWorkouts} isReady={isReady} userId={userId} showToast={showToast} stats={stats} setStats={setStats} selectedDate={selectedDate} onSelectDate={onSelectDate} gymLogs={gymLogs} initialData={editingLog} onSave={handleBack} exerciseSettings={exerciseSettings} setExerciseSettings={setExerciseSettings} />
            </div>
        );
    }

    if (subTab === 'cardio') {
        return (
            <div className="animate-in fade-in">
                <button onClick={handleBack} className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Activity
                </button>
                <CardioTab key={editingLog ? editingLog.id : 'new'} isReady={isReady} userId={userId} showToast={showToast} selectedDate={selectedDate} onSelectDate={onSelectDate} cardioLogs={cardioLogs} initialData={editingLog} onSave={handleBack} />
            </div>
        );
    }

    if (subTab === 'menu') {
        return (
            <div className="animate-in fade-in">
                <button onClick={handleBack} className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Cancel
                </button>
                <div className="grid grid-cols-1 gap-6">
                    <button onClick={() => setSubTab('gym')} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl flex flex-col items-center gap-4 hover:bg-slate-800 transition-all hover:scale-[1.02] group">
                        <div className="text-6xl group-hover:scale-110 transition-transform">🏋️</div>
                        <div className="text-2xl font-black text-white">GYM WORKOUT</div>
                        <div className="text-slate-500 text-sm font-bold">Lift weights, track sets & reps</div>
                    </button>

                    <button onClick={() => setSubTab('cardio')} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl flex flex-col items-center gap-4 hover:bg-slate-800 transition-all hover:scale-[1.02] group">
                        <div className="text-6xl group-hover:scale-110 transition-transform">🏃</div>
                        <div className="text-2xl font-black text-white">CARDIO SESSION</div>
                        <div className="text-slate-500 text-sm font-bold">Run, cycle, swim, hike, classes</div>
                    </button>
                </div>
            </div>
        );
    }

    // Default: LIST View
    const isToday = selectedDate === getLocalISODate();
    const dateDisplay = isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="space-y-6 animate-in fade-in pb-24 relative min-h-[50vh]">
            <div className="flex items-center justify-between relative">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors">
                    {dateDisplay}
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onSelectDate(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </h2>
            </div>

            {!hasActivity && (
                <div className="text-center py-12 text-slate-500">
                    <div className="text-6xl mb-4 grayscale opacity-30">👟</div>
                    <p className="text-lg font-bold">No activity recorded.</p>
                    <p className="text-sm">Get moving and log your workout!</p>
                </div>
            )}

            <div className="space-y-4">
                {todaysGym.map(g => (
                    <div key={g.id} onClick={() => { setEditingLog(g); setSubTab('gym'); }} className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border-l-4 border-cyan-500 cursor-pointer hover:bg-slate-800 transition-all hover:scale-[1.01] group shadow-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-black text-lg text-white group-hover:text-cyan-400 transition-colors">{g.workoutName}</div>
                                <div className="text-sm text-slate-400 mt-1">{g.exercises.length} Exercises • {g.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} Sets</div>
                            </div>
                            <div className="bg-slate-950 p-2 rounded-lg text-2xl">🏋️</div>
                        </div>
                    </div>
                ))}

                {todaysCardio.map(c => {
                    const color = c.type === 'run' ? 'border-emerald-500' : c.type === 'cycle' ? 'border-amber-500' : 'border-blue-500';
                    const icon = c.type === 'run' ? '🏃' : c.type === 'cycle' ? '🚴' : '🏊';
                    return (
                        <div key={c.id} onClick={() => { setEditingLog(c); setSubTab('cardio'); }} className={`bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border-l-4 ${color} cursor-pointer hover:bg-slate-800 transition-all hover:scale-[1.01] group shadow-lg`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-black text-lg text-white capitalize group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                                        {c.type === 'class' ? c.className : c.type}
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1">{c.time} mins • {c.calories} cals</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-white">{c.distance > 0 ? c.distance : ''}<span className="text-sm text-slate-500 font-bold ml-1">{c.distance > 0 ? 'km' : ''}</span></div>
                                    <div className="text-2xl">{icon}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={() => setSubTab('menu')} className="fixed bottom-24 right-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light hover:scale-110 transition-transform z-50">
                ＋
            </button>
        </div>
    );
};

export default ActivityTab;
