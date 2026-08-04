import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FoodEntry, UserProfile, NutritionData, View } from '../types';
import { getDailyInsights, DailyInsight, getWorkoutSuggestions, WorkoutPlan, parseVoiceInput, VoiceLogResult } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../services/haptic';

interface DashboardProps {
  user: UserProfile;
  entries: FoodEntry[];
  waterGlasses: number;
  setWaterGlasses: (val: number) => void;
  onUpdateUser: (updates: Partial<UserProfile>) => void;
  onAddManualEntry?: (data: NutritionData) => void;
  onViewChange?: (view: View) => void;
}

const parseEntryDate = (ts: any): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  entries, 
  waterGlasses, 
  setWaterGlasses, 
  onUpdateUser, 
  onAddManualEntry, 
  onViewChange 
}) => {
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const todayEntries = useMemo(() => {
    return entries.filter(e => {
      const d = parseEntryDate(e.timestamp);
      return d.toLocaleDateString('en-CA') === todayStr;
    });
  }, [entries, todayStr]);

  const consumed = useMemo(() => {
    return todayEntries.reduce((acc, entry) => acc + (Number(entry.calories) || 0), 0);
  }, [todayEntries]);

  const calorieGoal = user.dailyCalorieGoal || 2200;
  const isSurplus = consumed > calorieGoal;
  const isGoalReached = consumed >= calorieGoal * 0.9 && consumed <= calorieGoal;
  
  const [aiInsights, setAiInsights] = useState<DailyInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [showWorkouts, setShowWorkouts] = useState(false);
  const [chosenIntensity, setChosenIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Voice Log Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(null);

  const startVoiceRecognition = () => {
    triggerHaptic('medium');
    setShowVoiceModal(true);
    setVoiceResult(null);
    setVoiceText('');
    
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setVoiceText(transcriptText);
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      setIsListening(false);
    }
  };

  const handleProcessVoiceInput = async (textToProcess?: string) => {
    const queryText = textToProcess || voiceText;
    if (!queryText.trim()) return;
    
    setVoiceParsing(true);
    triggerHaptic('medium');
    try {
      const res = await parseVoiceInput(queryText, user);
      setVoiceResult(res);
      triggerHaptic('success');
    } catch (err) {
      console.error("Voice parse error:", err);
      triggerHaptic('error');
    } finally {
      setVoiceParsing(false);
    }
  };

  const handleApplyVoiceLog = () => {
    if (!voiceResult) return;
    triggerHaptic('success');
    if (voiceResult.type === 'meal' && voiceResult.nutrition && onAddManualEntry) {
      onAddManualEntry(voiceResult.nutrition);
    } else if (voiceResult.type === 'workout' && voiceResult.workoutMinutes) {
      onUpdateUser({ currentWorkoutMinutes: (user.currentWorkoutMinutes || 0) + voiceResult.workoutMinutes });
    }
    setShowVoiceModal(false);
    setVoiceResult(null);
    setVoiceText('');
  };
  
  // Workout Timer State
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - (seconds * 1000);
      }
      interval = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSeconds(elapsed);
        }
      }, 1000);
    } else {
      startTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopWorkout = () => {
    const minsEarned = Math.floor(seconds / 60);
    if (minsEarned > 0) {
      onUpdateUser({ currentWorkoutMinutes: (user.currentWorkoutMinutes || 0) + minsEarned });
    }
    setIsTimerActive(false);
    setSeconds(0);
  };

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const insights = await getDailyInsights(user, entries, waterGlasses);
      if (insights.length > 0) {
        setAiInsights(insights);
        setActiveInsightIndex(0);
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      const totalP = entries.reduce((acc, e) => acc + (e.protein || 0), 0);
      const stepGoal = user.dailyStepGoal || 10000;
      const stepPercent = Math.round(((user.currentSteps || 0) / stepGoal) * 100);
      
      const localInsights: DailyInsight[] = [
        {
          icon: 'local_fire_department',
          text: `Nutrition target: Logged ${totalP}g of Protein today out of your ${user.macros?.protein || 150}g goal. Keep it up!`,
          color: 'text-primary',
          category: 'Nutrition'
        },
        {
          icon: 'water_drop',
          text: waterGlasses < 8 
            ? `Hydration tracker: You've had ${waterGlasses}/12 glasses of water. Have another glass to stay sharp.`
            : `Great job! ${waterGlasses}/12 glasses of water logged today. Hydration levels are optimal.`,
          color: 'text-sky-400',
          category: 'Hydration'
        },
        {
          icon: 'directions_walk',
          text: stepPercent < 100 
            ? `Step progress: At ${stepPercent}% of your ${stepGoal.toLocaleString()} step goal. A 10-min walk will get you there!`
            : `Awesome job! Daily movement goal reached with ${user.currentSteps?.toLocaleString()} steps!`,
          color: 'text-amber-400',
          category: 'Activity'
        },
        {
          icon: 'psychology',
          text: `Pro Tip: Timing your protein and carbs around your workout boosts muscle recovery and energy levels.`,
          color: 'text-purple-400',
          category: 'Motivation'
        }
      ];
      setAiInsights(localInsights);
      setActiveInsightIndex(0);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const fetchWorkouts = async () => {
    setIsLoadingWorkouts(true);
    try {
      const plans = await getWorkoutSuggestions(user);
      setWorkoutPlans(plans);
    } catch (error) {
      console.error('Failed to fetch workout suggestions:', error);
      const baseGoal = user.goal || 'Maintain';
      const localWorkoutFallback: WorkoutPlan[] = baseGoal === 'Bulk' ? [
        {
          title: 'Hypertrophy Power Split',
          duration: '45 mins',
          intensity: 'High',
          exercises: [
            { name: 'Barbell Squats', sets: '4', reps: '8-10' },
            { name: 'Bench Press', sets: '4', reps: '8-10' },
            { name: 'Bent-Over Rows', sets: '3', reps: '10' },
            { name: 'Overhead Press', sets: '3', reps: '10' }
          ],
          aiTip: 'Prioritize progressive overload and rest 90 seconds between sets. Consume clean carbs post-session.'
        },
        {
          title: 'Upper-Body Mass Builder',
          duration: '40 mins',
          intensity: 'Medium',
          exercises: [
            { name: 'Incline Dumbbell Press', sets: '3', reps: '10-12' },
            { name: 'Pull-Ups / Lat Pulldowns', sets: '3', reps: 'Max' },
            { name: 'Lateral Raises', sets: '4', reps: '12-15' },
            { name: 'Dumbbell Curls', sets: '3', reps: '12' }
          ],
          aiTip: 'Focus on time-under-tension. Lower weights under control for maximum muscle engagement.'
        }
      ] : [
        {
          title: 'Full Body Conditioning & Core',
          duration: '35 mins',
          intensity: 'Medium',
          exercises: [
            { name: 'Goblet Squats', sets: '4', reps: '12' },
            { name: 'Push-Ups to Plank', sets: '3', reps: '12' },
            { name: 'Dumbbell Rows', sets: '3', reps: '12' },
            { name: 'Mountain Climbers', sets: '3', reps: '30s' }
          ],
          aiTip: 'Keep rest intervals under 45 seconds to burn calories while maintaining lean muscle.'
        }
      ];
      setWorkoutPlans(localWorkoutFallback);
    } finally {
      setIsLoadingWorkouts(false);
    }
  };

  useEffect(() => {
    if (aiInsights.length === 0) {
      fetchInsights();
    }
  }, [entries.length, waterGlasses]);

  useEffect(() => {
    if (aiInsights.length <= 1) return;
    const interval = setInterval(() => {
      setActiveInsightIndex(prev => (prev + 1) % aiInsights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [aiInsights]);

  const currentInsight = aiInsights[activeInsightIndex] || {
    icon: 'psychology',
    text: 'Analyzing your daily performance for personalized AI coaching...',
    color: 'text-primary',
    category: 'Motivation'
  };

  const stepGoal = user.dailyStepGoal || 10000;
  const workoutGoal = user.workoutMinutesGoal || 30;
  const currentSteps = user.currentSteps || 0;
  const currentWorkoutMinutes = user.currentWorkoutMinutes || 0;
  const stepProgress = stepGoal > 0 ? Math.min(100, (currentSteps / stepGoal) * 100) : 0;
  const workoutProgress = workoutGoal > 0 ? Math.min(100, (currentWorkoutMinutes / workoutGoal) * 100) : 0;

  const [animatedConsumed, setAnimatedConsumed] = useState(0);
  const [animatedSteps, setAnimatedSteps] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1200;
    const startConsumed = animatedConsumed;
    const startSteps = animatedSteps;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = (t: number) => t * (2 - t);
      const colorEased = easeOutQuad(progress);

      setAnimatedConsumed(startConsumed + (consumed - startConsumed) * colorEased);
      setAnimatedSteps(startSteps + (currentSteps - startSteps) * colorEased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [consumed, currentSteps]);

  const animatedProgressPercent = Math.min(100, (animatedConsumed / calorieGoal) * 100);
  const animatedRemaining = Math.max(0, calorieGoal - animatedConsumed);
  const animatedSurplus = animatedConsumed > calorieGoal ? animatedConsumed - calorieGoal : 0;
  const animatedStepProgress = stepGoal > 0 ? Math.min(100, (animatedSteps / stepGoal) * 100) : 0;

  const userWeight = user.weight || 70;
  const metValue = chosenIntensity === 'low' ? 3.5 : chosenIntensity === 'medium' ? 6.0 : 9.5;
  const estimatedCaloriesBurned = Math.round((metValue * 3.5 * userWeight * currentWorkoutMinutes) / 200);

  const totalMacros = useMemo(() => todayEntries.reduce((acc, e) => ({
    p: acc.p + (Number(e.protein) || 0),
    c: acc.c + (Number(e.carbs) || 0),
    f: acc.f + (Number(e.fats) || 0),
    fi: acc.fi + (Number(e.fiber) || 0),
  }), { p: 0, c: 0, f: 0, fi: 0 }), [todayEntries]);

  const mainSize = 160;
  const mainCenter = mainSize / 2;
  const mainRadius = 66;
  const mainCircumference = 2 * Math.PI * mainRadius;
  const mainOffset = mainCircumference - (animatedProgressPercent / 100) * mainCircumference;

  const MacroCard = ({ label, current, goal, colorHex, icon }: { label: string, current: number, goal: number, colorHex: string, icon: string }) => {
    const safeGoal = goal || 1;
    const safeCurrent = current || 0;
    const macroPercent = Math.min(100, (safeCurrent / safeGoal) * 100);
    const smallSize = 64;
    const smallCenter = smallSize / 2;
    const smallRadius = 25;
    const smallCircumference = 2 * Math.PI * smallRadius;
    const smallOffset = smallCircumference - (macroPercent / 100) * smallCircumference;

    return (
      <div className="glass-card rounded-2xl p-3.5 flex flex-col items-center border border-white/5 shadow-md hover:border-white/10 transition-all hover:bg-white/[0.04]">
        <div className="relative w-16 h-16 mb-1.5">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${smallSize} ${smallSize}`}>
            <circle className="text-white/[0.05]" cx={smallCenter} cy={smallCenter} fill="transparent" r={smallRadius} stroke="currentColor" strokeWidth="5" />
            <circle 
              cx={smallCenter} 
              cy={smallCenter} 
              fill="transparent" 
              r={smallRadius} 
              stroke={colorHex} 
              strokeDasharray={smallCircumference} 
              strokeDashoffset={smallOffset} 
              strokeLinecap="round" 
              strokeWidth="5" 
              style={{ transition: 'stroke-dashoffset 0.6s ease-out', filter: `drop-shadow(0 0 6px ${colorHex}55)` }} 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="material-icons-round text-xs text-white/50">{icon}</span>
            <span className="text-[10px] font-extrabold tracking-tight text-white">{Math.round(macroPercent)}%</span>
          </div>
        </div>
        <p className="text-xs font-extrabold text-white">{label}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
          {Math.round(current)}g <span className="opacity-50">/ {goal}g</span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 font-sans animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      {/* 1. Executive Header */}
      <header className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-extrabold text-primary uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <span>🔥</span>
              <span>{user.streakDays || 1}d Streak</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Welcome back, {user.name.split(' ')[0]} 👋
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startVoiceRecognition}
            title="Voice Log Meal or Workout"
            className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-black active:scale-90 transition-all shadow-md cursor-pointer"
          >
            <span className="material-icons-round text-xl animate-pulse">mic</span>
          </button>
          <div 
            onClick={() => onViewChange?.('profile')}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 p-[1.5px] shadow-lg cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="w-full h-full rounded-[0.9rem] bg-background-dark overflow-hidden flex items-center justify-center">
              <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* Voice Log Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-sm p-6 rounded-[2.5rem] border border-primary/30 space-y-4 text-center relative overflow-hidden bg-[#0d160e]">
            <button
              onClick={() => setShowVoiceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5 cursor-pointer"
            >
              <span className="material-icons-round text-lg">close</span>
            </button>

            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto text-primary animate-bounce shadow-lg shadow-primary/20">
              <span className="material-icons-round text-2xl">mic</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">AI Voice Assistant Log</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isListening ? "Listening... Speak your meal or workout!" : "Speak or type naturally (e.g., 'Ate 2 eggs & toast')."}
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="e.g. 'I ate a grilled chicken salad with avocado' or 'Ran for 30 minutes'"
                className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none font-medium"
              />

              {!voiceResult && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startVoiceRecognition()}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-icons-round text-sm">settings_voice</span>
                    <span>{isListening ? "Listening..." : "Record"}</span>
                  </button>
                  <button
                    onClick={() => handleProcessVoiceInput()}
                    disabled={voiceParsing || !voiceText.trim()}
                    className="flex-1 bg-primary text-black py-3 rounded-xl text-xs font-extrabold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-primary/20"
                  >
                    {voiceParsing ? "Parsing..." : "Parse AI"}
                  </button>
                </div>
              )}

              {voiceResult && (
                <div className="bg-white/5 border border-primary/30 p-4 rounded-2xl text-left space-y-3 animate-in zoom-in-95">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold uppercase text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                      {voiceResult.type === 'meal' ? 'Meal Logged' : 'Workout Logged'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium">{voiceResult.summary}</p>
                  
                  {voiceResult.type === 'meal' && voiceResult.nutrition && (
                    <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-white/10">
                      <div className="text-[10px] font-extrabold text-primary">{voiceResult.nutrition.calories} kcal</div>
                      <div className="text-[10px] font-extrabold text-white">{voiceResult.nutrition.protein}g P</div>
                      <div className="text-[10px] font-extrabold text-white">{voiceResult.nutrition.carbs}g C</div>
                      <div className="text-[10px] font-extrabold text-white">{voiceResult.nutrition.fats}g F</div>
                    </div>
                  )}

                  <button
                    onClick={handleApplyVoiceLog}
                    className="w-full bg-primary text-black py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    Confirm & Apply Entry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. AI Daily Insight Hero Banner */}
      <section>
        <div className="glass-card rounded-3xl p-4 border border-primary/20 relative overflow-hidden bg-gradient-to-r from-primary/10 via-emerald-500/5 to-transparent shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-2xl bg-black/40 ${currentInsight.color} shrink-0 border border-white/5`}>
              <span className="material-icons-round text-xl animate-pulse">{currentInsight.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h3 className="text-[9px] font-extrabold uppercase tracking-widest text-primary">{currentInsight.category} AI Insight</h3>
                <button 
                  onClick={fetchInsights}
                  disabled={isLoadingInsights}
                  className="text-slate-400 hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span className={`material-icons-round text-sm ${isLoadingInsights ? 'animate-spin' : ''}`}>refresh</span>
                </button>
              </div>
              <p className="text-xs font-medium leading-relaxed text-slate-200 italic line-clamp-2">
                "{currentInsight.text}"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Quick Feature Launchpad */}
      <section className="grid grid-cols-4 gap-2.5">
        <button
          onClick={() => { triggerHaptic('light'); onViewChange?.('camera'); }}
          className="glass-card p-3.5 rounded-2xl border border-white/5 hover:border-primary/40 flex flex-col items-center justify-center text-center transition-all group active:scale-95 cursor-pointer bg-gradient-to-b from-primary/10 to-transparent"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md">
            <span className="material-icons-round text-xl">qr_code_scanner</span>
          </div>
          <span className="text-[10px] font-extrabold text-white">Scan Dish</span>
        </button>

        <button
          onClick={() => { triggerHaptic('light'); onViewChange?.('recipes'); }}
          className="glass-card p-3.5 rounded-2xl border border-white/5 hover:border-emerald-400/40 flex flex-col items-center justify-center text-center transition-all group active:scale-95 cursor-pointer bg-gradient-to-b from-emerald-400/10 to-transparent"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md">
            <span className="material-icons-round text-xl">soup_kitchen</span>
          </div>
          <span className="text-[10px] font-extrabold text-white">AI Chef</span>
        </button>

        <button
          onClick={() => startVoiceRecognition()}
          className="glass-card p-3.5 rounded-2xl border border-white/5 hover:border-sky-400/40 flex flex-col items-center justify-center text-center transition-all group active:scale-95 cursor-pointer bg-gradient-to-b from-sky-400/10 to-transparent"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-400/20 text-sky-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md">
            <span className="material-icons-round text-xl">mic</span>
          </div>
          <span className="text-[10px] font-extrabold text-white">Voice Log</span>
        </button>

        <button
          onClick={() => { triggerHaptic('light'); onViewChange?.('analytics'); }}
          className="glass-card p-3.5 rounded-2xl border border-white/5 hover:border-purple-400/40 flex flex-col items-center justify-center text-center transition-all group active:scale-95 cursor-pointer bg-gradient-to-b from-purple-400/10 to-transparent"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-400/20 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-md">
            <span className="material-icons-round text-xl">analytics</span>
          </div>
          <span className="text-[10px] font-extrabold text-white">Analytics</span>
        </button>
      </section>

      {/* 4. Executive Calorie Gauge Hero Card */}
      <section className="glass-card rounded-[2.5rem] p-5 border border-white/10 shadow-2xl bg-gradient-to-br from-[#122314]/80 via-[#0c180e]/90 to-[#070c07]/95 relative overflow-hidden backdrop-blur-xl">
        {isGoalReached && (
          <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none"></div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          {/* Left Column: Compact Gauge Ring */}
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${mainSize} ${mainSize}`}>
              <circle className="text-white/5" cx={mainCenter} cy={mainCenter} fill="transparent" r={mainRadius} stroke="currentColor" strokeWidth="10" />
              <circle 
                className={isSurplus ? "text-red-500" : isGoalReached ? "text-primary" : "text-primary/80"} 
                cx={mainCenter} 
                cy={mainCenter} 
                fill="transparent" 
                r={mainRadius} 
                stroke="currentColor" 
                strokeDasharray={mainCircumference} 
                strokeDashoffset={mainOffset} 
                strokeLinecap="round" 
                strokeWidth="10" 
                style={{ 
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', 
                  filter: `drop-shadow(0 0 8px ${isSurplus ? 'rgba(239,68,68,0.5)' : 'rgba(19,236,55,0.5)'})` 
                }} 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              {isSurplus ? (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-red-500 tabular-nums">+{Math.round(animatedSurplus || 0).toLocaleString()}</span>
                  <span className="text-[8px] text-red-400 font-extrabold uppercase tracking-widest mt-0.5">Surplus</span>
                </>
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tighter">{Math.round(animatedRemaining || 0).toLocaleString()}</span>
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">kcal left</span>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Metrics Breakdown & Prominent Action Button */}
          <div className="flex-1 w-full space-y-3.5 text-left">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-icons-round text-amber-400 text-xs">flag</span>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Daily Goal</p>
                </div>
                <p className="text-base font-black text-white">{Math.round(calorieGoal || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">kcal</span></p>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-icons-round text-primary text-xs">restaurant</span>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Consumed</p>
                </div>
                <p className="text-base font-black text-primary">{Math.round(animatedConsumed || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">kcal</span></p>
              </div>
            </div>

            {/* Prominent Full-Width + Log Meal Button */}
            <button 
              onClick={() => { triggerHaptic('medium'); onViewChange?.('diary'); }}
              className="w-full bg-gradient-to-r from-primary via-emerald-400 to-primary hover:brightness-110 text-black font-black text-xs uppercase tracking-wider py-3 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-icons-round text-base">restaurant</span>
              <span>+ Log Today's Meal</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Macro Breakdown Grid */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Macro Breakdown</h2>
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Daily Progress</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroCard label="Protein" current={totalMacros.p} goal={user.macros?.protein || 150} colorHex="#13EC37" icon="fitness_center" />
          <MacroCard label="Carbs" current={totalMacros.c} goal={user.macros?.carbs || 220} colorHex="#F59E0B" icon="grain" />
          <MacroCard label="Fats" current={totalMacros.f} goal={user.macros?.fats || 70} colorHex="#06B6D4" icon="opacity" />
          <MacroCard label="Fiber" current={totalMacros.fi} goal={user.macros?.fiber || 30} colorHex="#A855F7" icon="eco" />
        </div>
      </section>

      {/* 6. Activity & Hydration Dual Tile */}
      <section className="grid grid-cols-2 gap-3">
        {/* Steps Tile */}
        <div className="glass-card rounded-3xl p-4 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-xl text-emerald-400"><span className="material-icons-round text-base">directions_walk</span></div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Steps</span>
            </div>
            <button 
              onClick={() => {
                triggerHaptic('medium');
                onUpdateUser({ currentSteps: (user.currentSteps || 0) + 1000 });
              }}
              title="Add 1,000 steps"
              className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-90 transition-all cursor-pointer"
            >
              +1k
            </button>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-extrabold text-white tracking-tight">{Math.round(animatedSteps || 0).toLocaleString()}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/ {Math.round(stepGoal / 1000)}k</p>
            </div>
            <div className="mt-2.5 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${animatedStepProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Hydration Tile */}
        <div className="glass-card rounded-3xl p-4 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-500/10 rounded-xl text-sky-400"><span className="material-icons-round text-base">water_drop</span></div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Hydration</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xl font-extrabold text-white tracking-tight">{waterGlasses} <span className="text-[9px] font-bold text-slate-400 uppercase">/ 12</span></p>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setWaterGlasses(waterGlasses + 1);
                }} 
                className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-sm"
              >
                <span className="material-icons-round text-sm">add</span>
              </button>
            </div>
            <div className="mt-2.5 flex gap-[2px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i < waterGlasses ? 'bg-sky-400' : 'bg-white/5'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Fitness Hub & Workout Tracker */}
      <section className="space-y-3 pt-2 border-t border-white/5">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Fitness Hub</h2>
          {isTimerActive && (
            <div className="flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-extrabold text-purple-400 uppercase tracking-widest">Session Active</span>
            </div>
          )}
        </div>
        
        <div className="glass-card rounded-[2.5rem] p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isTimerActive ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/30 animate-pulse' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                <span className="material-icons-round text-xl">fitness_center</span>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Workout Duration</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-white">{Math.round(currentWorkoutMinutes || 0)}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">/ {Math.round(workoutGoal || 0)} mins</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isTimerActive ? (
                <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10">
                  <div className="px-3">
                    <p className="text-sm font-extrabold tabular-nums text-white">{formatTime(seconds)}</p>
                  </div>
                  <button 
                    onClick={handleStopWorkout}
                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg font-extrabold uppercase tracking-wider text-[9px] active:scale-95 transition-all cursor-pointer"
                  >
                    Finish
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setIsTimerActive(true)}
                    className="bg-purple-500 text-black px-3.5 py-2 rounded-xl font-extrabold uppercase tracking-wider text-[10px] shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-icons-round text-sm">play_arrow</span>
                    <span>Start</span>
                  </button>
                  <button 
                    onClick={() => onUpdateUser({ currentWorkoutMinutes: (user.currentWorkoutMinutes || 0) + 5 })}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  >
                    <span className="material-icons-round text-sm">add</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px]">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider">Workout Goal Progress</span>
              <span className="font-extrabold text-purple-400">{Math.round(workoutProgress || 0)}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500" 
                style={{ width: `${workoutProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Calorie Burn Estimator Section */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-icons-round text-orange-400 text-base">local_fire_department</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Burn Estimator</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                {estimatedCaloriesBurned} kcal burned
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setChosenIntensity(level);
                  }}
                  className={`py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    chosenIntensity === level
                      ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Workout Plans Toggle */}
        <div className="flex justify-between items-center pt-2 px-1">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">AI Workout Plans</h3>
          <button 
            onClick={() => { 
              triggerHaptic('light');
              setShowWorkouts(!showWorkouts); 
              if (!showWorkouts && workoutPlans.length === 0) fetchWorkouts(); 
            }}
            className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:brightness-110"
          >
            <span>{showWorkouts ? 'Hide Plans' : 'Show Plans'}</span>
            <span className="material-icons-round text-sm">{showWorkouts ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
        
        {showWorkouts && (
          <div className="space-y-3 pt-1">
            {isLoadingWorkouts ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Generating custom workout...</p>
              </div>
            ) : (
              workoutPlans.map((plan, i) => (
                <div key={i} className="glass-card rounded-3xl p-5 border border-white/5 space-y-3 relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-extrabold text-white mb-1">{plan.title}</h3>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="material-icons-round text-xs mr-1 text-slate-400">schedule</span> {plan.duration}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${
                          plan.intensity === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          plan.intensity === 'Medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {plan.intensity}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {plan.exercises.map((ex, j) => (
                      <div key={j} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-xs">
                        <span className="font-medium text-slate-200">{ex.name}</span>
                        <span className="font-bold text-slate-400 text-[10px] uppercase">{ex.sets} × {ex.reps}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-2.5 flex items-start gap-2">
                    <span className="material-icons-round text-primary text-xs mt-0.5">auto_awesome</span>
                    <p className="text-[10px] font-medium text-slate-300 italic leading-relaxed">"{plan.aiTip}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;