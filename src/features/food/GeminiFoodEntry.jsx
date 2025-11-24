import React, { useState, useEffect } from 'react';
import { generateGeminiContent } from '../../services/gemini';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GeminiFoodEntry = ({ isReady, userId, showToast, isConfigLoaded, selectedDate, geminiKey }) => {
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

    // Check key readiness
    const isAiReady = isConfigLoaded && geminiKey;

    const analyze = async () => {
        if (!input.trim()) return;
        if (!geminiKey) return showToast('AI Key Missing.', 'error');
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
            showToast('AI failed. Check key/input.', 'error');
            console.error("Gemini Failure:", e);
        }
        setLoading(false);
    };

    const handleQuantityChange = (val) => {
        const q = parseFloat(val);
        setQuantity(val); // Allow string for typing
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

    const add = async () => {
        if (!result || !isReady || !userId) return showToast('Database not ready.', 'error');

        try {
            await addDoc(collection(db, 'users', userId, 'food_logs'), {
                date: selectedDate,
                timestamp: serverTimestamp(),
                name: result.name,
                cals: Number(result.cals) || 0,
                prot: Number(result.prot) || 0,
                carb: Number(result.carb) || 0,
                fat: Number(result.fat) || 0,
                quantity: Number(quantity) || 1,
                time: entryTime,
                category: category
            });
            setInput('');
            setResult(null);
            setBaseResult(null);
            setQuantity(1);
            showToast('Food logged!', 'success');
        } catch (e) {
            showToast('Logging failed. Database error.', 'error');
            console.error("Firestore Error:", e);
        }
    };

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-slate-700">
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex-1 flex flex-col gap-2">
                    <input className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-5 py-4 text-lg placeholder-slate-500 focus:border-emerald-500 transition"
                        placeholder={isConfigLoaded ? "What did you eat?" : "Loading config..."}
                        value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                        disabled={!isConfigLoaded} />
                    <div className="flex gap-2">
                        <input type="time" className="bg-slate-950/70 border border-slate-700 rounded-xl px-4 py-2 text-slate-300 outline-none focus:border-emerald-500"
                            value={entryTime} onChange={e => setEntryTime(e.target.value)} />
                        <select className="flex-1 bg-slate-950/70 border border-slate-700 rounded-xl px-4 py-2 text-slate-300 outline-none focus:border-emerald-500 appearance-none"
                            value={category} onChange={e => setCategory(e.target.value)}>
                            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={analyze} disabled={loading || !isAiReady} className="w-full bg-emerald-600 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-emerald-500 transition-colors">
                    {loading ? 'Thinking...' : (!isAiReady ? 'Wait...' : 'Generate Macros')}
                </button>
            </div>
            {result && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex gap-4">
                        <input className="flex-[2] bg-transparent text-xl font-bold outline-none border-b border-slate-600" value={result.name} onChange={e => setResult({ ...result, name: e.target.value })} />
                        <div className="flex items-center gap-2 border-b border-slate-600 px-2">
                            <span className="text-slate-500 text-sm font-bold">Qty:</span>
                            <div className="flex flex-col">
                                <button onClick={() => handleQuantityChange(parseFloat(quantity) + 0.5)} className="text-xs hover:text-white text-slate-400">▲</button>
                                <input type="number" className="w-12 bg-transparent text-lg font-bold outline-none text-center appearance-none"
                                    value={quantity} onChange={e => handleQuantityChange(e.target.value)} />
                                <button onClick={() => handleQuantityChange(Math.max(0.5, parseFloat(quantity) - 0.5))} className="text-xs hover:text-white text-slate-400">▼</button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        {['cals', 'prot', 'carb', 'fat'].map(k => (
                            <div key={k} className="relative">
                                <input type="number" className="w-full bg-slate-950/70 rounded-lg p-3 text-center text-xl font-bold"
                                    value={result[k]} onChange={e => setResult({ ...result, [k]: e.target.value })} />
                                <div className="text-[10px] text-slate-500 text-center uppercase mt-1 font-bold">{k}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={add} className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-lg">Add to Today</button>
                </div>
            )}
        </div>
    );
};

export default GeminiFoodEntry;
