import React, { useState, useMemo } from 'react';
import { FoodEntry, NutritionData } from '../types';

interface DiaryProps {
  entries: FoodEntry[];
  onAddManualEntry: (data: NutritionData) => void;
  onDeleteEntry: (id: string) => void;
}

export default function Diary({ entries, onAddManualEntry, onDeleteEntry }: DiaryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  
  // Manual Entry Form State
  const [formData, setFormData] = useState<NutritionData>({
    foodName: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    portionDescription: ''
  });

  // Calculate grouped entries and summaries for the last 7 days
  const weeklyHistory = useMemo(() => {
    const history = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayEntries = entries.filter(e => {
        const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
        return entryDate === dateStr && 
               e.name.toLowerCase().includes(searchQuery.toLowerCase());
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const totals = dayEntries.reduce((acc, e) => ({
        cal: acc.cal + (e.calories || 0),
        p: acc.p + (e.protein || 0),
        c: acc.c + (e.carbs || 0),
        f: acc.f + (e.fats || 0),
      }), { cal: 0, p: 0, c: 0, f: 0 });

      if (dayEntries.length > 0 || !searchQuery) {
        history.push({
          date: dateStr,
          label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          dayNum: d.getDate(),
          entries: dayEntries,
          totals
        });
      }
    }
    return history;
  }, [entries, searchQuery]);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.foodName) return;
    onAddManualEntry(formData);
    setIsAdding(false);
    setFormData({ foodName: '', calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, portionDescription: '' });
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      onDeleteEntry(entryToDelete);
      setEntryToDelete(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Food Diary</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mt-0.5">Week at a Glance</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 rounded-2xl bg-primary text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform fab-glow"
          >
            <span className="material-icons-round text-2xl">add</span>
          </button>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center space-x-3 border border-white/5 focus-within:border-primary/50 transition-colors">
          <span className="material-icons-round text-slate-500 text-xl">search</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your logs..."
            className="bg-transparent text-sm font-medium focus:outline-none w-full text-white placeholder:text-slate-600"
          />
        </div>
      </header>

      {/* Manual Entry Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-[380px] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Quick Log</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Manual Input</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveManual} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Food Name</label>
                <input 
                  autoFocus
                  required
                  value={formData.foodName}
                  onChange={e => setFormData({...formData, foodName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-white"
                  placeholder="e.g. Avocado Toast"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Calories (kcal)</label>
                  <input 
                    type="number"
                    value={formData.calories || ''}
                    onChange={e => setFormData({...formData, calories: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary outline-none transition-all text-white text-xs"
                    placeholder="e.g. 350"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Protein (g)</label>
                  <input 
                    type="number"
                    value={formData.protein || ''}
                    onChange={e => setFormData({...formData, protein: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary outline-none transition-all text-white text-xs"
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Carbs (g)</label>
                  <input 
                    type="number"
                    value={formData.carbs || ''}
                    onChange={e => setFormData({...formData, carbs: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary outline-none transition-all text-white text-xs"
                    placeholder="e.g. 40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Fats (g)</label>
                  <input 
                    type="number"
                    value={formData.fats || ''}
                    onChange={e => setFormData({...formData, fats: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary outline-none transition-all text-white text-xs"
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Fiber (g)</label>
                  <input 
                    type="number"
                    value={formData.fiber || ''}
                    onChange={e => setFormData({...formData, fiber: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary outline-none transition-all text-white text-xs"
                    placeholder="e.g. 6"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Portion Size</label>
                  <input 
                    type="text"
                    value={formData.portionDescription || ''}
                    onChange={e => setFormData({...formData, portionDescription: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary outline-none transition-all text-white text-xs"
                    placeholder="e.g. 1 plate / 250g"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-black font-black py-5 rounded-[1.8rem] shadow-xl shadow-primary/20 mt-4 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
              >
                Log Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-[320px] rounded-[2.5rem] p-8 border border-red-500/20 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-icons-round text-3xl text-red-500">delete_forever</span>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Delete Log?</h3>
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-8 px-4">This action cannot be undone. Are you sure you want to remove this entry?</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setEntryToDelete(null)}
                className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day History List */}
      <section className="space-y-10">
        {weeklyHistory.map((day) => (
          <div key={day.date} className="space-y-4">
            {/* Day Summary Header */}
            <div className="flex items-end justify-between px-1 sticky top-0 z-10 py-2 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">{day.label}</h2>
              </div>
              <div className="flex space-x-4">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total</p>
                  <p className={`text-sm font-black ${day.totals.cal > 0 ? 'text-primary' : 'text-slate-700'}`}>{Math.round(day.totals.cal || 0)} <span className="text-[8px] font-bold text-slate-600">kcal</span></p>
                </div>
                <div className="text-right border-l border-white/5 pl-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Protein</p>
                  <p className="text-sm font-black text-white/40">{Math.round(day.totals.p || 0)}g</p>
                </div>
              </div>
            </div>

            {/* Entries for this Day */}
            {day.entries.length === 0 ? (
              <div className="py-6 flex items-center justify-center glass-card rounded-2xl border-dashed border-white/5 border-2">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No entries logged</p>
              </div>
            ) : (
              <div className="space-y-3">
                {day.entries.map((entry) => (
                  <div key={entry.id} className="glass-card rounded-[1.8rem] p-5 flex items-center justify-between group active:scale-[0.98] transition-all border border-white/5 hover:bg-white/[0.05] hover:border-primary/20 relative overflow-hidden">
                    <div className="space-y-2 shrink overflow-hidden text-left">
                      <div className="flex items-center space-x-3">
                        <div className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <h3 className="text-sm font-black text-white truncate group-hover:text-primary transition-colors">{entry.name}</h3>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">P {Math.round(entry.protein || 0)}g</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">C {Math.round(entry.carbs || 0)}g</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">F {Math.round(entry.fats || 0)}g</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xl font-black text-primary leading-none tracking-tighter">{Math.round(entry.calories || 0)}</p>
                        <p className="text-[8px] uppercase font-black text-slate-600 tracking-widest mt-1">kcal</p>
                      </div>
                      <button 
                        onClick={() => setEntryToDelete(entry.id)}
                        className="ml-3 p-2 rounded-xl bg-red-500/10 text-red-400 opacity-70 hover:opacity-100 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        title="Delete log"
                      >
                        <span className="material-icons-round text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {weeklyHistory.length === 0 && searchQuery && (
          <div className="py-20 flex flex-col items-center text-center space-y-6 opacity-30">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <span className="material-icons-round text-5xl">search_off</span>
            </div>
            <p className="text-sm font-medium px-12 leading-relaxed">
              Nothing found matching "{searchQuery}" in the last 7 days.
            </p>
          </div>
        )}
      </section>

      <div className="pb-10"></div>
    </div>
  );
}