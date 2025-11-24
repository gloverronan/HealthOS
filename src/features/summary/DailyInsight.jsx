import React, { useState, useEffect } from 'react';
import { generateGeminiContent } from '../../services/gemini';

const DailyInsight = ({ data, geminiKey }) => {
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(() => {
        // Check if user has seen it before
        const hasSeenBefore = localStorage.getItem('dailyInsightSeen');
        return !hasSeenBefore; // Expand on first visit
    });

    // Generate a simple hash of the data to detect changes
    const getDataHash = (d) => {
        return JSON.stringify({
            goals: d.goals,
            totals: d.totals,
            gymCount: d.gym.length,
            cardioCount: d.cardio.length,
            gymLast: d.gym[0]?.id, // Check ID of most recent workout
            cardioLast: d.cardio[0]?.id
        });
    };

    const generateInsight = async () => {
        if (!geminiKey || !data) return;

        // Don't generate if no data at all
        const hasData = data.food.length > 0 || data.gym.length > 0 || data.cardio.length > 0;
        if (!hasData) return;

        setLoading(true);
        try {
            const prompt = `
                You are a fitness coach. Analyze this day's data and give a 2-sentence summary/encouragement.
                Time: ${new Date().toLocaleTimeString()}
                
                Goals: ${JSON.stringify(data.goals)}
                Consumed: ${JSON.stringify(data.totals)}
                
                Workouts: ${data.gym.map(g => g.workoutName).join(', ')}
                Cardio: ${data.cardio.map(c => `${c.type} (${c.calories} cal)`).join(', ')}
                
                Keep it brief, motivating, and specific to the data. No markdown.
            `;

            const text = await generateGeminiContent(geminiKey, prompt);
            setInsight(text);

            // Save to localStorage with timestamp and data hash
            const cacheData = {
                text,
                timestamp: Date.now(),
                dataHash: getDataHash(data)
            };
            localStorage.setItem('dailyInsight_v2', JSON.stringify(cacheData));

        } catch (e) {
            console.error("Insight error:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        const savedRaw = localStorage.getItem('dailyInsight_v2');
        let shouldGenerate = false;

        if (savedRaw) {
            try {
                const saved = JSON.parse(savedRaw);
                setInsight(saved.text);

                // Check 1: Time (3 hours = 3 * 60 * 60 * 1000 ms)
                const isOld = (Date.now() - saved.timestamp) > (3 * 60 * 60 * 1000);

                // Check 2: Data changed
                const currentHash = getDataHash(data);
                const isDataChanged = saved.dataHash !== currentHash;

                if (isOld || isDataChanged) {
                    shouldGenerate = true;
                }
            } catch (e) {
                shouldGenerate = true;
            }
        } else {
            shouldGenerate = true;
        }

        if (shouldGenerate && !loading) {
            // Debounce slightly to avoid double-firing on mount
            const timer = setTimeout(() => {
                generateInsight();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [data, geminiKey]);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
        // Mark as seen
        if (!localStorage.getItem('dailyInsightSeen')) {
            localStorage.setItem('dailyInsightSeen', 'true');
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-50">
            {isExpanded ? (
                // Expanded view
                <div className="bg-gradient-to-r from-indigo-900/95 to-purple-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 shadow-2xl shadow-indigo-900/50 animate-in slide-in-from-bottom-4 max-w-xs">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">✨</div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-indigo-300 font-bold text-xs uppercase">Daily Insight</h3>
                                <button onClick={toggleExpanded} className="text-indigo-400 hover:text-indigo-200 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {loading ? (
                                <div className="space-y-2">
                                    <div className="h-3 w-full bg-indigo-500/20 rounded animate-pulse"></div>
                                    <div className="h-3 w-3/4 bg-indigo-500/20 rounded animate-pulse"></div>
                                </div>
                            ) : (
                                insight ? (
                                    <p className="text-indigo-100 text-sm leading-relaxed italic">"{insight}"</p>
                                ) : (
                                    <p className="text-indigo-400/50 text-xs italic">Loading insight...</p>
                                )
                            )}
                            <button
                                onClick={generateInsight}
                                disabled={loading}
                                className="mt-3 text-xs bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 px-3 py-1.5 rounded-lg transition-colors w-full disabled:opacity-50"
                            >
                                {loading ? 'Thinking...' : (insight ? 'Refresh' : 'Generate')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Collapsed bubble
                <button
                    onClick={toggleExpanded}
                    className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-105 transition-transform animate-in zoom-in"
                >
                    ✨
                </button>
            )}
        </div>
    );
};

export default DailyInsight;
