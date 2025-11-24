import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getLocalISODate } from '../../utils/dateUtils';
import NutrientLegend from './NutrientLegend';
import GeminiFoodEntry from './GeminiFoodEntry';
import EditFoodModal from './EditFoodModal';

const FoodTab = ({ data, isReady, userId, showToast, isConfigLoaded, selectedDate, onSelectDate, geminiKey }) => {
    const [editingItem, setEditingItem] = useState(null);

    const deleteFoodItem = async (docId) => {
        if (!isReady || !userId) return showToast('Database not ready.', 'error');
        try {
            await deleteDoc(doc(db, 'users', userId, 'food_logs', docId));
            showToast('Item deleted!', 'success');
        } catch (e) {
            showToast('Deletion failed. Check Security Rules.', 'error');
        }
    };

    const updateFoodItem = async (updatedItem) => {
        if (!isReady || !userId) return showToast('Database not ready.', 'error');
        try {
            await updateDoc(doc(db, 'users', userId, 'food_logs', updatedItem.id), {
                name: updatedItem.name,
                quantity: Number(updatedItem.quantity) || 1,
                cals: Number(updatedItem.cals) || 0,
                prot: Number(updatedItem.prot) || 0,
                carb: Number(updatedItem.carb) || 0,
                fat: Number(updatedItem.fat) || 0,
            });
            setEditingItem(null);
            showToast('Item updated!', 'success');
        } catch (e) {
            showToast('Update failed.', 'error');
            console.error(e);
        }
    };

    const adjustQuantity = async (item, delta) => {
        if (!isReady || !userId) return showToast('Database not ready.', 'error');

        const currentQty = item.quantity || 1;
        const newQty = Math.max(0.5, currentQty + delta); // Minimum 0.5

        if (newQty === currentQty) return;

        // Calculate base values (per unit)
        const baseCals = (item.cals || 0) / currentQty;
        const baseProt = (item.prot || 0) / currentQty;
        const baseCarb = (item.carb || 0) / currentQty;
        const baseFat = (item.fat || 0) / currentQty;

        const updatedItem = {
            ...item,
            quantity: newQty,
            cals: Math.round(baseCals * newQty),
            prot: Math.round(baseProt * newQty),
            carb: Math.round(baseCarb * newQty),
            fat: Math.round(baseFat * newQty)
        };

        await updateFoodItem(updatedItem);
    };

    const isToday = selectedDate === getLocalISODate();
    const dateDisplay = isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Default goals if not provided
    const DEFAULT_GOALS = { calories: 2350, protein: 180, carbs: 250, fat: 80 };

    return (
        <>
            <EditFoodModal key={editingItem ? editingItem.id : 'modal'} item={editingItem} onClose={() => setEditingItem(null)} onSave={updateFoodItem} />

            <div className="mb-6 flex items-center justify-between relative">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors relative">
                    {dateDisplay}
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onSelectDate(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </h2>
            </div>
            <div className="mb-8">
                <NutrientLegend cals={data.totals.cals} prot={data.totals.prot} carb={data.totals.carb} fat={data.totals.fat} goals={data.goals || DEFAULT_GOALS} />
            </div>
            <GeminiFoodEntry isReady={isReady} userId={userId} showToast={showToast} isConfigLoaded={isConfigLoaded} selectedDate={selectedDate} geminiKey={geminiKey} />
            <div className="space-y-4">
                {!isReady && <div className="text-center text-slate-500 py-6">Waiting for Database connection...</div>}
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(category => {
                    const items = data.food.filter(f => (f.category || 'Snack') === category);
                    if (items.length === 0) return null;

                    return (
                        <div key={category} className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-300 pl-1">{category}</h3>
                            {items.map(item => (
                                <div key={item.id} onClick={() => setEditingItem(item)} className="bg-slate-900/80 backdrop-blur-xl rounded-xl p-5 flex justify-between items-center border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                                    <div>
                                        <div className="font-bold flex items-center gap-2">
                                            {item.name}
                                        </div>
                                        <div className="text-sm text-slate-500">{item.prot}g P • {item.carb}g C • {item.fat}g F</div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-slate-800" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => adjustQuantity(item, -0.5)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded">-</button>
                                            <span className="text-xs font-bold text-slate-300 w-4 text-center">{item.quantity || 1}</span>
                                            <button onClick={() => adjustQuantity(item, 0.5)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded">+</button>
                                        </div>
                                        <div className="text-2xl font-black text-emerald-400 w-16 text-right">{item.cals}</div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteFoodItem(item.id); }} className="text-red-500 text-lg hover:text-red-400 transition-colors">×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default FoodTab;
