import React, { useState, useEffect } from 'react';
import { generateGeminiContent } from '../../services/gemini';

const SimpleFoodEntry = ({ geminiKey, onAddFood }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [baseResult, setBaseResult] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [entryTime, setEntryTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    const [category, setCategory] = useState('Snack');

    const getCategory = (time) => {
        const hour = parseInt(time.split(':')[0]);
        if (hour >= 5 && hour < 11) return 'Breakfast';
        if (hour >= 11 && hour < 15) return 'Lunch';
        if (hour >= 15 && hour < 22) return 'Dinner';
        return 'Snack';
    };

    useEffect(() => {
        setCategory(getCategory(entryTime));
    }, [entryTime]);

    const analyze = async () => {
        if (!input.trim()) return;
        if (!geminiKey) {
            alert('AI Key Missing');
            return;
        }
        setLoading(true);
        try {
            const prompt = `Return ONLY valid JSON (no markdown): {"name":"string","cals":number,"prot":number,"carb":number,"fat":number}. Food: ${input}`;
            const responseText = await generateGeminiContent(geminiKey, prompt);

            const jsonString = responseText.trim().replace(/```json|```/g, '');
            const json = JSON.parse(jsonString);
            setResult(json);
            setBaseResult(json);
            setQuantity(1);

        } catch (e) {
            alert('AI failed. Check key/input.');
            console.error("Gemini Failure:", e);
        }
        setLoading(false);
    };

    const handleQuantityChange = (val) => {
        const q = parseFloat(val);
        setQuantity(val);
        if (!isNaN(q) && baseResult) {
            setResult({
                ...result,
                cals: Math.round(baseResult.cals * q),
                prot: Math.round(baseResult.prot * q),
                carb: Math.round(baseResult.carb * q),
                fat: Math.round(baseResult.fat * q)
            });
        }
    };

    const handleAdd = () => {
        if (!result) return;

        onAddFood({
            name: result.name,
            quantity: Number(quantity) || 1,
            cals: Number(result.cals) || 0,
            prot: Number(result.prot) || 0,
            carb: Number(result.carb) || 0,
            fat: Number(result.fat) || 0,
            time: entryTime,
            category: category
        });

        // Reset form
        setInput('');
        setResult(null);
        setBaseResult(null);
        setQuantity(1);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && analyze()}
                    placeholder="e.g., '2 eggs and toast'"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
            </div>

            <button
                onClick={analyze}
                disabled={loading || !input.trim()}
                className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white disabled:opacity-50 hover:bg-emerald-500 transition-colors"
            >
                {loading ? 'Analyzing...' : 'Generate Macros'}
            </button>

            {result && (
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3 animate-in fade-in">
                    <div>
                        <div className="text-xs font-bold text-slate-400 mb-1">FOOD</div>
                        <div className="text-lg font-bold text-white">{result.name}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="text-xs font-bold text-slate-400 mb-1">TIME</div>
                            <input
                                type="time"
                                value={entryTime}
                                onChange={e => setEntryTime(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-400 mb-1">CATEGORY</div>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                            >
                                <option>Breakfast</option>
                                <option>Lunch</option>
                                <option>Dinner</option>
                                <option>Snack</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-slate-400 mb-1">QUANTITY</div>
                        <input
                            type="number"
                            step="0.1"
                            value={quantity}
                            onChange={e => handleQuantityChange(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-emerald-400">{result.cals}</div>
                            <div className="text-xs text-slate-400">cal</div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-blue-400">{result.prot}</div>
                            <div className="text-xs text-slate-400">prot</div>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-amber-400">{result.carb}</div>
                            <div className="text-xs text-slate-400">carb</div>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-rose-400">{result.fat}</div>
                            <div className="text-xs text-slate-400">fat</div>
                        </div>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-500 transition-colors"
                    >
                        Add to Log
                    </button>
                </div>
            )}
        </div>
    );
};

export default SimpleFoodEntry;
