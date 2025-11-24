import React, { useState } from 'react';
import { generateGeminiContent } from '../../services/gemini';

const AIMealSuggestion = ({
    geminiKey,
    todaysFoods,
    todaysTotals,
    goals,
    gymData,
    cardioData,
    onAddFood,
    onClose
}) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [keywords, setKeywords] = useState('');
    const [showInput, setShowInput] = useState(true);

    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour < 11) return 'breakfast';
        if (hour < 15) return 'lunch';
        if (hour < 20) return 'dinner';
        return 'snack';
    };

    const generateSuggestions = async () => {
        if (!geminiKey) {
            alert('Gemini API key is required');
            return;
        }

        setLoading(true);
        setSuggestions([]);
        setSelectedSuggestion(null);
        setShowInput(false);

        try {
            const timeOfDay = getTimeOfDay();
            const remaining = {
                calories: goals.calories - todaysTotals.cals,
                protein: goals.protein - todaysTotals.prot,
                carbs: goals.carbs - todaysTotals.carb,
                fat: (goals.fat || 80) - todaysTotals.fat
            };

            // Get recent food names for variety
            const recentFoods = todaysFoods.slice(-10).map(f => f.name).join(', ') || 'none yet';

            const prompt = `You are a nutrition coach helping someone plan their next meal.

CONTEXT:
- Time: ${new Date().toLocaleTimeString()} (${timeOfDay})
- Consumed today: ${todaysTotals.cals} cal, ${todaysTotals.prot}g protein, ${todaysTotals.carb}g carbs, ${todaysTotals.fat}g fat
- Remaining macros: ${remaining.calories} cal, ${remaining.protein}g protein, ${remaining.carbs}g carbs, ${remaining.fat}g fat
- Today's activity: ${gymData.length > 0 ? gymData.map(g => g.workoutName).join(', ') : 'No gym'}, ${cardioData.length > 0 ? cardioData.map(c => `${c.type} (${c.calories}cal)`).join(', ') : 'No cardio'}
- Recent foods today: ${recentFoods}
- User Preferences/Keywords: ${keywords || 'None provided'}

REQUIREMENTS:
1. Suggest 3 DISTINCT realistic meal/recipe options
2. Use common ingredients likely in a typical pantry/fridge
3. Appropriate for ${timeOfDay}
4. Fits within remaining macros (especially protein if they worked out)
5. Provide variety from what they've eaten
6. Keep it simple and practical
7. IMPORTANT: If keywords are provided, prioritize meals that include them.

RESPONSE FORMAT:
Return ONLY a valid JSON array of objects (no markdown formatting). Each object must have:
- "meal": string (Meal Name)
- "description": string (One sentence description)
- "ingredients": string (List of ingredients)
- "instructions": string (Brief cooking instructions)
- "macros": object { "calories": number, "protein": number, "carbs": number, "fat": number }

Example:
[
  { "meal": "...", "description": "...", "ingredients": "...", "instructions": "...", "macros": { ... } },
  ...
]`;

            const response = await generateGeminiContent(geminiKey, prompt);

            // Parse the response
            const jsonString = response.replace(/```json|```/g, '').trim();
            const parsedSuggestions = JSON.parse(jsonString);

            if (Array.isArray(parsedSuggestions)) {
                setSuggestions(parsedSuggestions);
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('AI suggestion error:', error);
            alert('Failed to generate suggestions. Please try again.');
            setShowInput(true); // Go back to input on error
        }
        setLoading(false);
    };

    const handleAddToLog = () => {
        if (selectedSuggestion) {
            onAddFood({
                name: selectedSuggestion.meal,
                quantity: 1,
                cals: selectedSuggestion.macros.calories,
                prot: selectedSuggestion.macros.protein,
                carb: selectedSuggestion.macros.carbs,
                fat: selectedSuggestion.macros.fat
            });
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-emerald-300 font-bold text-sm uppercase">
                    {selectedSuggestion ? 'Meal Details' : 'AI Meal Suggestions'}
                </h3>
                <button onClick={onClose} className="text-emerald-400 hover:text-emerald-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {showInput && !loading && !selectedSuggestion && suggestions.length === 0 ? (
                // Input View
                <div className="space-y-4 animate-in fade-in">
                    <p className="text-sm text-slate-300">
                        Let AI suggest a meal based on your goals and what you have.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Keywords (Optional)</label>
                        <input
                            type="text"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder="e.g., chicken, pasta, quick"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 placeholder:text-slate-600"
                            onKeyDown={(e) => e.key === 'Enter' && generateSuggestions()}
                        />
                    </div>
                    <button
                        onClick={generateSuggestions}
                        className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        Generate Ideas
                    </button>
                </div>
            ) : loading ? (
                <div className="space-y-3 py-8">
                    <div className="h-4 w-3/4 bg-emerald-500/20 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-emerald-500/20 rounded animate-pulse"></div>
                    <div className="h-4 w-2/3 bg-emerald-500/20 rounded animate-pulse"></div>
                    <p className="text-emerald-400 text-sm text-center mt-4">
                        {keywords ? `Creating meals with "${keywords}"...` : 'Generating personalized suggestions...'}
                    </p>
                </div>
            ) : selectedSuggestion ? (
                // Detail View
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <button
                        onClick={() => setSelectedSuggestion(null)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2"
                    >
                        ← Back to options
                    </button>

                    <div>
                        <h4 className="text-xl font-bold text-white mb-2">{selectedSuggestion.meal}</h4>
                        <div className="flex gap-2 flex-wrap mb-3">
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">{selectedSuggestion.macros.calories} cal</span>
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">{selectedSuggestion.macros.protein}g protein</span>
                            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">{selectedSuggestion.macros.carbs}g carbs</span>
                            <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-1 rounded">{selectedSuggestion.macros.fat}g fat</span>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-emerald-400 uppercase mb-1">Ingredients</div>
                        <p className="text-sm text-slate-300">{selectedSuggestion.ingredients}</p>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-emerald-400 uppercase mb-1">Instructions</div>
                        <p className="text-sm text-slate-300">{selectedSuggestion.instructions}</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleAddToLog}
                            className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-500 transition-colors"
                        >
                            Add to Log
                        </button>
                    </div>
                </div>
            ) : (
                // List View
                <div className="space-y-3 animate-in fade-in">
                    {suggestions.length > 0 ? (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-slate-400">Select a meal to see recipe:</p>
                                <button
                                    onClick={() => {
                                        setSuggestions([]);
                                        setShowInput(true);
                                    }}
                                    className="text-xs text-emerald-400 hover:text-emerald-300"
                                >
                                    New Search
                                </button>
                            </div>
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedSuggestion(s)}
                                    className="w-full text-left bg-slate-800/50 hover:bg-slate-700/50 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-3 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-white group-hover:text-emerald-300 transition-colors">{s.meal}</h4>
                                        <span className="text-xs font-bold text-emerald-400">{s.macros.calories} cal</span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{s.description}</p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded">{s.macros.protein}p</span>
                                        <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">{s.macros.carbs}c</span>
                                        <span className="text-[10px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded">{s.macros.fat}f</span>
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={generateSuggestions}
                                className="w-full py-2 mt-2 bg-slate-800 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                            >
                                ↻ Regenerate Options
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <p>Failed to generate suggestions.</p>
                            <button
                                onClick={() => setShowInput(true)}
                                className="mt-4 px-4 py-2 bg-emerald-600 rounded-lg font-bold text-white"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIMealSuggestion;
