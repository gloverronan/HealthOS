import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider } from './services/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getLocalISODate } from './utils/dateUtils';
import { loadItem, saveItem, loadKey, saveKey } from './utils/storageUtils';

// Components
import AuthModal from './features/auth/AuthModal';
import SettingsModal from './features/settings/SettingsModal';
import FloatingMenu from './components/layout/FloatingMenu';
import SummaryTab from './features/summary/SummaryTab';
import FoodTab from './features/food/FoodTab';
import ActivityTab from './features/activity/ActivityTab';

const DEFAULT_GOALS = { calories: 2350, protein: 180, carbs: 250, fat: 80 };

const DEFAULT_WORKOUTS = [
    {
        id: "push",
        name: "Push",
        color: "#ec4899",
        emoji: "😤",
        exercises: [
            { name: "Bench Press", bodyweight: false },
            { name: "Overhead Press", bodyweight: false },
            { name: "Incline Dumbbell Press", bodyweight: false },
            { name: "Lateral Raises", bodyweight: false },
            { name: "Tricep Pushdowns", bodyweight: false },
            { name: "Skullcrushers", bodyweight: false }
        ]
    },
    {
        id: "legs",
        name: "Legs",
        color: "#3b82f6",
        emoji: "🍗",
        exercises: [
            { name: "Squat", bodyweight: false },
            { name: "Romanian Deadlift", bodyweight: false },
            { name: "Leg Press", bodyweight: false },
            { name: "Leg Extensions", bodyweight: false },
            { name: "Hamstring Curls", bodyweight: false },
            { name: "Calf Raises", bodyweight: false }
        ]
    },
    {
        id: "pull",
        name: "Pull",
        color: "#10b981",
        emoji: "🦍",
        exercises: [
            { name: "Pull-ups", bodyweight: true },
            { name: "Barbell Row", bodyweight: false },
            { name: "Lat Pulldowns", bodyweight: false },
            { name: "Face Pulls", bodyweight: false },
            { name: "Bicep Curls", bodyweight: false },
            { name: "Hammer Curls", bodyweight: false }
        ]
    }
];

