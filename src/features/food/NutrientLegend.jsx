import React from 'react';

const NutrientLegend = ({ cals, prot, carb, fat, goals }) => {
    const pct = (v, g) => Math.min(100, Math.round((v / g) * 100));

    return (
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mx-auto">
            <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Calories</div>
                <div className="text-3xl font-black text-emerald-400">{cals}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{cals} / {goals.calories} ({pct(cals, goals.calories)}%)</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-blue-500/20">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Protein</div>
                <div className="text-3xl font-black text-blue-400">{prot}g</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{prot} / {goals.protein}g ({pct(prot, goals.protein)}%)</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Carbs</div>
                <div className="text-3xl font-black text-amber-400">{carb}g</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{carb} / {goals.carbs}g ({pct(carb, goals.carbs)}%)</div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-500/20">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Fat</div>
                <div className="text-3xl font-black text-rose-400">{fat}g</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{fat} / {goals.fat || 80}g ({pct(fat, goals.fat || 80)}%)</div>
            </div>
        </div>
    );
};

export default NutrientLegend;
