import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, AreaChart, Area, PieChart, Pie, YAxis, Tooltip, ComposedChart, Line } from 'recharts';
import { jsPDF } from 'jspdf';
import { UserProfile } from '../types';

const weeklyData = [
  { day: 'MON', in: 2100, out: 1800, protein: 140, isCheat: false },
  { day: 'TUE', in: 2400, out: 2000, protein: 160, isCheat: true },
  { day: 'WED', in: 1950, out: 2200, protein: 155, isCheat: false },
  { day: 'THU', in: 2500, out: 1900, protein: 130, isCheat: true },
  { day: 'FRI', in: 2200, out: 2100, protein: 150, isCheat: false },
  { day: 'SAT', in: 1800, out: 1500, protein: 120, isCheat: false },
  { day: 'SUN', in: 2300, out: 2400, protein: 145, isCheat: false },
];

const last7DaysComboData = [
  { day: 'MON', calories: 2100, weight: 75.2 },
  { day: 'TUE', calories: 2400, weight: 75.0 },
  { day: 'WED', calories: 1950, weight: 74.8 },
  { day: 'THU', calories: 2500, weight: 74.9 },
  { day: 'FRI', calories: 2200, weight: 74.5 },
  { day: 'SAT', calories: 1800, weight: 74.2 },
  { day: 'SUN', calories: 2300, weight: 74.0 },
];

const weightTrend = [
  { date: 'Oct 01', weight: 75.2, bmi: 24.3, bf: 20.1 },
  { date: 'Oct 08', weight: 74.5, bmi: 24.1, bf: 19.8 },
  { date: 'Oct 15', weight: 74.0, bmi: 23.9, bf: 19.5 },
  { date: 'Oct 22', weight: 73.1, bmi: 23.6, bf: 19.0 },
  { date: 'Oct 31', weight: 72.5, bmi: 23.4, bf: 18.5 },
];

const balanceData = [
  { name: 'Protein', value: 30, fill: '#13ec37' },
  { name: 'Carbs', value: 45, fill: '#ffffff30' },
  { name: 'Fats', value: 20, fill: '#ffffff10' },
  { name: 'Fiber', value: 5, fill: '#13ec3760' },
];

interface AnalyticsProps {
  user: UserProfile;
}

