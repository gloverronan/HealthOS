import React, { useState, useEffect } from 'react';

const EditFoodModal = ({ item, onClose, onSave }) => {
    const [edited, setEdited] = useState(item);
    const [baseValues, setBaseValues] = useState(null);

    useEffect(() => {
        if (item) {
            setEdited(item);
            // Calculate base values (per unit)
            const qty = item.quantity || 1;
            setBaseValues({
                cals: item.cals / qty,
                prot: item.prot / qty,
                carb: item.carb / qty,
                fat: item.fat / qty
            });
        }
    }, [item]);

    if (!item || !edited) return null;

    const handleQuantityChange = (val) => {
        const q = parseFloat(val);
        const newQty = isNaN(q) ? val : q; // Keep string if typing

        const updates = { quantity: newQty };

        if (!isNaN(q) && baseValues) {
            updates.cals = Math.round(baseValues.cals * q);
            updates.prot = Math.round(baseValues.prot * q);
            updates.carb = Math.round(baseValues.carb * q);
            updates.fat = Math.round(baseValues.fat * q);
        }

        setEdited(prev => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        onSave(edited);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-6 text-white">Edit Entry</h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                        <input
                            type="text"
                            value={edited.name}
                            onChange={e => setEdited({ ...edited, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                            <input
                                type="number"
                                value={edited.quantity || 1}
                                onChange={e => handleQuantityChange(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white mt-1"
                                step="0.5"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Calories</label>
                            <input
                                type="number"
                                value={edited.cals}
                                onChange={e => setEdited({ ...edited, cals: Number(e.target.value) })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white mt-1 font-bold text-emerald-400"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Prot (g)</label>
                            <input type="number" value={edited.prot} onChange={e => setEdited({ ...edited, prot: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white mt-1" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Carb (g)</label>
                            <input type="number" value={edited.carb} onChange={e => setEdited({ ...edited, carb: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white mt-1" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Fat (g)</label>
                            <input type="number" value={edited.fat} onChange={e => setEdited({ ...edited, fat: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white mt-1" />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">Cancel</button>
                        <button onClick={handleSave} className="flex-1 py-3 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-500">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditFoodModal;
