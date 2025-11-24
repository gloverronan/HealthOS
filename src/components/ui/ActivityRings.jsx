import React from 'react';
import NutrientLegend from '../../features/food/NutrientLegend';

const Ring = ({ r, progress, color }) => {
    const circum = 2 * Math.PI * r;
    const dash = (progress / 100) * circum;
    return <circle cx="128" cy="128" r={r} stroke={color} strokeWidth="14" fill="none" strokeDasharray={circum} strokeDashoffset={circum - dash} strokeLinecap="round" transform="rotate(-90 128 128)" className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />;
};

const ActivityRings = ({ cals, prot, carb, fat, goals, scale = 1 }) => {
    const pct = (v, g) => Math.min(100, (v / g) * 100);

    return (
        <div className="flex flex-col items-center mb-8" style={{ transform: `scale(${scale})` }}>
            <div className="relative w-64 h-64">
                <svg viewBox="0 0 256 256">
                    {/* Background Rings */}
                    <circle cx="128" cy="128" r="110" stroke="#1e293b" strokeWidth="14" fill="none" opacity="0.3" />
                    <circle cx="128" cy="128" r="90" stroke="#1e293b" strokeWidth="14" fill="none" opacity="0.3" />
                    <circle cx="128" cy="128" r="70" stroke="#1e293b" strokeWidth="14" fill="none" opacity="0.3" />
                    <circle cx="128" cy="128" r="50" stroke="#1e293b" strokeWidth="14" fill="none" opacity="0.3" />

                    {/* Progress Rings */}
                    <Ring r={110} progress={pct(cals, goals.calories)} color="#10b981" />
                    <Ring r={90} progress={pct(prot, goals.protein)} color="#3b82f6" />
                    <Ring r={70} progress={pct(carb, goals.carbs)} color="#f59e0b" />
                    <Ring r={50} progress={pct(fat, goals.fat || 80)} color="#f43f5e" />
                </svg>
            </div>

            {/* Legend */}
            <NutrientLegend cals={cals} prot={prot} carb={carb} fat={fat} goals={goals} />
        </div>
    );
};

export default ActivityRings;
