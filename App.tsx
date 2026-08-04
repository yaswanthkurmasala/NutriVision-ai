import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import CameraScan from './components/CameraScan';
import Diary from './components/Diary';
import Profile from './components/Profile';
import FoodGuide from './components/FoodGuide';
import Auth from './components/Auth';
import NotificationToast from './components/NotificationToast';
import { View, UserProfile, FoodEntry, NutritionData, Reminder } from './types';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

const DEFAULT_USER_STATE: UserProfile = {
  name: 'Alex Thompson',
  goal: 'Maintain',
  dailyCalorieGoal: 2200,
  dailyStepGoal: 10000,
  currentSteps: 6420,
  workoutMinutesGoal: 45,
  currentWorkoutMinutes: 0,
  weight: 72.5,
  targetWeight: 70.0,
  bmi: 23.4,
  bodyFat: 18.5,
  theme: 'dark',
  macros: { protein: 150, carbs: 220, fats: 70, fiber: 30 },
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_STATE);
  const [entries, setEntries] = useState<FoodEntry[]>([]);

  // Auth Listener
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsAuthLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(safetyTimer);
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        setIsGuestMode(false);
        setView('home');
      } else {
        // Reset in-memory state on logout so next user loads their own clean data from Firebase
        setEntries([]);
        setWaterGlasses(0);
        setUserProfile(DEFAULT_USER_STATE);
      }
    }, (err) => {
      console.warn("Auth listener warning:", err);
      clearTimeout(safetyTimer);
      setIsAuthLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Firestore Sync: Profile
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          ...DEFAULT_USER_STATE,
          ...data,
          macros: {
            ...DEFAULT_USER_STATE.macros,
            ...(data.macros || {})
          }
        } as UserProfile);
      } else {
        // Initialize profile if it doesn't exist
        setDoc(userDocRef, {
          ...DEFAULT_USER_STATE,
          name: currentUser.displayName || DEFAULT_USER_STATE.name,
          avatarUrl: currentUser.photoURL || DEFAULT_USER_STATE.avatarUrl
        }).catch(err => console.warn("Failed to init profile doc:", err));
      }
    }, (err) => {
      console.warn("Firestore profile snapshot warning:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Apply Theme Mode
  useEffect(() => {
    const activeTheme = userProfile.theme || (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark';
    if (activeTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [userProfile.theme]);

  // Firestore Sync: Food Entries
  useEffect(() => {
    if (!currentUser) return;

    const entriesRef = collection(db, 'users', currentUser.uid, 'entries');
    const q = query(entriesRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp && typeof (data.timestamp as Timestamp).toDate === 'function'
            ? (data.timestamp as Timestamp).toDate()
            : new Date()
        } as FoodEntry;
      });
      setEntries(fetchedEntries);
    }, (err) => {
      console.warn("Firestore entries snapshot warning:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Firestore Sync: Water
  useEffect(() => {
    if (!currentUser) return;

    const today = new Date().toISOString().split('T')[0];
    const waterDocRef = doc(db, 'users', currentUser.uid, 'water', today);
    
    const unsubscribe = onSnapshot(waterDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setWaterGlasses(docSnap.data().count || 0);
      } else {
        setWaterGlasses(0);
      }
    }, (err) => {
      console.warn("Firestore water snapshot warning:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleUpdateWater = async (newCount: number) => {
    setWaterGlasses(newCount);
    if (!currentUser) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const waterDocRef = doc(db, 'users', currentUser.uid, 'water', today);
      await setDoc(waterDocRef, { count: newCount }, { merge: true });
    } catch (err) {
      console.warn("Water update sync warning:", err);
    }
  };

  const handleAddEntry = async (data: NutritionData & { multiplier?: number }) => {
    const entryData = {
      name: data.foodName,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fats: data.fats,
      fiber: data.fiber || 0,
      portionSize: data.portionDescription || '1 serving',
      timestamp: Timestamp.now()
    };

    if (!currentUser) {
      const localEntry: FoodEntry = {
        id: Date.now().toString(),
        name: data.foodName,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        fiber: data.fiber || 0,
        portionSize: data.portionDescription || '1 serving',
        timestamp: new Date()
      };
      setEntries(prev => [localEntry, ...prev]);
      setView('home');
      return;
    }

    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'entries'), entryData);
    } catch (err) {
      console.warn("Add entry sync warning:", err);
    }
    setView('home');
  };

  const handleDeleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', id));
    } catch (err) {
      console.warn("Delete entry sync warning:", err);
    }
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, updates, { merge: true });
    } catch (err) {
      console.warn("Profile update sync warning:", err);
    }
  };

  const handleResetAllData = async (): Promise<boolean> => {
    if (!currentUser) {
      setEntries([]);
      setWaterGlasses(0);
      setUserProfile(DEFAULT_USER_STATE);
      return true;
    }

    try {
      // 1. Delete all food log entries
      const deletePromises = entries.map((entry) => {
        if (entry.id) {
          return deleteDoc(doc(db, 'users', currentUser.uid, 'entries', entry.id));
        }
        return Promise.resolve();
      });
      await Promise.all(deletePromises);

      // 2. Set water glass count back to zero for today
      const today = new Date().toISOString().split('T')[0];
      const waterDocRef = doc(db, 'users', currentUser.uid, 'water', today);
      await setDoc(waterDocRef, { count: 0 }, { merge: true });

      // 3. Roll core user profile state back to factory default values
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        ...DEFAULT_USER_STATE,
        name: currentUser.displayName || DEFAULT_USER_STATE.name,
        avatarUrl: currentUser.photoURL || DEFAULT_USER_STATE.avatarUrl,
        currentSteps: 0,
        currentWorkoutMinutes: 0,
        reminders: []
      });

      return true;
    } catch (error) {
      console.error("Error executing full reset from start:", error);
      return false;
    }
  };

  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null);
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

  // Reminder Checker & Web Notification System
  useEffect(() => {
    if ((!currentUser && !isGuestMode) || !userProfile.reminders) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;
      
      const dueReminder = userProfile.reminders?.find(r => {
        if (!r.enabled) return false;
        // Normalize 12h or 24h stored time format
        let remTime = r.time || '';
        if (remTime.includes('AM') || remTime.includes('PM')) {
          const match = remTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = match[2];
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            remTime = `${h.toString().padStart(2, '0')}:${m}`;
          }
        }
        return remTime === currentTimeStr && `${r.id}-${currentTimeStr}` !== lastNotifiedId;
      });

      if (dueReminder) {
        setActiveNotification(dueReminder);
        setLastNotifiedId(`${dueReminder.id}-${currentTimeStr}`);
        
        // Push Native Web Notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`NutriVision AI: ${dueReminder.type} Alert`, {
              body: dueReminder.type === 'Meal' ? "Time to log your meal to stay on track!" : 
                    dueReminder.type === 'Water' ? "Stay hydrated! Have a glass of water now." : 
                    dueReminder.type === 'Steps' ? "Time for a quick walk to reach your step goal!" : "Workout time!",
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.warn("Native Notification notice:", e);
          }
        }
        
        // Auto-close toast after 10 seconds
        setTimeout(() => {
          setActiveNotification(null);
        }, 10000);
      }
    }, 5000); // Check every 5 seconds for pinpoint accuracy

    return () => clearInterval(interval);
  }, [currentUser, isGuestMode, userProfile.reminders, lastNotifiedId]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0c1a0e] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser && !isGuestMode) {
    return <Auth onLogin={(name, email, isGuest) => {
      if (isGuest) {
        setIsGuestMode(true);
        setUserProfile(prev => ({ ...prev, name: name || 'Guest User' }));
      }
      setView('home');
    }} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'home': return <Dashboard user={userProfile} entries={entries} waterGlasses={waterGlasses} setWaterGlasses={handleUpdateWater} onUpdateUser={updateUser} onAddManualEntry={handleAddEntry} onViewChange={setView} />;
      case 'analytics': return <Analytics user={userProfile} />;
      case 'diary': return <Diary entries={entries} onAddManualEntry={handleAddEntry} onDeleteEntry={handleDeleteEntry} />;
      case 'profile': return <Profile user={userProfile} onUpdate={updateUser} onResetData={handleResetAllData} />;
      case 'recipes': return <FoodGuide user={userProfile} onAddManualEntry={handleAddEntry} />;
      case 'camera': return <CameraScan user={userProfile} onAddEntry={handleAddEntry} onClose={() => setView('home')} />;
      default: return <Dashboard user={userProfile} entries={entries} waterGlasses={waterGlasses} setWaterGlasses={handleUpdateWater} onUpdateUser={updateUser} onAddManualEntry={handleAddEntry} onViewChange={setView} />;
    }
  };

  return (
    <Layout activeView={view} onViewChange={setView} user={userProfile} onUpdateUser={updateUser}>
      <NotificationToast 
        reminder={activeNotification} 
        onClose={() => setActiveNotification(null)} 
      />
      {renderContent()}
    </Layout>
  );
}
