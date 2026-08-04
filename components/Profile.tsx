import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { UserProfile, Reminder } from '../types';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { suggestReminders } from '../services/geminiService';
import { triggerHaptic } from '../services/haptic';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onResetData: () => Promise<boolean>;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Tigger',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Spooky',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Cookie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onResetData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [isEditingTargetWeight, setIsEditingTargetWeight] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [tempName, setTempName] = useState(user.name);
  const [tempBio, setTempBio] = useState(user.bio || '');
  const [tempLocation, setTempLocation] = useState(user.location || '');
  const [tempCalories, setTempCalories] = useState(user.dailyCalorieGoal);
  const [tempSteps, setTempSteps] = useState(user.dailyStepGoal);
  const [tempWorkout, setTempWorkout] = useState(user.workoutMinutesGoal || 0);
  const [tempWeight, setTempWeight] = useState(user.weight || 0);
  const [tempTargetWeight, setTempTargetWeight] = useState(user.targetWeight || 0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIncomplete = !user.dailyCalorieGoal || !user.dailyStepGoal || !user.weight || !user.targetWeight;

  const formatTimeAMPM = (timeStr: string) => {
    if (!timeStr) return '09:00 AM';
    let t = timeStr.trim();
    if (t.includes('AM') || t.includes('PM')) return t;
    const parts = t.split(':');
    if (parts.length < 2) return t;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return t;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${strHours}:${minutes} ${ampm}`;
  };

  const to24Hour = (timeStr: string) => {
    if (!timeStr) return '09:00';
    let t = timeStr.trim();
    if (!t.includes('AM') && !t.includes('PM')) return t;
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return t;
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  };

  const goals = [
    { id: 'Cut', icon: 'trending_down', label: 'Lose Weight', desc: 'Calorie deficit' },
    { id: 'Maintain', icon: 'trending_flat', label: 'Stay Fit', desc: 'Equal intake' },
    { id: 'Bulk', icon: 'trending_up', label: 'Build Muscle', desc: 'Calorie surplus' },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file (PNG, JPG, etc.)');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError('Image is too large. Please select a file under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ avatarUrl: reader.result as string });
        setIsModalOpen(false);
      };
      reader.onerror = () => {
        setUploadError('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPreset = (url: string) => {
    setUploadError(null);
    onUpdate({ avatarUrl: url });
    setIsModalOpen(false);
  };

  const handleSaveName = () => {
    onUpdate({ name: tempName });
    setIsEditingName(false);
  };

  const handleSaveBio = () => {
    onUpdate({ bio: tempBio });
    setIsEditingBio(false);
  };

  const handleSaveLocation = () => {
    onUpdate({ location: tempLocation });
    setIsEditingLocation(false);
  };

  const handleSaveCalories = () => {
    onUpdate({ dailyCalorieGoal: tempCalories });
    setIsEditingCalories(false);
  };

  const handleSaveSteps = () => {
    onUpdate({ dailyStepGoal: tempSteps });
    setIsEditingSteps(false);
  };

  const handleSaveWorkout = () => {
    onUpdate({ workoutMinutesGoal: tempWorkout });
    setIsEditingWorkout(false);
  };

  const handleSaveWeight = () => {
    onUpdate({ weight: tempWeight });
    setIsEditingWeight(false);
  };

  const handleSaveTargetWeight = () => {
    onUpdate({ targetWeight: tempTargetWeight });
    setIsEditingTargetWeight(false);
  };

  const toggleReminder = (id: string) => {
    const updated = (user.reminders || []).map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    onUpdate({ reminders: updated });
  };

  const addReminder = (type: Reminder['type']) => {
    const newRem: Reminder = { id: `rem-${Date.now()}`, type, time: '09:00', enabled: true };
    onUpdate({ reminders: [...(user.reminders || []), newRem] });
  };

  const deleteReminder = (id: string) => {
    onUpdate({ reminders: (user.reminders || []).filter(r => r.id !== id) });
  };

  const updateReminderTime = (id: string, time: string) => {
    const updated = (user.reminders || []).map(r => r.id === id ? { ...r, time } : r);
    onUpdate({ reminders: updated });
  };

  const generatePdfReport = async () => {
    setIsGeneratingPdf(true);
    triggerHaptic('medium');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      const primaryColor = [19, 236, 55];
      const secondaryColor = [100, 100, 100];
      const darkColor = [20, 20, 20];

      const sectionHeader = (title: string, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(title.toUpperCase(), 20, y);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, y + 2, 190, y + 2);
      };

      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, 210, 42, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('NUTRIVISION AI', 20, 24);
      
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('WEEKLY HEALTH & NUTRITION INTELLIGENCE SUMMARY', 20, 32);
      
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const reportId = `NV-RPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      doc.text(`REPORT ID: ${reportId}`, 145, 18);
      doc.text(`GENERATED: ${timestamp}`, 145, 24);
      doc.text(`PLAN: PREMIUM UNLOCKED`, 145, 30);

      sectionHeader('User Profile & Objectives', 55);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Personal Identity', 20, 68);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Name: ${user.name}`, 20, 75);
      doc.text(`Location: ${user.location || 'Not Specified'}`, 20, 81);
      doc.text(`Active Goal: ${user.goal === 'Cut' ? 'Lose Weight (Cut)' : user.goal === 'Bulk' ? 'Build Muscle (Bulk)' : 'Stay Fit (Maintain)'}`, 20, 87);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Body Mass Objectives', 110, 68);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Current Weight: ${user.weight || 0} kg`, 110, 75);
      doc.text(`Target Goal Weight: ${user.targetWeight || 0} kg`, 110, 81);

      sectionHeader('Daily Nutrition Targets', 102);
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 110, 170, 32, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Nutritional Category', 25, 117);
      doc.text('Configured Target', 95, 117);
      doc.text('Projected Weekly Intake', 142, 117);
      doc.line(20, 120, 190, 120);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      
      doc.text('Energy Target (Calories)', 25, 126);
      doc.text(`${user.dailyCalorieGoal || 0} kcal / day`, 95, 126);
      doc.text(`${((user.dailyCalorieGoal || 0) * 7).toLocaleString()} kcal`, 142, 126);

      const carbsVal = user.macros?.carbs || Math.round((user.dailyCalorieGoal || 2000) * 0.45 / 4);
      doc.text('Carbohydrates Goal', 25, 132);
      doc.text(`${carbsVal}g / day`, 95, 132);
      doc.text(`${carbsVal * 7}g / week`, 142, 132);

      const proteinVal = user.macros?.protein || Math.round((user.dailyCalorieGoal || 2000) * 0.30 / 4);
      doc.text('Protein Goal', 25, 138);
      doc.text(`${proteinVal}g / day`, 95, 138);
      doc.text(`${proteinVal * 7}g / week`, 142, 138);

      sectionHeader('Physical Activity & Performance Standards', 152);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Daily Target Metric', 25, 165);
      doc.text('Target Goal', 95, 165);
      doc.text('Weekly Accumulation', 142, 165);
      doc.line(20, 168, 190, 168);

      doc.setFont('helvetica', 'normal');
      doc.text('Daily Cardiovascular Step Goal', 25, 174);
      doc.text(`${(user.dailyStepGoal || 0).toLocaleString()} steps`, 95, 174);
      doc.text(`${((user.dailyStepGoal || 0) * 7).toLocaleString()} steps`, 142, 174);

      doc.text('Daily Workout Duration Goal', 25, 180);
      doc.text(`${user.workoutMinutesGoal || 0} minutes`, 95, 180);
      doc.text(`${(user.workoutMinutesGoal || 0) * 7} minutes`, 142, 180);

      doc.text('Minimum Water Intake Guideline', 25, 186);
      doc.text('8 glasses / day', 95, 186);
      doc.text('56 glasses / week', 142, 186);

      sectionHeader('Intelligent Analytics Diagnosis', 200);
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.rect(20, 208, 170, 48, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 118, 110);
      doc.text('AI Smart Recommendations', 25, 216);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      let p1 = '• Optimal energy balance is achieved by staying within your daily calorie tier.';
      let p2 = '• Sustain fitness momentum by keeping physical steps above 10K consistently.';
      let p3 = '• High protein intake of ~1.8g to 2.2g per kg is advised for body composition goals.';

      doc.text(p1, 25, 224);
      doc.text(p2, 25, 231);
      doc.text(p3, 25, 238);

      doc.setDrawColor(241, 245, 249);
      doc.line(20, 268, 190, 268);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('PREPARED BY NUTRIVISION AI ENGINE', 20, 276);

      doc.save(`NutriVision_Summary_${user.name.replace(/\s+/g, '_')}.pdf`);
      triggerHaptic('success');
    } catch (err) {
      console.error(err);
      triggerHaptic('error');
      alert('Could not compile PDF report. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleResetSubmit = async () => {
    setIsResetting(true);
    triggerHaptic('heavy');
    const success = await onResetData();
    setIsResetting(false);
    if (success) {
      setResetSuccess(true);
      triggerHaptic('success');
      setTimeout(() => {
        setResetSuccess(false);
        setIsResetModalOpen(false);
      }, 1500);
    } else {
      triggerHaptic('error');
      alert("Failed to reset data.");
    }
  };

  const handleSmartSuggest = async () => {
    setIsSuggesting(true);
    try {
      const suggestions = await suggestReminders(user);
      const newReminders: Reminder[] = suggestions.map((s, i) => ({
        id: `rem-ai-${Date.now()}-${i}`,
        type: s.type as any,
        time: s.time as string,
        enabled: true
      }));
      onUpdate({ reminders: [...(user.reminders || []), ...newReminders] });
    } catch (error) {
      console.error('Failed to suggest reminders:', error);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans pb-6">
      
      {/* 1. Hero Identity Card */}
      <section className="glass-card rounded-[2.5rem] p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-surface-dark border-2 border-primary/40 p-1 shadow-xl overflow-hidden relative">
              <img 
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                alt="Profile" 
                className="w-full h-full rounded-[1.2rem] bg-black/40 object-cover" 
              />
              <button 
                onClick={() => setIsModalOpen(true)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-primary font-bold text-xs gap-1 cursor-pointer"
              >
                <span className="material-icons-round text-lg">camera_alt</span>
                <span>Change</span>
              </button>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="sm:hidden absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-primary text-black rounded-xl flex items-center justify-center shadow-lg border-2 border-background-dark active:scale-90 transition-transform cursor-pointer"
            >
              <span className="material-icons-round text-base">edit</span>
            </button>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
            {/* Editable Name */}
            <div>
              {isEditingName ? (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <input 
                    type="text" 
                    value={tempName} 
                    autoFocus 
                    onChange={(e) => setTempName(e.target.value)} 
                    className="bg-white/10 border border-primary/40 rounded-xl py-1.5 px-3 text-xl font-extrabold text-white outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                  <button onClick={handleSaveName} className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer">
                    <span className="material-icons-round text-lg">check</span>
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 group cursor-pointer" onClick={() => { setTempName(user.name); setIsEditingName(true); }}>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white group-hover:text-primary transition-colors">
                    {user.name}
                  </h1>
                  <span className="material-icons-round text-sm text-slate-500 group-hover:text-primary transition-colors">edit</span>
                </div>
              )}
            </div>

            {/* Editable Location */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-400">
              <span className="material-icons-round text-sm text-primary">location_on</span>
              {isEditingLocation ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={tempLocation} 
                    autoFocus 
                    placeholder="Your location"
                    onChange={(e) => setTempLocation(e.target.value)} 
                    className="bg-white/10 border border-primary/30 rounded-lg py-1 px-2.5 text-xs font-bold text-white outline-none" 
                  />
                  <button onClick={handleSaveLocation} className="w-6 h-6 rounded-lg bg-primary text-black flex items-center justify-center shrink-0 cursor-pointer">
                    <span className="material-icons-round text-xs">check</span>
                  </button>
                </div>
              ) : (
                <span 
                  onClick={() => { setTempLocation(user.location || ''); setIsEditingLocation(true); }}
                  className="text-xs font-bold uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
                >
                  {user.location || 'Add location'}
                </span>
              )}
            </div>

            {/* Editable Bio */}
            <div>
              {isEditingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea 
                    value={tempBio} 
                    autoFocus 
                    placeholder="Write a short bio..."
                    onChange={(e) => setTempBio(e.target.value)} 
                    className="bg-white/10 border border-primary/30 rounded-xl p-2.5 text-xs font-medium text-white outline-none h-16 resize-none" 
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditingBio(false)} className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-400 text-[10px] font-bold uppercase cursor-pointer">Cancel</button>
                    <button onClick={handleSaveBio} className="px-2.5 py-1 rounded-lg bg-primary text-black text-[10px] font-bold uppercase cursor-pointer">Save</button>
                  </div>
                </div>
              ) : (
                <p 
                  onClick={() => { setTempBio(user.bio || ''); setIsEditingBio(true); }}
                  className="text-xs text-slate-300/80 font-medium italic leading-relaxed cursor-pointer hover:text-white transition-colors"
                >
                  {user.bio || '"Add a short bio to customize your profile..."'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/5 text-center">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Streak</p>
            <p className="text-sm font-extrabold text-primary mt-0.5">🔥 {user.streakDays || 1}d</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Weight</p>
            <p className="text-sm font-extrabold text-white mt-0.5">{user.weight || 0} kg</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Target</p>
            <p className="text-sm font-extrabold text-emerald-400 mt-0.5">{user.targetWeight || 0} kg</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Goal</p>
            <p className="text-sm font-extrabold text-primary mt-0.5">{user.goal || 'Maintain'}</p>
          </div>
        </div>
      </section>

      {/* Completion Prompt */}
      {isIncomplete && (
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <span className="material-icons-round text-xl">priority_high</span>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-extrabold text-primary uppercase tracking-wider">Setup Incomplete</p>
            <p className="text-[10px] text-white/70 font-medium leading-relaxed mt-0.5">
              Set your target weight and step goals below to unlock accurate AI recommendations.
            </p>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-extrabold tracking-tight text-white">Select Avatar</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer">
                <span className="material-icons-round text-lg">close</span>
              </button>
            </div>

            <div className="space-y-5">
              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                  <span className="material-icons-round text-red-400 text-sm">error_outline</span>
                  <p className="text-[10px] font-bold text-red-400">{uploadError}</p>
                </div>
              )}

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center p-3.5 bg-primary/10 border border-primary/30 rounded-2xl cursor-pointer hover:bg-primary/20 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center mr-3 shrink-0">
                  <span className="material-icons-round text-lg">upload</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-primary uppercase tracking-wider">Upload Custom Photo</p>
                  <p className="text-[10px] text-slate-400">PNG, JPG under 5MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </button>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Avatar Presets</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {PRESET_AVATARS.map((url, i) => (
                    <button key={i} onClick={() => selectPreset(url)} className={`aspect-square rounded-2xl bg-white/5 border-2 transition-all cursor-pointer ${user.avatarUrl === url ? 'border-primary' : 'border-transparent hover:border-white/20'}`}>
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full p-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Fitness Goal Section */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 px-1">Active Fitness Objective</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {goals.map((g) => {
            const isSelected = user.goal === g.id;
            return (
              <button 
                key={g.id} 
                onClick={() => {
                  triggerHaptic('medium');
                  onUpdate({ goal: g.id as any });
                }} 
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center relative overflow-hidden ${
                  isSelected 
                    ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10 text-white' 
                    : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${isSelected ? 'bg-primary text-black' : 'bg-white/5 text-slate-400'}`}>
                  <span className="material-icons-round text-lg">{g.icon}</span>
                </div>
                <p className="text-xs font-extrabold leading-tight">{g.label}</p>
                <p className="text-[9px] font-medium text-slate-400 mt-0.5">{g.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Daily Targets & Body Metrics Grid */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 px-1">Daily Targets & Body Metrics</h2>
        <div className="glass-card rounded-[2.5rem] p-5 border border-white/5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Calories Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 cursor-pointer group hover:border-primary/30 transition-all" onClick={() => { if (!isEditingCalories) { setTempCalories(user.dailyCalorieGoal); setIsEditingCalories(true); } }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Calories</span>
                <span className="material-icons-round text-primary text-base">local_fire_department</span>
              </div>
              {isEditingCalories ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input type="number" value={tempCalories} autoFocus onChange={(e) => setTempCalories(Number(e.target.value))} className="bg-white/10 border border-primary/40 rounded-lg py-1 px-2 text-base font-extrabold w-20 text-white outline-none" />
                  <button onClick={handleSaveCalories} className="w-7 h-7 rounded-lg bg-primary text-black flex items-center justify-center shrink-0 cursor-pointer"><span className="material-icons-round text-xs">check</span></button>
                </div>
              ) : (
                <p className="text-lg font-extrabold text-white group-hover:text-primary transition-colors">{user.dailyCalorieGoal || 0} <span className="text-xs font-bold text-slate-400">kcal</span></p>
              )}
            </div>

            {/* Steps Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 cursor-pointer group hover:border-primary/30 transition-all" onClick={() => { if (!isEditingSteps) { setTempSteps(user.dailyStepGoal); setIsEditingSteps(true); } }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step Goal</span>
                <span className="material-icons-round text-primary text-base">directions_walk</span>
              </div>
              {isEditingSteps ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input type="number" value={tempSteps} autoFocus onChange={(e) => setTempSteps(Number(e.target.value))} className="bg-white/10 border border-primary/40 rounded-lg py-1 px-2 text-base font-extrabold w-20 text-white outline-none" />
                  <button onClick={handleSaveSteps} className="w-7 h-7 rounded-lg bg-primary text-black flex items-center justify-center shrink-0 cursor-pointer"><span className="material-icons-round text-xs">check</span></button>
                </div>
              ) : (
                <p className="text-lg font-extrabold text-white group-hover:text-primary transition-colors">{(user.dailyStepGoal || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">steps</span></p>
              )}
            </div>

            {/* Workout Goal Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 cursor-pointer group hover:border-primary/30 transition-all" onClick={() => { if (!isEditingWorkout) { setTempWorkout(user.workoutMinutesGoal || 0); setIsEditingWorkout(true); } }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workout</span>
                <span className="material-icons-round text-purple-400 text-base">fitness_center</span>
              </div>
              {isEditingWorkout ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input type="number" value={tempWorkout} autoFocus onChange={(e) => setTempWorkout(Number(e.target.value))} className="bg-white/10 border border-primary/40 rounded-lg py-1 px-2 text-base font-extrabold w-20 text-white outline-none" />
                  <button onClick={handleSaveWorkout} className="w-7 h-7 rounded-lg bg-primary text-black flex items-center justify-center shrink-0 cursor-pointer"><span className="material-icons-round text-xs">check</span></button>
                </div>
              ) : (
                <p className="text-lg font-extrabold text-white group-hover:text-primary transition-colors">{user.workoutMinutesGoal || 0} <span className="text-xs font-bold text-slate-400">mins</span></p>
              )}
            </div>

            {/* Target Weight Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 cursor-pointer group hover:border-primary/30 transition-all" onClick={() => { if (!isEditingTargetWeight) { setTempTargetWeight(user.targetWeight || 0); setIsEditingTargetWeight(true); } }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Weight</span>
                <span className="material-icons-round text-emerald-400 text-base">flag</span>
              </div>
              {isEditingTargetWeight ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input type="number" step="0.1" value={tempTargetWeight} autoFocus onChange={(e) => setTempTargetWeight(Number(e.target.value))} className="bg-white/10 border border-primary/40 rounded-lg py-1 px-2 text-base font-extrabold w-20 text-white outline-none" />
                  <button onClick={handleSaveTargetWeight} className="w-7 h-7 rounded-lg bg-primary text-black flex items-center justify-center shrink-0 cursor-pointer"><span className="material-icons-round text-xs">check</span></button>
                </div>
              ) : (
                <p className="text-lg font-extrabold text-emerald-400 group-hover:text-primary transition-colors">{user.targetWeight || 0} <span className="text-xs font-bold text-slate-400">kg</span></p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Smart Alerts & Notifications Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(19,236,55,0.8)]"></span>
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Smart Alerts & Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                const testTime = new Date(Date.now() + 60000);
                const testH = testTime.getHours().toString().padStart(2, '0');
                const testM = testTime.getMinutes().toString().padStart(2, '0');
                const newRem: Reminder = { id: `rem-test-${Date.now()}`, type: 'Water', time: `${testH}:${testM}`, enabled: true };
                onUpdate({ reminders: [...(user.reminders || []), newRem] });
                
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
                  Notification.requestPermission();
                }
              }}
              className="flex items-center gap-1.5 text-[10px] font-extrabold text-teal-400 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/30 px-3 py-1 rounded-full hover:bg-teal-500/20 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-icons-round text-xs">science</span>
              <span>Test Alert</span>
            </button>
            <button 
              type="button"
              onClick={handleSmartSuggest}
              disabled={isSuggesting}
              className="flex items-center gap-1.5 text-[10px] font-extrabold text-primary bg-gradient-to-r from-primary/20 to-emerald-400/20 border border-primary/40 px-3 py-1 rounded-full hover:brightness-125 disabled:opacity-50 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(19,236,55,0.2)]"
            >
              <span className="material-icons-round text-xs">{isSuggesting ? 'sync' : 'auto_awesome'}</span>
              <span>{isSuggesting ? 'Analyzing...' : 'AI Suggest'}</span>
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-5 border border-white/10 space-y-4 bg-gradient-to-b from-[#142316]/60 via-[#0d170e]/80 to-[#080d09]/90 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {(user.reminders || []).length === 0 ? (
            <div className="py-8 text-center opacity-50 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-2">
                <span className="material-icons-round text-3xl">notifications_off</span>
              </div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-300">No active alerts set</p>
              <p className="text-[10px] text-slate-400 mt-1">Tap a quick add button below or use AI Suggest</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(user.reminders || []).map((rem) => (
                <div key={rem.id} className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-primary/40 rounded-[1.8rem] p-4 flex items-center justify-between gap-3 transition-all duration-300 shadow-md group">
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg ${
                      rem.type === 'Meal' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-orange-500/10' :
                      rem.type === 'Water' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-sky-500/10' :
                      rem.type === 'Workout' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-purple-500/10' :
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                    }`}>
                      <span className="material-icons-round text-xl">
                        {rem.type === 'Meal' ? 'restaurant' : rem.type === 'Water' ? 'water_drop' : rem.type === 'Workout' ? 'fitness_center' : 'directions_run'}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${rem.enabled ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(19,236,55,0.8)]' : 'bg-slate-600'}`}></span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{rem.type} Alert</p>
                      </div>
                      
                      {/* Executive Digital Clock Pill */}
                      <div className="relative inline-flex items-center gap-2 px-3 py-1 bg-black/50 border border-white/10 group-hover:border-primary/40 rounded-xl transition-all cursor-pointer">
                        <span className="font-mono text-base sm:text-lg font-black tracking-wider text-white group-hover:text-primary transition-colors">
                          {formatTimeAMPM(rem.time)}
                        </span>
                        <span className="material-icons-round text-slate-400 group-hover:text-primary text-xs transition-colors">edit_calendar</span>
                        {/* Hidden native time picker input overlaid over the time text */}
                        <input 
                          type="time" 
                          value={to24Hour(rem.time)}
                          onChange={(e) => updateReminderTime(rem.id, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: iOS Toggle Switch & Delete Icon */}
                  <div className="flex items-center gap-4 shrink-0 pl-2">
                    {/* Bulletproof iOS Toggle Switch */}
                    <button 
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        if (!rem.enabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
                          Notification.requestPermission();
                        }
                        toggleReminder(rem.id);
                      }}
                      title={rem.enabled ? "Disable alert" : "Enable alert"}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                        rem.enabled 
                          ? 'bg-primary shadow-[0_0_14px_rgba(19,236,55,0.5)]' 
                          : 'bg-white/15 hover:bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                          rem.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Trash Delete Icon Button */}
                    <button 
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        deleteReminder(rem.id);
                      }} 
                      title="Delete Alert"
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer border border-white/10 hover:border-red-500/30 active:scale-90 shrink-0"
                    >
                      <span className="material-icons-round text-base">delete_outline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Section */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Quick Add Reminder</p>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { type: 'Meal', icon: 'lunch_dining', color: 'text-orange-400', bg: 'bg-gradient-to-b from-orange-500/10 to-orange-500/5 border-orange-500/20 hover:border-orange-500/50' },
                { type: 'Water', icon: 'water_drop', color: 'text-sky-400', bg: 'bg-gradient-to-b from-sky-500/10 to-sky-500/5 border-sky-500/20 hover:border-sky-500/50' },
                { type: 'Steps', icon: 'directions_walk', color: 'text-emerald-400', bg: 'bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50' },
                { type: 'Workout', icon: 'fitness_center', color: 'text-purple-400', bg: 'bg-gradient-to-b from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/50' },
              ].map((item) => (
                <button 
                  key={item.type} 
                  onClick={() => {
                    triggerHaptic('medium');
                    addReminder(item.type as any);
                  }} 
                  className={`border py-3 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer hover:shadow-lg ${item.bg}`}
                >
                  <span className={`material-icons-round text-lg ${item.color}`}>{item.icon}</span>
                  <span className="text-[9px] font-extrabold uppercase text-slate-200 tracking-wider">+{item.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Achievements & Milestones */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Achievements & Badges</h2>
          <span className="text-[9px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            🔥 {user.streakDays || 1} Day Streak
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: '1', title: 'First Step', desc: 'Logged first meal', icon: 'restaurant', unlocked: true, color: 'text-emerald-400 bg-emerald-400/10' },
            { id: '2', title: 'Hydration Hero', desc: 'Logged 8+ glasses', icon: 'water_drop', unlocked: true, color: 'text-blue-400 bg-blue-400/10' },
            { id: '3', title: 'Streak Master', desc: '7 days logged', icon: 'local_fire_department', unlocked: (user.streakDays || 1) >= 7, color: 'text-orange-400 bg-orange-400/10' },
            { id: '4', title: 'Protein Power', desc: '100% protein goal', icon: 'fitness_center', unlocked: true, color: 'text-purple-400 bg-purple-400/10' },
            { id: '5', title: '10k Step Crusher', desc: '10,000 steps reached', icon: 'directions_walk', unlocked: user.currentSteps >= 10000, color: 'text-amber-400 bg-amber-400/10' },
            { id: '6', title: 'AI Recipe Chef', desc: 'Custom AI dish created', icon: 'auto_awesome', unlocked: true, color: 'text-primary bg-primary/10' }
          ].map(badge => (
            <div 
              key={badge.id} 
              className={`glass-card p-3.5 rounded-2xl border transition-all ${
                badge.unlocked ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 opacity-40 grayscale'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badge.color}`}>
                  <span className="material-icons-round text-lg">{badge.icon}</span>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white leading-tight">{badge.title}</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">{badge.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Executive PDF Reports */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 px-1">Printable Reports</h2>
        <div className="glass-card rounded-[2.5rem] p-5 border border-white/5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-icons-round text-xl">picture_as_pdf</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-extrabold text-white">Weekly Health Summary Report</p>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                Download a PDF document of your target statistics, macro goals, and fitness metrics.
              </p>
            </div>
          </div>
          
          <button
            onClick={generatePdfReport}
            disabled={isGeneratingPdf}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <span className="material-icons-round text-sm animate-spin">sync</span>
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <span className="material-icons-round text-sm">download</span>
                <span>Download PDF Summary</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 7. Settings & Account Actions */}
      <section className="space-y-2.5">
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 px-1">Settings & Sync</h2>
        {[
          { icon: 'health_and_safety', label: 'Apple Health / Google Fit Sync', color: 'text-red-400' },
          { icon: 'share', label: 'Invite Friends', color: 'text-orange-400' },
        ].map((item, i) => (
          <button key={i} className="w-full flex items-center p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-colors group cursor-pointer">
            <span className={`material-icons-round mr-3 ${item.color}`}>{item.icon}</span>
            <span className="text-xs font-bold text-white/80 group-hover:text-white">{item.label}</span>
            <span className="material-icons-round ml-auto text-slate-500 group-hover:text-white text-base">chevron_right</span>
          </button>
        ))}

        <button 
          onClick={() => {
            triggerHaptic('medium');
            setIsResetModalOpen(true);
          }}
          className="w-full flex items-center p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl hover:bg-orange-500/20 transition-colors group cursor-pointer mt-1"
        >
          <span className="material-icons-round mr-3 text-orange-400">restart_alt</span>
          <span className="text-xs font-bold text-orange-400">Reset Application Data</span>
          <span className="material-icons-round ml-auto text-orange-400/50 group-hover:text-orange-400 text-base">chevron_right</span>
        </button>
        
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-colors group cursor-pointer mt-2"
        >
          <span className="material-icons-round mr-3 text-red-400">logout</span>
          <span className="text-xs font-bold text-red-400">
            {isLoggingOut ? 'Signing out...' : 'Sign Out Account'}
          </span>
        </button>
      </section>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative bg-[#0c130d]">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 mx-auto border border-orange-500/20 animate-pulse">
                <span className="material-icons-round text-2xl">warning_amber</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Reset from Start?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Permanent Action</p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed px-1">
                This will permanently delete all logged food entries, reset today's water glasses count, step records, and restore profile defaults.
              </p>

              {resetSuccess ? (
                <div className="py-3 flex flex-col items-center justify-center space-y-1.5 animate-in zoom-in-95">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-icons-round text-lg animate-bounce">check</span>
                  </div>
                  <p className="text-xs font-extrabold text-primary uppercase tracking-wider">Reset Successful</p>
                </div>
              ) : (
                <div className="pt-2 flex flex-col gap-2">
                  <button 
                    disabled={isResetting}
                    onClick={handleResetSubmit}
                    className="w-full py-3.5 rounded-2xl bg-orange-500 text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isResetting ? 'Resetting Data...' : 'Yes, Reset Data'}</span>
                  </button>
                  <button 
                    disabled={isResetting}
                    onClick={() => {
                      triggerHaptic('light');
                      setIsResetModalOpen(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-white/5 text-white/80 font-bold text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all border border-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;