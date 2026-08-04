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

export interface NutritionData {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portionDescription: string;
}

export type View = 'home' | 'analytics' | 'diary' | 'recipes' | 'profile' | 'camera' | 'auth';