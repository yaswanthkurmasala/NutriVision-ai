export interface Reminder {
  id: string;
  type: 'Meal' | 'Water' | 'Steps' | 'Workout';
  time: string;
  enabled: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  category?: 'streak' | 'nutrition' | 'hydration' | 'workout';
}

export interface CustomRecipe {
  title: string;
  prepTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  aiTip?: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Advanced';
  rating?: number;
  image?: string;
  isFavorite?: boolean;
}

export interface UserProfile {
  name: string;
  goal: 'Bulk' | 'Cut' | 'Maintain';
  dailyCalorieGoal: number;
  dailyStepGoal: number;
  currentSteps: number;
  workoutMinutesGoal: number;
  currentWorkoutMinutes: number;
  weight: number;
  targetWeight: number;
  bmi: number;
  bodyFat: number;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  dailyWaterGoal?: number;
  theme?: 'dark' | 'light';
  reminders?: Reminder[];
  streakDays?: number;
  lastLoggedDate?: string;
  achievements?: Achievement[];
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portionSize: string;
  timestamp: Date;
}

export interface FoodItemDetail {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portion: string;
  confidence?: number;
  category?: 'Protein' | 'Carbs' | 'Veggies/Fiber' | 'Fat/Sauce' | 'Beverage' | 'Snack';
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

export interface NutritionData {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portionDescription: string;
  items?: FoodItemDetail[];
  confidenceScore?: number;
  dishType?: string;
  healthScore?: number;
  hiddenCalorieWarning?: string;
  dietaryTags?: string[];
  ingredientsList?: string[];
  cookingMethod?: string;
  microNutrients?: {
    sodiumMg?: number;
    potassiumMg?: number;
    calciumMg?: number;
    ironMg?: number;
  };
}

export type View = 'home' | 'analytics' | 'diary' | 'recipes' | 'profile' | 'camera' | 'auth';