const App = () => {
    const [tab, setTab] = useState('summary');
    const [activitySubTab, setActivitySubTab] = useState('list');
    const [selectedDate, setSelectedDate] = useState(getLocalISODate());
    const [calendarView, setCalendarView] = useState('week');
    const [foodLog, setFoodLog] = useState([]);
    const [gymLog, setGymLog] = useState([]);
    const [cardioLog, setCardioLog] = useState([]);
    const [workouts, setWorkouts] = useState(() => {
        const loaded = loadItem('hos_workouts', DEFAULT_WORKOUTS);
        // Merge with defaults to ensure new fields (emojis) are present
        return loaded.map(w => {
            const def = DEFAULT_WORKOUTS.find(d => d.id === w.id);
            if (def) {
                return {
                    ...def, // Base on new default (has emoji)
                    ...w,   // Overlay saved data (has old exercises)
                    emoji: w.emoji || def.emoji, // Ensure emoji exists
                    exercises: w.exercises.map(ex => typeof ex === 'string' ? { name: ex, bodyweight: false } : ex)
                };
            }
            // Custom workout
            return {
                ...w,
                exercises: w.exercises.map(ex => typeof ex === 'string' ? { name: ex, bodyweight: false } : ex)
            };
        });
    });
    const [exerciseSettings, setExerciseSettings] = useState({});
    const [editingLog, setEditingLog] = useState(null);
    const [stats, setStats] = useState({});
    const [toast, setToast] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    // Persistence States
    const [isDbInitialized, setIsDbInitialized] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [connectionFailed, setConnectionFailed] = useState(false);
    const [cloudConfig, setCloudConfig] = useState(null);
    const [goals, setGoals] = useState(DEFAULT_GOALS);
    const [geminiKey, setGeminiKey] = useState('');

    const isReady = isDbInitialized && userId;

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // --- CLOUD CONFIGURATION MANAGEMENT ---
    const loadSharedConfig = async () => {
        try {
            const docRef = doc(db, 'app_config', 'shared_keys');
            const docSnap = await getDoc(docRef);
            let data = {};
            if (docSnap.exists()) {
                data = docSnap.data();
            }
            setCloudConfig(data);
            setGeminiKey(data.geminiKey || '');
        } catch (e) {
            console.error("Error loading shared config:", e);
            showToast('Could not load shared app settings.', 'error');
        }
    };

    const loadUserSettings = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid, 'settings', 'profile');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.goals) setGoals({ ...DEFAULT_GOALS, ...data.goals });
            }

            // Load Workouts
            const workoutsDocRef = doc(db, 'users', uid, 'settings', 'workouts');
            const workoutsDocSnap = await getDoc(workoutsDocRef);
            if (workoutsDocSnap.exists()) {
                setWorkouts(workoutsDocSnap.data().list);
            }

            // Load Stats
            const statsDocRef = doc(db, 'users', uid, 'stats', 'exercises');
            const statsDocSnap = await getDoc(statsDocRef);
            if (statsDocSnap.exists()) {
                setStats(statsDocSnap.data());
            }

            // Load Exercise Settings
            const exSettingsDocRef = doc(db, 'users', uid, 'settings', 'exercises');
            const exSettingsDocSnap = await getDoc(exSettingsDocRef);
            if (exSettingsDocSnap.exists()) {
                setExerciseSettings(exSettingsDocSnap.data());
            }
        } catch (e) {
            console.error("Error loading user settings:", e);
        }
    };

    const saveSharedConfig = async (newKey) => {
        if (!auth.currentUser) return;
        try {
            const configToSave = {
                ...(cloudConfig || {}),
                geminiKey: newKey,
                updatedBy: auth.currentUser.email || auth.currentUser.uid,
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, 'app_config', 'shared_keys'), configToSave, { merge: true });
            await loadSharedConfig();
            showToast('Cloud settings updated!', 'success');
        } catch (e) {
            showToast('Failed to save shared settings. Check Security Rules.', 'error');
            console.error("Firestore Error:", e);
        }
    };

    // --- FIREBASE INITIALIZATION ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setIsLoggedIn(true);
                setIsDbInitialized(true);
                setConnectionFailed(false);

                const statusEl = document.getElementById('loader-status');
                if (statusEl) statusEl.innerText = 'LOGGED IN';

                loadSharedConfig();
                loadUserSettings(user.uid);
            } else {
                setUserId(null);
                setIsLoggedIn(false);
                setIsDbInitialized(true);

                const statusEl = document.getElementById('loader-status');
                if (statusEl) statusEl.innerText = 'AWAITING LOGIN';
            }
        });

        return () => unsubscribe();
    }, []);

    // --- FIREBASE DATA LISTENERS ---
    useEffect(() => {
        if (!isReady) return;

        const unsubFood = onSnapshot(collection(db, 'users', userId, 'food_logs'), (snapshot) => {
            setFoodLog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.timestamp?.seconds || b.id) - (a.timestamp?.seconds || a.id)));
        }, (error) => {
            showToast('Food data sync failed. Check Security Rules.', 'error');
        });

        const unsubGym = onSnapshot(collection(db, 'users', userId, 'gym_logs'), (snapshot) => {
            setGymLog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.timestamp?.seconds || b.id) - (a.timestamp?.seconds || a.id)));
        });

        const unsubCardio = onSnapshot(collection(db, 'users', userId, 'cardio_logs'), (snapshot) => {
            setCardioLog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.timestamp?.seconds || b.id) - (a.timestamp?.seconds || a.id)));
        });

        return () => { unsubFood(); unsubGym(); unsubCardio(); };
    }, [isReady, userId]);

    // --- LOADER HIDE LOGIC ---
    useEffect(() => {
        let loaderTimer;

        const hideLoader = (statusText) => {
            const loader = document.getElementById('loader');
            const root = document.getElementById('root');
            if (loader && root) {
                const statusElement = document.getElementById('loader-status');
                if (statusElement) statusElement.innerText = statusText;

                loader.style.opacity = '0';
                // root.style.opacity = '1'; // Removed as root is not hidden by default in new structure
                setTimeout(() => loader.remove(), 700);
            }
        };

        if (isReady || connectionFailed) {
            clearTimeout(loaderTimer);
            hideLoader(isReady ? 'READY' : 'ERROR');
        } else {
            loaderTimer = setTimeout(() => {
                // If still not ready after 5s, maybe just show what we have or error
                // setConnectionFailed(true); // Don't force fail, just wait
            }, 5000);
        }

        return () => clearTimeout(loaderTimer);
    }, [isReady, connectionFailed]);

    const activeDayData = useMemo(() => {
        const food = foodLog.filter(f => f.date === selectedDate);
        const gym = gymLog.filter(g => g.date === selectedDate);
        const cardio = cardioLog.filter(c => c.date === selectedDate);

        const totals = food.reduce((a, b) => ({
            cals: a.cals + (b.cals || 0),
            prot: a.prot + (b.prot || 0),
            carb: a.carb + (b.carb || 0),
            fat: a.fat + (b.fat || 0)
        }), { cals: 0, prot: 0, carb: 0, fat: 0 });

        return { food, gym, cardio, totals, goals };
    }, [foodLog, gymLog, cardioLog, selectedDate, goals]);

    const handleSettingsSave = (newKey, msg, type) => {
        setGeminiKey(newKey);
        saveKey('hos_gemini_key', newKey);

        if (auth.currentUser) {
            saveSharedConfig(newKey);
        }

        setShowSettings(false);
        showToast(msg, type);
    };

    const handleLogout = async () => {
        await signOut(auth);
        setUserId(null);
        showToast('Logged out.', 'success');
    };

    const isAppUsable = isReady;
    const isConfigLoaded = cloudConfig !== null;

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32 px-6 pt-8">
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full z-50 font-bold shadow-2xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {toast.msg}
                </div>
            )}

            {connectionFailed && (
                <div className="bg-red-900/50 border border-red-500/50 p-3 rounded-xl mb-6 text-center text-sm text-red-300 font-bold">
                    DATABASE CONNECTION FAILED. Please check settings (gear icon).
                </div>
            )}

            {isDbInitialized && !isLoggedIn && (
                <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
                    <AuthModal showToast={showToast} />
                </div>
            )}

            <SettingsModal
                isVisible={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={handleSettingsSave}
                currentKey={geminiKey}
                goals={goals}
                setGoals={setGoals}
                calendarView={calendarView}
                setCalendarView={setCalendarView}
            />

            <div className={!isAppUsable ? 'opacity-20 pointer-events-none' : ''}>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-5xl font-black">{tab === 'food' ? 'FOOD' : tab === 'activity' ? 'ACTIVITY' : 'SUMMARY'}</h1>

                    <div className="flex items-center space-x-3">
                        {isLoggedIn && (
                            <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full text-red-400 hover:bg-slate-700 text-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        )}
                        <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>
                </div>

                <div className="pb-24">
                    {tab === 'summary' && <SummaryTab
                        data={activeDayData}
                        allFood={foodLog}
                        allGym={gymLog}
                        allCardio={cardioLog}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        calendarView={calendarView}
                        onNavigate={setTab}
                        onSubNavigate={setActivitySubTab}
                        onSetEditingLog={setEditingLog}
                    />}

                    {tab === 'food' && <FoodTab
                        data={activeDayData}
                        isReady={isReady}
                        userId={userId}
                        showToast={showToast}
                        isConfigLoaded={isConfigLoaded}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        geminiKey={geminiKey}
                    />}

                    {tab === 'activity' && <ActivityTab
                        workouts={workouts}
                        setWorkouts={setWorkouts}
                        isReady={isReady}
                        userId={userId}
                        showToast={showToast}
                        stats={stats}
                        setStats={setStats}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        subTab={activitySubTab}
                        setSubTab={setActivitySubTab}
                        cardioLogs={cardioLog}
                        gymLogs={gymLog}
                        editingLog={editingLog}
                        setEditingLog={setEditingLog}
                        exerciseSettings={exerciseSettings}
                        setExerciseSettings={setExerciseSettings}
                    />}
                </div>

                <FloatingMenu tab={tab} setTab={setTab} />
            </div>
        </div>
    );
};

export default App;