const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
  const [mode, setMode] = useState<'weekly' | 'monthly'>('weekly');
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const avgCalories = Math.round((weeklyData.reduce((acc, d) => acc + (d.in || 0), 0) / (weeklyData.length || 1)) || 0);
  const cheatMeals = weeklyData.filter(d => d.isCheat).length;
  const avgProtein = Math.round((weeklyData.reduce((acc, d) => acc + (d.protein || 0), 0) / (weeklyData.length || 1)) || 0);
  const weightDiff = (weightTrend[weightTrend.length - 1].weight - weightTrend[0].weight).toFixed(1);

  const getMuscleStatus = () => {
    if (avgProtein > 140) return { label: 'OPTIMAL', color: 'text-primary', icon: 'trending_up' };
    if (avgProtein > 100) return { label: 'MAINTAINING', color: 'text-yellow-400', icon: 'trending_flat' };
    return { label: 'DEFICIT', color: 'text-red-400', icon: 'trending_down' };
  };

  const muscleStatus = getMuscleStatus();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      const primaryColor = [19, 236, 55]; // NutriVision Green
      const secondaryColor = [100, 100, 100];
      const darkColor = [20, 20, 20];

      // Helper for drawing a section header
      const sectionHeader = (title: string, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(title.toUpperCase(), 20, y);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, y + 2, 190, y + 2);
      };

      // 1. Header & Branding
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('NUTRIVISION AI', 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('PERSONALIZED HEALTH & NUTRITION INTELLIGENCE', 20, 33);
      
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`REPORT ID: NV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 140, 20);
      doc.text(`GENERATED: ${timestamp}`, 140, 25);

      // 2. User Profile Summary
      doc.setFontSize(12);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`USER: ${user.name.toUpperCase()}`, 20, 55);
      doc.text(`GOAL: ${user.goal.toUpperCase()}`, 120, 55);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Current Weight: ${user.weight || 0} kg`, 20, 62);
      doc.text(`Target Weight: ${user.targetWeight || 0} kg`, 20, 68);
      doc.text(`Daily Calorie Target: ${user.dailyCalorieGoal || 0} kcal`, 120, 62);
      doc.text(`Daily Step Target: ${user.dailyStepGoal || 0} steps`, 120, 68);

      // 3. Nutrition Analysis
      sectionHeader('Nutrition & Macro Analysis', 85);
      
      const startY = 95;
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      
      // Macro Table Headers
      doc.setFillColor(245, 245, 245);
      doc.rect(20, startY, 170, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Nutrient', 25, startY + 5);
      doc.text('Target', 70, startY + 5);
      doc.text('Avg. Actual', 110, startY + 5);
      doc.text('Status', 155, startY + 5);

      // Macro Rows
      const macros = [
        { name: 'Calories', target: `${user.dailyCalorieGoal || 0} kcal`, actual: `${avgCalories} kcal`, status: avgCalories <= (user.dailyCalorieGoal || 0) ? 'ON TRACK' : 'OVER' },
        { name: 'Protein', target: `${user.macros?.protein || 0}g`, actual: `${avgProtein}g`, status: avgProtein >= (user.macros?.protein || 0) ? 'OPTIMAL' : 'LOW' },
        { name: 'Carbs', target: `${user.macros?.carbs || 0}g`, actual: '210g', status: 'ON TRACK' },
        { name: 'Fats', target: `${user.macros?.fats || 0}g`, actual: '65g', status: 'ON TRACK' },
      ];

      doc.setFont('helvetica', 'normal');
      macros.forEach((m, i) => {
        const rowY = startY + 15 + (i * 10);
        doc.text(m.name, 25, rowY);
        doc.text(m.target, 70, rowY);
        doc.text(m.actual, 110, rowY);
        if (m.status === 'ON TRACK' || m.status === 'OPTIMAL') {
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        } else {
          doc.setTextColor(220, 50, 50);
        }
        doc.text(m.status, 155, rowY);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setDrawColor(230, 230, 230);
        doc.line(20, rowY + 3, 190, rowY + 3);
      });

      // 4. Body Transformation Trends
      sectionHeader('Body Transformation Trends', 150);
      
      const trendY = 160;
      doc.setFontSize(10);
      doc.text('Metric', 25, trendY);
      doc.text('Initial', 70, trendY);
      doc.text('Current', 110, trendY);
      doc.text('Change', 155, trendY);
      doc.line(20, trendY + 2, 190, trendY + 2);

      const trends = [
        { name: 'Weight', initial: `${weightTrend[0].weight}kg`, current: `${weightTrend[weightTrend.length - 1].weight}kg`, change: `${weightDiff}kg` },
        { name: 'BMI', initial: weightTrend[0].bmi.toString(), current: weightTrend[weightTrend.length - 1].bmi.toString(), change: (weightTrend[weightTrend.length - 1].bmi - weightTrend[0].bmi).toFixed(1) },
        { name: 'Body Fat', initial: `${weightTrend[0].bf}%`, current: `${weightTrend[weightTrend.length - 1].bf}%`, change: `${(weightTrend[weightTrend.length - 1].bf - weightTrend[0].bf).toFixed(1)}%` },
      ];

      trends.forEach((t, i) => {
        const rowY = trendY + 10 + (i * 10);
        doc.text(t.name, 25, rowY);
        doc.text(t.initial, 70, rowY);
        doc.text(t.current, 110, rowY);
        doc.text(t.change, 155, rowY);
        doc.line(20, rowY + 3, 190, rowY + 3);
      });

      // 5. Workout & Activity Analysis
      sectionHeader('Workout & Activity Analysis', 205);
      
      const workoutY = 215;
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      
      const workoutMetrics = [
        { label: 'Avg Workout Duration', value: `${user.currentWorkoutMinutes || 30} mins` },
        { label: 'Daily Activity Level', value: 'High (Avg 12k steps)' },
        { label: 'Step Goal Progress', value: `${Math.round(((user.currentSteps || 0) / (user.dailyStepGoal || 10000)) * 100)}% of goal` },
        { label: 'Hydration Consistency', value: '92% Adherence' },
        { label: 'Peak Performance Time', value: '10:00 AM - 12:00 PM' },
        { label: 'Est. Muscle Retention', value: 'Optimal (High Protein)' },
      ];

      workoutMetrics.forEach((m, i) => {
        const itemX = i % 2 === 0 ? 25 : 110;
        const itemY = workoutY + (Math.floor(i / 2) * 15);
        doc.setFont('helvetica', 'bold');
        doc.text(m.label, itemX, itemY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(m.value, itemX, itemY + 5);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      });

      // 6. AI Strategic Recommendations & Forecast
      doc.addPage();
      
      // Branding on Page 2
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('AI STRATEGIC HEALTH FORECAST', 20, 17);

      sectionHeader('Performance Analysis & Forecast', 35);
      
      const analysisSections = [
        {
          title: "METABOLIC EFFICIENCY",
          content: "Your body is currently prioritizing fat oxidation during steady-state cardio sessions. Adherence to the current deficit is yielding a 0.4kg/week loss, which is sustainable and minimizes muscle catabolism."
        },
        {
          title: "HYPERTROPHY & RECOVERY",
          content: "Based on your 150g+ protein intake, muscle preservation is high. To accelerate hypertrophy after the current cut, we recommend a 15% calorie surplus focused on complex carbohydrate timing pre-workout."
        },
        {
          title: "HYDRATION & MICRONUTRIENTS",
          content: "On high-workout days (60m+), your recovery parameters indicate a potential sodium imbalance. Recommendation: Add an electrolyte blend post-session to reduce evening cortisol spikes."
        },
        {
          title: "SLEEP & PERFORMANCE PEAK",
          content: "Your biometric trends show a power output peak at 10AM. Scheduling compound movements (Deadlifts/Squats) during this window will likely result in a 10-15% strength increase."
        },
        {
          title: "ML PROGRESS PREDICTION",
          content: "Projected Weight: 71.2kg by Oct 31st.\nConfidence Level: 94% based on current adherence.\nRecommendation: Continue current protocol for 14 days before assessing 'Cheat Meal' frequency."
        }
      ];

      analysisSections.forEach((sec, i) => {
        const secY = 50 + (i * 35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(sec.title, 20, secY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        const lines = doc.splitTextToSize(sec.content, 170);
        doc.text(lines, 25, secY + 6);
      });

      // 7. Footer
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 270, 210, 27, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('This report is generated by NutriVision AI based on user-logged data and machine learning analysis.', 105, 280, { align: 'center' });
      doc.text('© 2026 NutriVision AI. All rights reserved.', 105, 285, { align: 'center' });
      doc.text('www.nutrivision.ai | Support: hello@nutrivision.ai', 105, 290, { align: 'center' });

      doc.save(`NutriVision_Health_Report_${user.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Export Failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloudSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-24 view-enter">
      <header className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">{mode === 'weekly' ? 'Weekly Analysis' : 'Monthly Report'}</h1>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Insights & Performance</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleCloudSync}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isSyncing ? 'bg-primary/20 border-primary/40 animate-pulse' : 'bg-white/5 border-white/5'}`}
          >
            <span className="material-icons-round text-lg text-primary">{isSyncing ? 'cloud_upload' : 'cloud_done'}</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <span className="material-icons-round text-primary">{isExporting ? 'sync' : 'picture_as_pdf'}</span>
          </button>
        </div>
      </header>

      <div className="bg-white/5 p-1 rounded-2xl flex items-center border border-white/5 mx-1">
        <button 
          onClick={() => setMode('weekly')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${mode === 'weekly' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-slate-500'}`}
        >
          Weekly
        </button>
        <button 
          onClick={() => setMode('monthly')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${mode === 'monthly' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-slate-500'}`}
        >
          Monthly
        </button>
      </div>

      {mode === 'weekly' ? (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Improved Main Analysis Card */}
          <section className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative shadow-2xl overflow-hidden">
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex flex-col">
                <span className="text-4xl font-black text-white tracking-tighter leading-none">{avgCalories.toLocaleString()}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mt-2">Avg Daily Intake</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(19,236,55,0.6)]"></div>
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-widest">In</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-widest">Out</span>
                </div>
              </div>
            </div>

            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={6}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900}} 
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.03)'}}
                    contentStyle={{backgroundColor: '#152b18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold'}}
                  />
                  <Bar dataKey="in" radius={[10, 10, 10, 10]} barSize={14}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-in-${index}`} fill={entry.isCheat ? "#ef4444" : "#13ec37"} />
                    ))}
                  </Bar>
                  <Bar dataKey="out" radius={[10, 10, 10, 10]} barSize={14} fill="rgba(255,255,255,0.05)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Weight & Calorie Correlation Trend Chart */}
          <section className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative shadow-2xl overflow-hidden">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex flex-col">
                <span className="text-sm font-black text-white tracking-tight">Weight & Calories Trend</span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mt-1">7-Day Correlation</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/40"></div>
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-widest">Calories</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-widest">Weight (kg)</span>
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={last7DaysComboData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900}} 
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    domain={[1200, 2800]}
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 8}}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[73, 76]}
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#60a5fa', fontSize: 8}}
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#152b18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold'}}
                  />
                  <Bar yAxisId="left" dataKey="calories" fill="#13ec37" opacity={0.15} radius={[6, 6, 0, 0]} barSize={18} />
                  <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#60a5fa', strokeWidth: 2, stroke: '#0c1a0e' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-[2.2rem] border border-white/5 relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <span className="material-icons-round text-blue-400 text-lg">monitor_weight</span>
                </div>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Weight Shift</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{(Number(weightTrend[weightTrend.length - 1].weight) - Number(weightTrend[weightTrend.length - 2].weight)).toFixed(1)}</span>
                  <span className="text-[10px] font-black text-white/20">kg</span>
                </div>
                <span className={`text-[9px] font-black pb-1.5 tracking-widest ${Number(weightDiff) < 0 ? 'text-primary' : 'text-red-400'}`}>
                  {Number(weightDiff) < 0 ? 'LOSS' : 'GAIN'}
                </span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-[2.2rem] border border-white/5 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <span className="material-icons-round text-orange-400 text-lg">fitness_center</span>
                </div>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Muscle Hub</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black uppercase tracking-widest ${muscleStatus.color}`}>
                  {muscleStatus.label}
                </span>
                <span className={`material-icons-round text-2xl ${muscleStatus.color} animate-pulse`}>
                  {muscleStatus.icon}
                </span>
              </div>
            </div>

            <div className="glass-card p-7 rounded-[2.5rem] border border-white/5 col-span-2 overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
                    <span className="material-icons-round text-2xl">fastfood</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block mb-1">Cheat Balance</span>
                    <span className="text-lg font-black text-white">{cheatMeals} meals <span className="text-[10px] text-white/10 uppercase font-black ml-1 tracking-tighter">/ week</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">On Track</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {weeklyData.map((d, i) => (
                  <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-700 ${d.isCheat ? 'bg-red-500/30' : 'bg-primary/20'}`}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-[2.2rem] p-6 border border-white/5 text-center flex flex-col items-center">
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">ML Prediction</h3>
               <div className="relative w-24 h-24 mb-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="42" stroke="#13ec37" strokeWidth="8" fill="transparent" strokeDasharray="263.8" strokeDashoffset="45" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-black text-white">82</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Score</span>
                  </div>
               </div>
               <p className="text-[9px] font-black text-primary tracking-widest uppercase mt-4">Target Reaching</p>
            </div>

            <div className="glass-card rounded-[2.2rem] p-6 border border-white/5 text-center flex flex-col items-center">
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Nutri-Balance</h3>
               <div className="w-24 h-24 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={balanceData} cx="50%" cy="50%" innerRadius={32} outerRadius={46} paddingAngle={4} dataKey="value" stroke="none" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-black text-white">94</span>
                  </div>
               </div>
               <p className="text-[9px] font-black text-primary tracking-widest uppercase mt-4">Excellent</p>
            </div>
          </div>

          <section className="glass-card rounded-[2.8rem] p-8 border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Cloud Analytics (BigQuery)</h3>
              <span className="material-icons-round text-white/20">storage</span>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
                    <span className="material-icons-round text-2xl">insights</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight">BMI Projection</p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">24.3 → 23.4 (Normal Range)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-primary">-0.9</p>
                  <p className="text-[8px] font-black text-primary/30 uppercase tracking-widest mt-1">Improving</p>
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/10">
                    <span className="material-icons-round text-2xl">track_changes</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight">Body Fat Analysis</p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">20.1% → 18.5% (-1.6%)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-primary">Leaning</p>
                  <p className="text-[8px] font-black text-primary/30 uppercase tracking-widest mt-1">AI Verified</p>
                </div>
              </div>
            </div>

            <div className="h-48 w-full pt-8 px-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightTrend}>
                  <defs>
                    <linearGradient id="colorBf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#13ec37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#13ec37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="bf" stroke="#13ec37" strokeWidth={5} fillOpacity={1} fill="url(#colorBf)" dot={{ r: 6, fill: '#13ec37', strokeWidth: 4, stroke: '#0c1a0e' }} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[9px] text-center text-white/10 font-black uppercase mt-6 tracking-[0.4em]">Monthly Adherence Data</p>
            </div>
          </section>

          <div className="bg-primary/10 border border-primary/20 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl">
            <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12">
              <span className="material-icons-round text-[140px]">psychology</span>
            </div>
            <div className="flex items-start gap-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-black shrink-0 shadow-[0_0_25px_rgba(19,236,55,0.4)]">
                <span className="material-icons-round text-3xl">auto_awesome</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-primary uppercase tracking-[0.1em]">AI Studio Insight</h4>
                <p className="text-[11px] text-white/70 leading-relaxed mt-3 font-medium italic">
                  "Analysis complete. Your metrics show high metabolic efficiency. Based on your current body fat of 18.5%, increasing high-protein snacks between 3PM-5PM will further preserve muscle mass."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;