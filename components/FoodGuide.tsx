import React, { useState, useEffect } from 'react';
import { UserProfile, CustomRecipe, NutritionData } from '../types';
import { generateCustomRecipe } from '../services/geminiService';
import { triggerHaptic } from '../services/haptic';

interface FoodGuideProps {
  user: UserProfile;
  onAddManualEntry?: (data: NutritionData) => void;
}

const FEATURED_RECIPES: CustomRecipe[] = [
  {
    title: 'Avocado & Poached Egg Sourdough Toast',
    prepTime: '12 mins',
    servings: 1,
    calories: 380,
    protein: 20,
    carbs: 32,
    fats: 18,
    fiber: 7,
    category: 'Breakfast',
    difficulty: 'Easy',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      '2 slices Artisan Sourdough Bread',
      '1/2 ripe Hass Avocado (mashed)',
      '2 large Organic Eggs (poached)',
      '1 tsp Extra Virgin Olive Oil',
      'Pinch of Red Pepper Flakes, Sea Salt & Black Pepper',
      'Fresh Microgreens / Parsley'
    ],
    instructions: [
      'Toast sourdough slices until golden and crisp.',
      'In a shallow bowl, coarse-mash avocado with lemon juice, salt, and pepper.',
      'Bring a pot of water with 1 tbsp vinegar to a gentle simmer. Create a vortex and drop in eggs one by one. Poach for 3 minutes.',
      'Spread avocado generously over toast, top with poached eggs, sprinkle chili flakes, and drizzle olive oil.'
    ],
    aiTip: 'Rich in monounsaturated healthy fats and choline for brain function. Ideal pre-workout breakfast.'
  },
  {
    title: 'Grilled Chicken & Quinoa Power Bowl',
    prepTime: '20 mins',
    servings: 1,
    calories: 520,
    protein: 46,
    carbs: 48,
    fats: 14,
    fiber: 8,
    category: 'High Protein',
    difficulty: 'Easy',
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      '180g Chicken Breast (sliced)',
      '1 cup Cooked White or Tri-color Quinoa',
      '1 cup Steamed Broccoli Florets',
      '1/4 cup Roasted Chickpeas',
      '1 tbsp Lemon Tahini Dressing',
      '1 tsp Smoked Paprika & Garlic Powder'
    ],
    instructions: [
      'Season chicken breast with paprika, garlic powder, salt, and black pepper.',
      'Grill on medium-high heat for 5-6 mins per side until internal temperature reaches 165°F (74°C).',
      'Assemble cooked quinoa base in a wide bowl, lay grilled chicken, broccoli, and crispy chickpeas.',
      'Drizzle warm lemon tahini dressing over top before serving.'
    ],
    aiTip: 'Provides complete amino acids and slow-digesting carbs. Perfect post-workout meal for muscle hypertrophy.'
  },
  {
    title: 'Charbroiled Paneer Tikka Protein Salad',
    prepTime: '22 mins',
    servings: 1,
    calories: 420,
    protein: 28,
    carbs: 22,
    fats: 24,
    fiber: 6,
    category: 'Vegetarian',
    difficulty: 'Medium',
    rating: 4.85,
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      '160g Low-Fat Paneer (cubed)',
      '1/2 cup Greek Yogurt (hung curd)',
      '1/2 Bell Pepper & Red Onion (cubed)',
      '1 cup Mixed Salad Greens (Spinach, Arugula)',
      '1 tsp Tandoori Masala & Chaat Masala',
      '1 tbsp Mint Yogurt Dressing'
    ],
    instructions: [
      'Whisk hung curd with tandoori masala, ginger-garlic paste, lemon juice, and salt.',
      'Marinate paneer cubes and veggies for 15 mins.',
      'Skewer or pan-sear on high heat for 6-8 mins until charred on edges.',
      'Serve over fresh salad greens and drizzle with chilled mint yogurt dip.'
    ],
    aiTip: 'High in bioavailable casein protein for sustained amino acid release. Great for dinner.'
  },
  {
    title: 'Wild Berry Whey Protein Smoothie',
    prepTime: '5 mins',
    servings: 1,
    calories: 290,
    protein: 32,
    carbs: 34,
    fats: 4,
    fiber: 6,
    category: 'Quick (<15m)',
    difficulty: 'Easy',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      '1 scoop Whey Protein Isolate (Vanilla or Unflavored)',
      '1/2 cup Frozen Wild Blueberries & Strawberries',
      '1/2 Frozen Banana',
      '1 cup Unsweetened Almond Milk',
      '1 tbsp Chia Seeds',
      '3-4 Ice cubes'
    ],
    instructions: [
      'Add almond milk, whey protein, frozen berries, banana, chia seeds, and ice into high-speed blender.',
      'Blend on HIGH for 45-60 seconds until thick and velvety.',
      'Pour into a chilled glass and top with a sprinkle of chia seeds.'
    ],
    aiTip: 'Rapidly absorbed protein paired with antioxidant polyphenols for fast recovery and low inflammation.'
  },
  {
    title: 'Crispy Pan-Seared Salmon & Asparagus',
    prepTime: '18 mins',
    servings: 1,
    calories: 450,
    protein: 42,
    carbs: 10,
    fats: 26,
    fiber: 4,
    category: 'Low Carb',
    difficulty: 'Medium',
    rating: 4.98,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      '180g Wild Atlantic Salmon Filet (skin-on)',
      '150g Fresh Green Asparagus spears',
      '1 tbsp Olive Oil & Butter blend',
      '1 clove Garlic (minced) & Lemon wedges',
      'Sea Salt, Black Pepper & Dill'
    ],
    instructions: [
      'Pat salmon dry with paper towel; season skin with coarse sea salt and pepper.',
      'Heat oil in skillet over medium-high heat. Place salmon skin-side down; press gently for 4 mins until skin is super crispy.',
      'Flip salmon, add asparagus spears, garlic, and butter. Baste salmon with melted butter for 3 mins.',
      'Squeeze fresh lemon juice over asparagus and salmon before serving.'
    ],
    aiTip: 'Packed with essential EPA/DHA Omega-3 fatty acids for joint mobility and hormonal health.'
  },
  {
    title: 'High-Protein Greek Yogurt Berry Parfait',
    prepTime: '8 mins',
    servings: 1,
    calories: 310,
    protein: 26,
    carbs: 36,
    fats: 6,
    fiber: 5,
    category: 'Quick (<15m)',
    difficulty: 'Easy',
    rating: 4.88,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80',
    ingredients: [
      '200g 0% Plain Greek Yogurt',
      '1/3 cup High-Protein Granola or Oats',
      '1/2 cup Fresh Raspberries & Blackberries',
      '1 tbsp Honey or Pure Maple Syrup',
      '1 tbsp Crushed Almonds'
    ],
    instructions: [
      'In a tall glass, layer 100g of Greek yogurt at the bottom.',
      'Add a layer of mixed berries and half of the granola.',
      'Add remaining Greek yogurt, top with berries, crunch granola, sliced almonds, and drizzle honey.'
    ],
    aiTip: 'Probiotic powerhouse for gut microbiome efficiency and immune strength.'
  }
];

