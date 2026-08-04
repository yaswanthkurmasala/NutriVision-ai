
import React, { useState } from 'react';
import { UserProfile, CustomRecipe, NutritionData } from '../types';
import { generateCustomRecipe } from '../services/geminiService';
import { triggerHaptic } from '../services/haptic';

interface FoodGuideProps {
  user: UserProfile;
  onAddManualEntry?: (data: NutritionData) => void;
}

const FoodGuide: React.FC<FoodGuideProps> = ({ user, onAddManualEntry }) => {
  const [activeTab, setActiveTab] = useState<'superfoods' | 'chef'>('superfoods');
  const [ingredientInput, setIngredientInput] = useState<string>('');
  const [recipeLoading, setRecipeLoading] = useState<boolean>(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<CustomRecipe | null>(null);
  const [loggedNotice, setLoggedNotice] = useState<boolean>(false);

  const handleGenerateRecipe = async () => {
    triggerHaptic('medium');
    setRecipeLoading(true);
    setLoggedNotice(false);
    
    const ingList = ingredientInput
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);

    try {
      const recipe = await generateCustomRecipe(
        ingList,
        {
          calories: Math.round(user.dailyCalorieGoal / 3),
          protein: Math.round((user.macros?.protein || 150) / 3),
          carbs: Math.round((user.macros?.carbs || 200) / 3),
          fats: Math.round((user.macros?.fats || 70) / 3)
        },
        user.goal
      );
      setGeneratedRecipe(recipe);
      triggerHaptic('success');
    } catch (err) {
      console.error("Failed to generate recipe:", err);
      triggerHaptic('error');
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleLogRecipeToDiary = () => {
    if (!generatedRecipe || !onAddManualEntry) return;
    triggerHaptic('success');
    onAddManualEntry({
      foodName: generatedRecipe.title,
      calories: generatedRecipe.calories,
      protein: generatedRecipe.protein,
      carbs: generatedRecipe.carbs,
      fats: generatedRecipe.fats,
      fiber: generatedRecipe.fiber || 0,
      portionDescription: `1 serving (${generatedRecipe.prepTime} prep)`
    });
    setLoggedNotice(true);
    setTimeout(() => setLoggedNotice(false), 4000);
  };

  const recommendations = {
    Bulk: {
      best: [
        { name: 'Paneer (Cottage Cheese)', icon: 'cheese', calories: '265 kcal/100g', benefit: 'High protein & healthy fats' },
        { name: 'Chicken Breast', icon: 'lunch_dining', calories: '165 kcal/100g', benefit: 'Lean muscle building' },
        { name: 'Oats with Milk', icon: 'breakfast_dining', calories: '350 kcal/serving', benefit: 'Complex carbs for energy' },
        { name: 'Peanut Butter', icon: 'reorder', calories: '90 kcal/tbsp', benefit: 'Calorie dense healthy fats' },
        { name: 'Whole Eggs', icon: 'egg', calories: '70 kcal/egg', benefit: 'Essential amino acids' },
        { name: 'Brown Rice / Quinoa', icon: 'eco', calories: '130 kcal/100g', benefit: 'Slow-release energy' }
      ],
      avoid: [
        { name: 'Empty Calories', desc: 'Sugary drinks & soda' },
        { name: 'Excessive Junk', desc: 'Samosas, Pakoras, Jalebis' },
        { name: 'Highly Processed', desc: 'Instant noodles, Chips' }
      ]
    },
    Cut: {
      best: [
        { name: 'Sprouted Moong Dal', icon: 'spa', calories: '30 kcal/bowl', benefit: 'High volume, high protein' },
        { name: 'Cucumber & Salad', icon: 'grass', calories: '15 kcal/100g', benefit: 'Maximum satiety' },
        { name: 'Egg Whites', icon: 'egg_alt', calories: '17 kcal/egg', benefit: 'Pure lean protein' },
        { name: 'Soya Chunks', icon: 'grain', calories: '345 kcal/100g (dry)', benefit: 'Highest plant protein' },
        { name: 'Black Coffee / Green Tea', icon: 'coffee', calories: '2 kcal', benefit: 'Metabolism boost' }
      ],
      avoid: [
        { name: 'White Rice (Excess)', desc: 'Replace with brown rice or cauliflower rice' },
        { name: 'Deep Fried Foods', desc: 'Vada, Poori, Bajjis' },
        { name: 'Sweetened Desserts', desc: 'Gulab Jamun, Ice cream' }
      ]
    },
    Maintain: {
      best: [
        { name: 'Greek Yogurt / Curd', icon: 'icecream', calories: '100 kcal/bowl', benefit: 'Probiotics & protein' },
        { name: 'Mixed Nuts', icon: 'nut', calories: '160 kcal/handful', benefit: 'Brain health & omega-3' },
        { name: 'Lentils (Dal)', icon: 'bubble_chart', calories: '110 kcal/bowl', benefit: 'Daily protein staple' },
        { name: 'Fruit Platters', icon: 'apple', calories: '80 kcal/avg', benefit: 'Vitamins & antioxidants' }
      ],
      avoid: [
        { name: 'Excessive Salt', desc: 'Pickles, papads (water retention)' },
        { name: 'Alcohol', desc: 'Empty calories & slow recovery' },
        { name: 'Late Night Snacks', desc: 'Interferes with sleep/metabolism' }
      ]
    }
  };

  const currentGuide = recommendations[user.goal] || recommendations.Maintain;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight italic">Food & Recipe Hub</h1>
          <p className="text-sm text-primary/60 font-medium">Goal-based nutrition & AI Recipe Chef</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl flex items-center space-x-2">
          <span className="material-icons-round text-primary text-sm">track_changes</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">{user.goal} Mode</span>
        </div>
      </header>

      {/* Main Tab Bar */}
      <div className="bg-white/5 p-1 rounded-2xl flex space-x-1 border border-white/10">
        <button
          onClick={() => { setActiveTab('superfoods'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'superfoods' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-base">restaurant_menu</span>
          <span>Superfood Guide</span>
        </button>
        <button
          onClick={() => { setActiveTab('chef'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'chef' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-base">auto_awesome</span>
          <span>AI Recipe Chef</span>
        </button>
      </div>

      {activeTab === 'chef' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-icons-round text-xl">soup_kitchen</span>
              </div>
              <div>
                <h3 className="text-base font-black text-white">Interactive AI Recipe Chef</h3>
                <p className="text-xs text-slate-400">Generate delicious recipes customized to your pantry and {user.goal} goal.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Available Pantry / Fridge Ingredients (optional)</label>
              <input
                type="text"
                placeholder="e.g. Chicken breast, oats, eggs, spinach, avocado, tofu..."
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
              />

              <div className="flex gap-2">
                {['Chicken', 'Eggs', 'Paneer', 'Oats', 'Broccoli'].map(ing => (
                  <button
                    key={ing}
                    onClick={() => setIngredientInput(prev => prev ? `${prev}, ${ing}` : ing)}
                    className="text-[10px] font-semibold bg-white/5 hover:bg-primary/20 text-slate-300 hover:text-primary px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                  >
                    + {ing}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerateRecipe}
                disabled={recipeLoading}
                className="w-full bg-primary text-background-dark py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {recipeLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin"></div>
                    <span>Chef is Crafting Recipe...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons-round text-base">auto_awesome</span>
                    <span>Generate Tailored Recipe</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {generatedRecipe && (
            <div className="glass-card p-6 rounded-3xl border border-primary/30 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                    {generatedRecipe.prepTime} • {generatedRecipe.servings} serving
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">{generatedRecipe.title}</h3>
                </div>
                {onAddManualEntry && (
                  <button
                    onClick={handleLogRecipeToDiary}
                    className="bg-primary/20 hover:bg-primary text-primary hover:text-background-dark border border-primary/30 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5"
                  >
                    <span className="material-icons-round text-sm">add_circle</span>
                    <span>Log to Diary</span>
                  </button>
                )}
              </div>

              {loggedNotice && (
                <div className="bg-primary/20 border border-primary/40 p-3 rounded-xl text-xs font-bold text-primary flex items-center space-x-2">
                  <span className="material-icons-round text-sm">check_circle</span>
                  <span>Recipe logged to your food diary!</span>
                </div>
              )}

              {/* Macro Pills */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Calories</span>
                  <span className="text-sm font-black text-primary">{generatedRecipe.calories} kcal</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Protein</span>
                  <span className="text-sm font-black text-white">{generatedRecipe.protein}g</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Carbs</span>
                  <span className="text-sm font-black text-white">{generatedRecipe.carbs}g</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Fats</span>
                  <span className="text-sm font-black text-white">{generatedRecipe.fats}g</span>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-primary tracking-wider">Ingredients</h4>
                <ul className="space-y-1">
                  {generatedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-primary tracking-wider">Step-by-Step Cooking</h4>
                <ol className="space-y-2">
                  {generatedRecipe.instructions.map((step, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                      <span className="text-[10px] font-black text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {generatedRecipe.aiTip && (
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-xs text-slate-400 italic">
                  <span className="font-bold text-primary not-italic">Chef's Tip: </span>
                  {generatedRecipe.aiTip}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'superfoods' && (
        <>
          {/* Best Foods Section */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 px-1">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-icons-round text-primary text-xs">thumb_up</span>
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Superfoods for {user.goal}</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentGuide.best.map((food, idx) => (
                <div key={idx} className="glass-card rounded-3xl p-5 border border-white/5 relative overflow-hidden group hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                      <span className="material-icons-round text-3xl">{food.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-white group-hover:text-primary transition-colors">{food.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{food.calories}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium text-white/40 italic block max-w-[100px] leading-tight">{food.benefit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Avoid Section */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 px-1">
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="material-icons-round text-red-400 text-xs">block</span>
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Limit / Avoid</h2>
            </div>

            <div className="glass-card rounded-[2rem] p-6 border border-red-500/10 bg-red-500/[0.02]">
              <div className="space-y-5">
                {currentGuide.avoid.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-red-500/40 mt-1.5 shrink-0"></div>
                    <div>
                      <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Goal Strategy Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-icons-round text-8xl">lightbulb</span>
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-background-dark shrink-0 shadow-[0_0_15px_rgba(19,236,55,0.3)]">
                <span className="material-icons-round text-2xl">auto_fix_high</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-primary uppercase tracking-wider">Strategy Tip</h4>
                <p className="text-xs text-white/60 leading-relaxed mt-2 font-medium">
                  {user.goal === 'Bulk' 
                    ? "Don't just eat more, eat better. Focus on lean proteins to ensure most of your weight gain is muscle, not just fat."
                    : user.goal === 'Cut'
                    ? "Prioritize protein to protect your muscles while in a deficit. If you feel hungry, drink water or eat green leafy vegetables."
                    : "Consistency is your best friend. Keep your macros balanced and don't skip your daily step count."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FoodGuide;

