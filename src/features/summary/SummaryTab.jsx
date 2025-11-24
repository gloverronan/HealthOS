import React, { useMemo } from 'react';
import Calendar from '../../components/ui/Calendar';
import ActivityRings from '../../components/ui/ActivityRings';
import NutrientLegend from '../food/NutrientLegend';
import DailyInsight from './DailyInsight';

const SummaryTab = ({ data, allFood, allGym, allCardio, selectedDate, onSelectDate, calendarView, onNavigate, onSubNavigate, onSetEditingLog, geminiKey }) => {
    const datesWithData = useMemo(() => {
        return [...new Set([...allFood.map(f => f.date), ...allGym.map(g => g.date), ...allCardio.map(c => c.date)])];
    }, [allFood, allGym, allCardio]);

    const dayData = useMemo(() => {
        const food = allFood.filter(f => f.date === selectedDate);
        const gym = allGym.filter(g => g.date === selectedDate);
        const cardio = allCardio.filter(c => c.date === selectedDate);

        const totals = food.reduce((acc, item) => ({
            cals: acc.cals + (item.cals || 0),
            prot: acc.prot + (item.prot || 0),
            carb: acc.carb + (item.carb || 0),
            fat: acc.fat + (item.fat || 0)
        }), { cals: 0, prot: 0, carb: 0, fat: 0 });

        return { food, gym, cardio, totals };
    }, [selectedDate, allFood, allGym, allCardio]);

    // Default goals if not provided
    const DEFAULT_GOALS = { calories: 2350, protein: 180, carbs: 250, fat: 80 };

    return (
        <>
            {/* Floating Daily Insight Bubble */}
            <DailyInsight data={{ ...dayData, goals: data.goals || DEFAULT_GOALS }} geminiKey={geminiKey} />

            <div className="space-y-6">
                {/* Top: Calendar */}
                <Calendar datesWithData={datesWithData} selectedDate={selectedDate} onSelect={onSelectDate} viewMode={calendarView} />

                {/* Middle: Food Stats & Activity Rings */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-3 border border-slate-700">
                    <h3 className="text-lg font-bold mb-2 text-slate-300">Food</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Left: Activity Rings */}
                        <div className="flex justify-center items-center">
                            <ActivityRings scale={0.5} showLegend={false} cals={dayData.totals.cals} prot={dayData.totals.prot} carb={dayData.totals.carb} fat={dayData.totals.fat} goals={data.goals || DEFAULT_GOALS} />
                        </div>

                        {/* Right: Nutrient Legend */}
                        <div className="flex items-center">
                            <NutrientLegend cals={dayData.totals.cals} prot={dayData.totals.prot} carb={dayData.totals.carb} fat={dayData.totals.fat} goals={data.goals || DEFAULT_GOALS} />
                        </div>
                    </div>
                </div>

                {/* Bottom: Activity List */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-700">
                    <h3 className="text-lg font-bold mb-3 text-slate-300">Activity</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {dayData.gym.length === 0 && dayData.cardio.length === 0 && <div className="col-span-2 text-slate-500 text-center py-8 text-sm">No activity.</div>}

                        {dayData.gym.map(g => (
                            <div key={g.id} onClick={() => { onNavigate('activity'); onSubNavigate('gym'); onSetEditingLog(g); }} className="bg-slate-900/50 p-3 rounded-xl border-l-4 border-cyan-500 cursor-pointer hover:bg-slate-800 transition-colors">
                                <div className="font-bold text-white">{g.workoutName}</div>
                                <div className="text-xs text-slate-400">{g.exercises.length} Exercises</div>
                            </div>
                        ))}
                        {dayData.cardio.map(c => {
                            const color = c.type === 'run' ? 'border-emerald-500' : c.type === 'cycle' ? 'border-amber-500' : 'border-blue-500';
                            const icon = c.type === 'run' ? '🏃' : c.type === 'cycle' ? '🚴' : '🏊';
                            return (
                                <div key={c.id} onClick={() => { onNavigate('activity'); onSubNavigate('cardio'); onSetEditingLog(c); }} className={`bg-slate-900/50 p-3 rounded-xl border-l-4 ${color} cursor-pointer hover:bg-slate-800 transition-colors`}>
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-white capitalize flex items-center gap-1">
                                            {icon} {c.type === 'class' ? c.className : c.type}
                                        </div>
                                        <div className="text-xs font-bold text-white">{c.calories} cal</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SummaryTab;