const FoodGuide: React.FC<FoodGuideProps> = ({ user, onAddManualEntry }) => {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'chef' | 'superfoods'>('catalogue');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRecipeModal, setSelectedRecipeModal] = useState<CustomRecipe | null>(null);
  const [servingScale, setServingScale] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nutrivision_fav_recipes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // AI Chef State
  const [ingredientInput, setIngredientInput] = useState<string>('');
  const [dietFilter, setDietFilter] = useState<string>('High Protein');
  const [prepTimeFilter, setPrepTimeFilter] = useState<string>('Under 20m');
  const [recipeLoading, setRecipeLoading] = useState<boolean>(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<CustomRecipe | null>(null);
  const [loggedNotice, setLoggedNotice] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('nutrivision_fav_recipes', JSON.stringify(favorites));
    } catch (e) {
      console.warn("Favorites cache notice:", e);
    }
  }, [favorites]);

  const toggleFavorite = (title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    setFavorites(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleGenerateRecipe = async (overrideIngredients?: string[]) => {
    triggerHaptic('medium');
    setRecipeLoading(true);
    setLoggedNotice(false);
    
    const ingList = overrideIngredients || ingredientInput
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

  const handleLogRecipeToDiary = (recipe: CustomRecipe) => {
    if (!onAddManualEntry) return;
    triggerHaptic('success');
    const scale = servingScale || 1;
    onAddManualEntry({
      foodName: recipe.title,
      calories: Math.round(recipe.calories * scale),
      protein: Math.round(recipe.protein * scale),
      carbs: Math.round(recipe.carbs * scale),
      fats: Math.round(recipe.fats * scale),
      fiber: Math.round((recipe.fiber || 0) * scale),
      portionDescription: `${scale}x serving (${recipe.prepTime || '15m prep'})`
    });
    setLoggedNotice(true);
    setTimeout(() => setLoggedNotice(false), 4000);
  };

  const categories = ['All', 'High Protein', 'Low Carb', 'Quick (<15m)', 'Vegetarian', 'Breakfast', 'Saved Favorites'];

  const filteredRecipes = FEATURED_RECIPES.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Saved Favorites') return favorites.includes(recipe.title);
    if (selectedCategory === 'Quick (<15m)') return recipe.category === 'Quick (<15m)' || parseInt(recipe.prepTime) <= 15;
    return recipe.category === selectedCategory;
  });

  const toggleStepCompleted = (idx: number) => {
    triggerHaptic('light');
    setCompletedSteps(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const recommendations = {
    Bulk: {
      best: [
        { name: 'Paneer (Cottage Cheese)', icon: 'cheese', calories: '265 kcal/100g', benefit: 'High protein & healthy fats' },
        { name: 'Chicken Breast', icon: 'lunch_dining', calories: '165 kcal/100g', benefit: 'Lean muscle building' },
        { name: 'Oats with Whole Milk', icon: 'breakfast_dining', calories: '350 kcal/serving', benefit: 'Complex carbs for energy' },
        { name: 'Natural Peanut Butter', icon: 'reorder', calories: '90 kcal/tbsp', benefit: 'Calorie dense healthy fats' },
        { name: 'Whole Eggs', icon: 'egg', calories: '70 kcal/egg', benefit: 'Essential amino acids' },
        { name: 'Brown Rice / Quinoa', icon: 'eco', calories: '130 kcal/100g', benefit: 'Slow-release fuel' }
      ],
      avoid: [
        { name: 'Empty Calories', desc: 'Sugary sodas & ultra-processed snacks' },
        { name: 'Excessive Deep Fried', desc: 'Commercial pakoras & heavy oil batters' },
        { name: 'Trans Fats', desc: 'Hydrogenated margarine & palm oil spreads' }
      ]
    },
    Cut: {
      best: [
        { name: 'Sprouted Moong Dal', icon: 'spa', calories: '30 kcal/bowl', benefit: 'High volume, high fiber' },
        { name: 'Cucumber & Salad Greens', icon: 'grass', calories: '15 kcal/100g', benefit: 'Maximum satiety' },
        { name: 'Egg Whites', icon: 'egg_alt', calories: '17 kcal/egg', benefit: 'Pure zero-fat protein' },
        { name: 'Soya Chunks', icon: 'grain', calories: '345 kcal/100g (dry)', benefit: 'Highest plant protein' },
        { name: 'Black Coffee / Green Tea', icon: 'coffee', calories: '2 kcal', benefit: 'Metabolism enhancer' }
      ],
      avoid: [
        { name: 'Refined Carbs', desc: 'White bread, maida pastries, sugary syrups' },
        { name: 'Heavy Cream Sauces', desc: 'Alfredo & butter curries' },
        { name: 'Liquid Calories', desc: 'Fruit juices & sweetened lattes' }
      ]
    },
    Maintain: {
      best: [
        { name: 'Greek Yogurt / Curd', icon: 'icecream', calories: '100 kcal/bowl', benefit: 'Probiotics & protein' },
        { name: 'Mixed Almonds & Walnuts', icon: 'nut', calories: '160 kcal/handful', benefit: 'Brain health & omega-3' },
        { name: 'Lentils & Dal Staples', icon: 'bubble_chart', calories: '110 kcal/bowl', benefit: 'Daily steady protein' },
        { name: 'Fresh Berries & Apples', icon: 'apple', calories: '80 kcal/avg', benefit: 'Vitamins & antioxidants' }
      ],
      avoid: [
        { name: 'Excessive Sodium', desc: 'Canned soups, papads & pickles (water retention)' },
        { name: 'Late Night Heavy Meals', desc: 'Interferes with sleep recovery & metabolism' }
      ]
    }
  };

  const currentGuide = recommendations[user.goal] || recommendations.Maintain;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="material-icons-round text-primary text-xl">restaurant</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Fitness Recipe Hub</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Chef recipes, AI creation & goal superfood guides</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">{user.goal} Plan</span>
        </div>
      </header>

      {/* Main Tab Bar */}
      <div className="bg-white/5 p-1 rounded-2xl flex space-x-1 border border-white/10">
        <button
          onClick={() => { setActiveTab('catalogue'); triggerHaptic('light'); }}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'catalogue' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-base">menu_book</span>
          <span>Recipe Library</span>
        </button>
        <button
          onClick={() => { setActiveTab('chef'); triggerHaptic('light'); }}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'chef' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-base">auto_awesome</span>
          <span>AI Recipe Chef</span>
        </button>
        <button
          onClick={() => { setActiveTab('superfoods'); triggerHaptic('light'); }}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'superfoods' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-base">spa</span>
          <span>Superfoods</span>
        </button>
      </div>

      {/* TAB 1: CURATED RECIPE CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Search Bar & Category Filter Pills */}
          <div className="space-y-3">
            <div className="relative">
              <span className="material-icons-round absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base">search</span>
              <input
                type="text"
                placeholder="Search recipes, ingredients, or meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <span className="material-icons-round text-sm">cancel</span>
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); triggerHaptic('light'); }}
                  className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl whitespace-nowrap border transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-black border-primary shadow-md shadow-primary/20 scale-105'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat === 'Saved Favorites' ? `❤️ ${cat} (${favorites.length})` : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recipe Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecipes.length === 0 ? (
              <div className="col-span-full glass-card p-8 text-center rounded-3xl border border-white/10 space-y-3">
                <span className="material-icons-round text-4xl text-slate-600">no_meals</span>
                <p className="text-xs text-slate-400 font-medium">No recipes found matching "{searchQuery}". Try searching for another ingredient or reset filters.</p>
              </div>
            ) : (
              filteredRecipes.map((recipe, idx) => {
                const isFav = favorites.includes(recipe.title);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedRecipeModal(recipe);
                      setServingScale(1);
                      setCompletedSteps([]);
                      triggerHaptic('medium');
                    }}
                    className="glass-card rounded-3xl border border-white/10 overflow-hidden cursor-pointer group hover:border-primary/40 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Image Banner */}
                      <div className="relative h-44 w-full overflow-hidden bg-black/40">
                        <img 
                          src={recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'} 
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/30"></div>

                        {/* Category & Time Badges */}
                        <div className="absolute top-3 left-3 flex space-x-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-md text-primary px-2.5 py-1 rounded-full border border-primary/30">
                            {recipe.prepTime}
                          </span>
                          {recipe.difficulty && (
                            <span className="text-[9px] font-bold bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                              {recipe.difficulty}
                            </span>
                          )}
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => toggleFavorite(recipe.title, e)}
                          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 ${
                            isFav ? 'bg-red-500/80 border-red-400 text-white' : 'bg-black/40 border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          <span className="material-icons-round text-base">{isFav ? 'favorite' : 'favorite_border'}</span>
                        </button>

                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-base font-black text-white leading-tight drop-shadow-md line-clamp-1 group-hover:text-primary transition-colors">
                            {recipe.title}
                          </h3>
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <span className="text-xs font-black text-primary block">{recipe.calories}</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase">kcal</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <span className="text-xs font-black text-white block">{recipe.protein}g</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase">Protein</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <span className="text-xs font-black text-white block">{recipe.carbs}g</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase">Carbs</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <span className="text-xs font-black text-white block">{recipe.fats}g</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase">Fats</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic">
                          "{recipe.aiTip || recipe.ingredients.slice(0, 3).join(', ')}"
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-1 flex justify-between items-center border-t border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-1">
                        <span className="material-icons-round text-amber-400 text-xs">star</span>
                        <span>{recipe.rating || 4.9} • {recipe.servings} serving</span>
                      </span>
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                        <span>View Recipe</span>
                        <span className="material-icons-round text-xs">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI RECIPE CHEF */}
      {activeTab === 'chef' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <span className="material-icons-round text-2xl">soup_kitchen</span>
              </div>
              <div>
                <h3 className="text-base font-black text-white">Interactive AI Recipe Chef</h3>
                <p className="text-xs text-slate-400">Generate personalized gourmet recipes tailored to your pantry & {user.goal} goals.</p>
              </div>
            </div>

            {/* Diet & Target Filters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Diet Focus</label>
                <select
                  value={dietFilter}
                  onChange={(e) => setDietFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="High Protein">High Protein</option>
                  <option value="Keto / Low Carb">Keto / Low Carb</option>
                  <option value="Vegan / Vegetarian">Vegan / Vegetarian</option>
                  <option value="Balanced Clean">Balanced Clean</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Prep Time Target</label>
                <select
                  value={prepTimeFilter}
                  onChange={(e) => setPrepTimeFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="Under 15m">Under 15 mins</option>
                  <option value="15-30m">15 to 30 mins</option>
                  <option value="Any">Any time</option>
                </select>
              </div>
            </div>

            {/* Ingredients Input */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Pantry / Fridge Ingredients</label>
              <input
                type="text"
                placeholder="e.g. Chicken breast, eggs, oats, spinach, avocado, paneer..."
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Chicken', 'Eggs', 'Paneer', 'Oats', 'Salmon', 'Broccoli', 'Avocado', 'Tofu'].map(ing => (
                  <button
                    key={ing}
                    onClick={() => {
                      triggerHaptic('light');
                      setIngredientInput(prev => prev ? `${prev}, ${ing}` : ing);
                    }}
                    className="text-[10px] font-semibold bg-white/5 hover:bg-primary/20 text-slate-300 hover:text-primary px-2.5 py-1 rounded-xl border border-white/10 transition-all"
                  >
                    + {ing}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleGenerateRecipe()}
                disabled={recipeLoading}
                className="flex-1 bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-background-dark py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {recipeLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin"></div>
                    <span>Chef is Cooking...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons-round text-base">auto_awesome</span>
                    <span>Generate AI Recipe</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerateRecipe(['Chef Special Surprise'])}
                disabled={recipeLoading}
                className="bg-white/10 hover:bg-white/15 text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all border border-white/20"
                title="Surprise Recipe"
              >
                <span className="material-icons-round text-base text-primary">casino</span>
              </button>
            </div>
          </div>

          {/* Generated AI Recipe Output */}
          {generatedRecipe && (
            <div className="glass-card p-6 rounded-3xl border border-primary/40 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                    {generatedRecipe.prepTime} • {generatedRecipe.servings} serving
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">{generatedRecipe.title}</h3>
                </div>

                {onAddManualEntry && (
                  <button
                    onClick={() => handleLogRecipeToDiary(generatedRecipe)}
                    className="bg-primary text-black px-4 py-2.5 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1.5 shadow-lg shadow-primary/20"
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
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Calories</span>
                  <span className="text-sm font-black text-primary">{generatedRecipe.calories} kcal</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Protein</span>
                  <span className="text-sm font-black text-white">{generatedRecipe.protein}g</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Carbs</span>
                  <span className="text-sm font-black text-white">{generatedRecipe.carbs}g</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Fats</span>
                  <span className="text-sm font-black text-white">{generatedRecipe.fats}g</span>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center space-x-1.5">
                  <span className="material-icons-round text-sm">shopping_basket</span>
                  <span>Ingredients Checklist</span>
                </h4>
                <ul className="space-y-1.5 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                  {generatedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cooking Instructions */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center space-x-1.5">
                  <span className="material-icons-round text-sm">format_list_numbered</span>
                  <span>Step-by-Step Cooking</span>
                </h4>
                <ol className="space-y-2.5">
                  {generatedRecipe.instructions.map((step, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start space-x-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {generatedRecipe.aiTip && (
                <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-2xl text-xs text-slate-300 italic flex items-start space-x-2">
                  <span className="material-icons-round text-primary text-base not-italic mt-0.5">tips_and_updates</span>
                  <div>
                    <span className="font-bold text-primary not-italic block">Chef's Pro Tip: </span>
                    {generatedRecipe.aiTip}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUPERFOODS & GOAL NUTRITION GUIDE */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentGuide.best.map((food, idx) => (
                <div key={idx} className="glass-card rounded-3xl p-5 border border-white/5 relative overflow-hidden group hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span className="material-icons-round text-2xl">{food.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-black text-white group-hover:text-primary transition-colors">{food.name}</h3>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{food.calories}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-medium text-white/50 italic block max-w-[90px] leading-tight">{food.benefit}</span>
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
              <div className="space-y-4">
                {currentGuide.avoid.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500/40 mt-1.5 shrink-0"></div>
                    <div>
                      <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* DETAILED INTERACTIVE RECIPE MODAL */}
      {selectedRecipeModal && (
        <div className="fixed inset-0 bg-background-dark/90 backdrop-blur-xl z-[150] flex flex-col items-center p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-lg glass-card rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl space-y-5 p-6 my-auto animate-in fade-in zoom-in-95 duration-300">
            
            {/* Modal Header & Close */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  {selectedRecipeModal.category || 'Fitness Recipe'} • {selectedRecipeModal.prepTime}
                </span>
                <h2 className="text-xl font-black text-white mt-2 leading-tight">{selectedRecipeModal.title}</h2>
              </div>
              <button
                onClick={() => setSelectedRecipeModal(null)}
                className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white active:scale-90 transition-all border border-white/10"
              >
                <span className="material-icons-round text-base">close</span>
              </button>
            </div>

            {/* Serving Size Adjuster */}
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Serving Adjuster:</span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setServingScale(s); triggerHaptic('light'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      servingScale === s ? 'bg-primary text-black shadow-md shadow-primary/20 scale-105' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scaled Macro Cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase block">Calories</span>
                <span className="text-sm font-black text-primary">{Math.round(selectedRecipeModal.calories * servingScale)} kcal</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase block">Protein</span>
                <span className="text-sm font-black text-white">{Math.round(selectedRecipeModal.protein * servingScale)}g</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase block">Carbs</span>
                <span className="text-sm font-black text-white">{Math.round(selectedRecipeModal.carbs * servingScale)}g</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase block">Fats</span>
                <span className="text-sm font-black text-white">{Math.round(selectedRecipeModal.fats * servingScale)}g</span>
              </div>
            </div>

            {/* Ingredients Checklist */}
            <div className="space-y-2 text-left">
              <h4 className="text-xs font-black uppercase text-primary tracking-wider">Ingredients Checklist ({servingScale}x serving)</h4>
              <ul className="space-y-1.5 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                {selectedRecipeModal.ingredients.map((ing, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive Step-by-Step Cooking */}
            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-primary tracking-wider">Cooking Instructions</h4>
                <span className="text-[10px] font-bold text-slate-400">
                  {completedSteps.length} of {selectedRecipeModal.instructions.length} done
                </span>
              </div>
              <ol className="space-y-2">
                {selectedRecipeModal.instructions.map((step, i) => {
                  const isDone = completedSteps.includes(i);
                  return (
                    <li
                      key={i}
                      onClick={() => toggleStepCompleted(i)}
                      className={`text-xs p-3 rounded-2xl border transition-all cursor-pointer flex items-start space-x-2.5 ${
                        isDone 
                          ? 'bg-primary/10 border-primary/40 text-white/50 line-through' 
                          : 'bg-white/5 border-white/5 text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                        isDone ? 'bg-primary text-black' : 'bg-white/10 text-primary'
                      }`}>
                        {isDone ? '✓' : i + 1}
                      </span>
                      <span className="leading-relaxed flex-1">{step}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {selectedRecipeModal.aiTip && (
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl text-xs text-slate-300 italic flex items-start space-x-2 text-left">
                <span className="material-icons-round text-primary text-base not-italic mt-0.5">lightbulb</span>
                <div>
                  <span className="font-bold text-primary not-italic block">Chef Tip: </span>
                  {selectedRecipeModal.aiTip}
                </div>
              </div>
            )}

            {/* Log Action Button */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setSelectedRecipeModal(null)}
                className="flex-1 bg-white/5 border border-white/10 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider"
              >
                Close
              </button>
              {onAddManualEntry && (
                <button
                  onClick={() => {
                    handleLogRecipeToDiary(selectedRecipeModal);
                    setSelectedRecipeModal(null);
                  }}
                  className="flex-[2] bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  <span className="material-icons-round text-base">add_circle</span>
                  <span>Log Meal ({servingScale}x)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodGuide;
