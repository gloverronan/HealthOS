import React, { useState } from 'react';
import { generateGeminiContent } from '../../services/gemini';

const ACTIVITY_LEVELS = [
    { value: 'sedentary', label: 'Sedentary (Office job, little exercise)' },
    { value: 'light', label: 'Lightly Active (1-3 days/week exercise)' },
    { value: 'moderate', label: 'Moderately Active (3-5 days/week exercise)' },
    { value: 'active', label: 'Active (6-7 days/week exercise)' },
    { value: 'very_active', label: 'Very Active (Physical job + training)' }
];

const GOALS = [
    { value: 'cut', label: 'Lose Fat (Cut)' },
    { value: 'maintain', label: 'Maintain Weight' },
    { value: 'bulk', label: 'Build Muscle (Bulk)' }
];

const OnboardingModal = ({ isVisible, onSave, geminiKey }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        gender: 'male',
        age: '',
        weight: '', // kg
        height: '', // cm
        activity: 'moderate',
        goal: 'maintain'
    });
    const [generatedMacros, setGeneratedMacros] = useState(null);

    if (!isVisible) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const generatePlan = async () => {
        if (!geminiKey) {
            alert('Gemini API Key is missing. Please contact admin.');
            return;
        }

        setLoading(true);
        try {
            const prompt = `
            Act as an expert nutritionist. Calculate daily macronutrient goals for this person:
            - Gender: ${formData.gender}
            - Age: ${formData.age}
            - Weight: ${formData.weight}kg
            - Height: ${formData.height}cm
            - Activity Level: ${formData.activity}
            - Goal: ${formData.goal}

            Return ONLY a JSON object with these exact keys (numbers only):
            {
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0
            }
            `;

            const response = await generateGeminiContent(geminiKey, prompt);
            const jsonString = response.replace(/```json|```/g, '').trim();
            const macros = JSON.parse(jsonString);

            setGeneratedMacros(macros);
            setStep(2);
        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("Failed to generate plan. Please try again.");
        }
        setLoading(false);
    };

    const handleSave = () => {
        onSave({
            profile: formData,
            goals: generatedMacros
        });
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
                        Welcome to HealthOS
                    </h2>
                    <p className="text-slate-400">Let's build your personalized nutrition plan.</p>
                </div>

                {step === 1 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white">
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                                <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" placeholder="Years" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" placeholder="kg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Height (cm)</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" placeholder="cm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Activity Level</label>
                            <select name="activity" value={formData.activity} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white">
                                {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Goal</label>
                            <select name="goal" value={formData.goal} onChange={handleChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white">
                                {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={generatePlan}
                            disabled={loading || !formData.age || !formData.weight || !formData.height}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white text-lg hover:opacity-90 transition-opacity mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Analyzing...' : 'Generate My Plan ✨'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-8">
                        <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 text-center">
                            <h3 className="text-xl font-bold text-white mb-4">Your Recommended Macros</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900 p-3 rounded-lg">
                                    <div className="text-2xl font-black text-emerald-400">{generatedMacros.calories}</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Calories</div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-lg">
                                    <div className="text-2xl font-black text-blue-400">{generatedMacros.protein}g</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Protein</div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-lg">
                                    <div className="text-2xl font-black text-amber-400">{generatedMacros.carbs}g</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Carbs</div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-lg">
                                    <div className="text-2xl font-black text-rose-400">{generatedMacros.fat}g</div>
                                    <div className="text-xs text-slate-500 uppercase font-bold">Fat</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-300 hover:bg-slate-700"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-[2] py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-500"
                            >
                                Save & Start
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingModal;
