import React, { useState } from 'react';

const FloatingMenu = ({ tab, setTab }) => {
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { id: 'summary', label: 'Summary', icon: '📊' },
        { id: 'food', label: 'Food', icon: '🍎' },
        { id: 'activity', label: 'Activity', icon: '⚡' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
            {isOpen && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setTab(item.id); setIsOpen(false); }}
                            className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-xl transition-all hover:scale-105 ${tab === item.id ? 'bg-white text-slate-900 font-bold' : 'bg-slate-800/90 text-slate-200 backdrop-blur-md border border-slate-700'}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl transition-transform ${isOpen ? 'rotate-45 bg-slate-800 text-white' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:scale-105'}`}
            >
                {isOpen ? '＋' : '☰'}
            </button>
        </div>
    );
};

export default FloatingMenu;
