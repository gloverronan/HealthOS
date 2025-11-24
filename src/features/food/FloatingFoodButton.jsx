import React, { useState } from 'react';
import SimpleFoodEntry from './SimpleFoodEntry';
import AIMealSuggestion from './AIMealSuggestion';

const FloatingFoodButton = ({
    onAddFood,
    todaysFoods,
    todaysTotals,
    goals,
    gymData,
    cardioData,
    geminiKey,
    selectedDate
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mode, setMode] = useState(null); // null, 'manual', or 'ai'

    const handleClose = () => {
        setMode(null);
        setIsExpanded(false);
    };

    const handleSelectMode = (selectedMode) => {
        setMode(selectedMode);
    };

    const handleAddFood = (foodData) => {
        onAddFood(foodData);
        handleClose();
    };

    return (
        <div className="fixed bottom-6 left-6 z-50">
            {isExpanded ? (
                mode ? (
                    // Show selected mode
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-900/50 animate-in slide-in-from-bottom-4 max-w-md">
                        {mode === 'manual' ? (
                            <div>
                                <div className="flex justify-between items-center p-5 pb-3">
                                    <h3 className="text-emerald-300 font-bold text-sm uppercase">Manual Entry</h3>
                                    <button onClick={handleClose} className="text-emerald-400 hover:text-emerald-200 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-5 pb-5">
                                    <SimpleFoodEntry
                                        geminiKey={geminiKey}
                                        onAddFood={handleAddFood}
                                    />
                                </div>
                            </div>
                        ) : (
                            <AIMealSuggestion
                                geminiKey={geminiKey}
                                todaysFoods={todaysFoods}
                                todaysTotals={todaysTotals}
                                goals={goals}
                                gymData={gymData}
                                cardioData={cardioData}
                                onAddFood={handleAddFood}
                                onClose={handleClose}
                            />
                        )}
                    </div>
                ) : (
                    // Show mode selection
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 shadow-2xl shadow-emerald-900/50 animate-in slide-in-from-bottom-4 w-64">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-emerald-300 font-bold text-sm uppercase">Add Food</h3>
                            <button onClick={handleClose} className="text-emerald-400 hover:text-emerald-200 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleSelectMode('manual')}
                                className="w-full flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors border border-emerald-500/20 hover:border-emerald-500/40"
                            >
                                <span className="text-2xl">📝</span>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-white">Manual Entry</div>
                                    <div className="text-xs text-slate-400">Enter food details</div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelectMode('ai')}
                                className="w-full flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-colors border border-emerald-500/20 hover:border-emerald-500/40"
                            >
                                <span className="text-2xl">✨</span>
                                <div className="text-left flex-1">
                                    <div className="font-bold text-white">AI Suggestion</div>
                                    <div className="text-xs text-slate-400">Get meal ideas</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )
            ) : (
                // Collapsed button
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-105 transition-transform animate-in zoom-in text-white"
                >
                    +
                </button>
            )}
        </div>
    );
};

export default FloatingFoodButton;
