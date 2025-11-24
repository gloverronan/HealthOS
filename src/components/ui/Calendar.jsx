import React, { useState, useEffect } from 'react';
import { getLocalISODate } from '../../utils/dateUtils';

const Calendar = ({ datesWithData, selectedDate, onSelect, viewMode = 'week' }) => {
    const [viewDate, setViewDate] = useState(new Date());

    // Reset viewDate to selectedDate when selectedDate changes to ensure visibility
    useEffect(() => {
        setViewDate(new Date(selectedDate));
    }, [selectedDate]);

    const getDays = () => {
        if (viewMode === 'month') {
            const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
            const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const empties = Array.from({ length: firstDay }, (_, i) => i);
            return { days, empties, label: viewDate.toLocaleDateString('en', { month: 'long', year: 'numeric' }) };
        } else {
            // Week View
            const current = new Date(viewDate);
            const day = current.getDay();
            const diff = current.getDate() - day; // Adjust when day is Sunday
            const startOfWeek = new Date(current.setDate(diff));
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                days.push(d);
            }
            // Label: "Nov 1 - Nov 7"
            const endOfWeek = days[6];
            const label = `${days[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
            return { days, empties: [], label, isWeek: true };
        }
    };

    const { days, empties, label, isWeek } = getDays();

    const changeView = (delta) => {
        if (viewMode === 'month') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
        } else {
            const newDate = new Date(viewDate);
            newDate.setDate(viewDate.getDate() + (delta * 7));
            setViewDate(newDate);
        }
    };

    const isToday = (d) => {
        const today = new Date();
        const target = isWeek ? d : new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
        return target.getDate() === today.getDate() && target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear();
    };

    const isSelected = (d) => {
        const sel = new Date(selectedDate);
        const target = isWeek ? d : new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
        return target.getDate() === sel.getDate() && target.getMonth() === sel.getMonth() && target.getFullYear() === sel.getFullYear();
    };

    const hasData = (d) => {
        const target = isWeek ? d : new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
        const dateStr = getLocalISODate(new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12));
        return datesWithData.includes(dateStr);
    };

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
                <button onClick={() => changeView(-1)} className="p-1 hover:bg-slate-800 rounded-full">←</button>
                <div className="font-bold text-base text-slate-300">
                    {label}
                </div>
                <button onClick={() => changeView(1)} className="p-1 hover:bg-slate-800 rounded-full">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-slate-500 py-1">{d}</div>)}
                {empties.map(i => <div key={`e-${i}`} />)}
                {days.map((d, i) => {
                    const dayNum = isWeek ? d.getDate() : d;
                    const dateObj = isWeek ? d : new Date(viewDate.getFullYear(), viewDate.getMonth(), d);

                    return (
                        <button key={i} onClick={() => onSelect(getLocalISODate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dayNum, 12)))}
                            className={`relative py-2 rounded-lg font-bold transition-all ${isSelected(isWeek ? d : dayNum) ? 'bg-cyan-600 text-white' : 'hover:bg-slate-800 text-slate-300'} ${isToday(isWeek ? d : dayNum) ? 'border border-cyan-500' : ''}`}>
                            {dayNum}
                            {hasData(isWeek ? d : dayNum) && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Calendar;
