import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, deleteDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getLocalISODate } from '../../utils/dateUtils';
import NutrientLegend from './NutrientLegend';
import FloatingFoodButton from './FloatingFoodButton';
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
                time: updatedItem.time || null,
                category: updatedItem.category || 'Snack'
            });
            setEditingItem(null);
            showToast('Item updated!', 'success');
        } catch (e) {
            showToast('Update failed.', 'error');
            console.error(e);
        }
    };

    const addFoodToLog = async (foodData) => {
        if (!isReady || !userId) return showToast('Database not ready.', 'error');
        try {
            await addDoc(collection(db, 'users', userId, 'food_logs'), {
                date: selectedDate,
                timestamp: serverTimestamp(),
                name: foodData.name,
                cals: Number(foodData.cals) || 0,
                prot: Number(foodData.prot) || 0,
                carb: Number(foodData.carb) || 0,
                fat: Number(foodData.fat) || 0,
                quantity: Number(foodData.quantity) || 1,
                time: foodData.time,
                category: foodData.category
            });
            showToast('Food added!', 'success');
        } catch (e) {
            showToast('Failed to add food.', 'error');
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

            <div className="space-y-4">
                {!isReady && <div className="text-center text-slate-500 py-6">Waiting for Database connection...</div>}
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(category => {
                    const items = data.food.filter(f => (f.category || 'Snack') === category);
                    if (items.length === 0) return null;

                    return (
                        <div
                            key={category}
                            className="space-y-3 min-h-[100px] p-2 rounded-2xl transition-colors"
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-slate-800/50'); }}
                            onDragLeave={(e) => { e.currentTarget.classList.remove('bg-slate-800/50'); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('bg-slate-800/50');
                                const itemId = e.dataTransfer.getData('text/plain');
                                const item = data.food.find(i => i.id === itemId);
                                if (item && item.category !== category) {
                                    updateFoodItem({ ...item, category });
                                }
                            }}
                        >
                            <h3 className="text-xl font-bold text-slate-300 pl-1">{category}</h3>
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); }}
                                    onClick={() => setEditingItem(item)}
                                    className="bg-slate-900/80 backdrop-blur-xl rounded-xl p-5 flex justify-between items-center border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors active:cursor-grabbing"
                                >
                                    <div>
                                        <div className="font-bold flex items-center gap-2 text-lg">
                                            {item.name}
                                            <span className="text-xs font-normal text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">{item.time || '—'}</span>
                                        </div>
                                        <div className="flex gap-3 mt-1 text-xs font-bold text-slate-400">
                                            <span className="text-blue-400">{item.prot}p</span>
                                            <span className="text-amber-400">{item.carb}c</span>
                                            <span className="text-rose-400">{item.fat}f</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <div className="flex flex-col items-center bg-slate-950 rounded-lg border border-slate-800 px-1">
                                            <button onClick={(e) => { e.stopPropagation(); adjustQuantity(item, 0.5); }} className="h-5 w-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-t text-[10px]">▲</button>
                                            <span className="text-xs font-bold text-slate-300 w-6 text-center py-0.5 border-y border-slate-800">{item.quantity || 1}</span>
                                            <button onClick={(e) => { e.stopPropagation(); adjustQuantity(item, -0.5); }} className="h-5 w-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-b text-[10px]">▼</button>
                                        </div>
                                        <div className="text-xl font-black text-emerald-400 w-14 text-right">{item.cals}</div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteFoodItem(item.id); }} className="text-slate-600 hover:text-red-500 transition-colors p-1">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Floating Food Entry Button */}
            <FloatingFoodButton
                onAddFood={addFoodToLog}
                todaysFoods={data.food}
                todaysTotals={data.totals}
                goals={data.goals || DEFAULT_GOALS}
                gymData={data.gym || []}
                cardioData={data.cardio || []}
                geminiKey={geminiKey}
                selectedDate={selectedDate}
            />
        </>
    );
};

export default FoodTab;
