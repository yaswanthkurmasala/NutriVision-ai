import React, { useState, useEffect } from 'react';
import { Reminder } from '../types';

interface NotificationToastProps {
  reminder: Reminder | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ reminder, onClose }) => {
  if (!reminder) return null;

  const getIcon = () => {
    switch (reminder.type) {
      case 'Meal': return 'restaurant';
      case 'Water': return 'water_drop';
      case 'Steps': return 'directions_walk';
      case 'Workout': return 'fitness_center';
      default: return 'notifications';
    }
  };

  const getColor = () => {
    switch (reminder.type) {
      case 'Meal': return 'text-orange-400 bg-orange-500/10';
      case 'Water': return 'text-blue-400 bg-blue-500/10';
      case 'Steps': return 'text-primary bg-primary/10';
      case 'Workout': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-white bg-white/10';
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[380px] z-[100] animate-in slide-in-from-top-10 duration-500">
      <div className="glass-card rounded-3xl p-4 border border-white/10 shadow-2xl flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getColor()}`}>
          <span className="material-icons-round text-2xl">{getIcon()}</span>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Time for {reminder.type}!</p>
          <p className="text-xs font-bold text-white/70 leading-tight">
            {reminder.type === 'Meal' ? 'Don\'t forget to log your meal to stay on track.' : 
             reminder.type === 'Water' ? 'Stay hydrated! Have a glass of water now.' : 
             'Time for a quick walk to reach your step goal.'}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <span className="material-icons-round text-lg">close</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
