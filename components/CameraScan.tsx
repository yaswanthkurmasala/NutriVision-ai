import React, { useState, useRef, useEffect } from 'react';
import { 
  analyzeFoodImage, 
  analyzeNutritionLabel,
  fetchBarcodeNutrition, 
  analyzePackagedProductWithBarcode, 
  PackagedProductData 
} from '../services/geminiService';
import { NutritionData, UserProfile, FoodItemDetail } from '../types';
import { triggerHaptic } from '../services/haptic';

interface CameraScanProps {
  user: UserProfile;
  onAddEntry: (data: NutritionData & { multiplier?: number }) => void;
  onClose: () => void;
}

const SAMPLE_DISHES = [
  {
    label: 'Avocado & Eggs Toast',
    icon: 'breakfast_dining',
    nutrition: {
      foodName: 'Avocado Toast with Poached Eggs',
      calories: 380,
      protein: 18,
      carbs: 32,
      fats: 20,
      fiber: 7,
      portionDescription: '2 slices sourdough with 1 avocado & 2 eggs • High Precision AI',
      confidenceScore: 98,
      dishType: 'Breakfast Power Plate',
      healthScore: 95,
      hiddenCalorieWarning: 'Light olive oil drizzle (~20 kcal)',
      dietaryTags: ['High Fiber', 'Healthy Fats', 'Vegetarian'],
      items: [
        {
          id: 'samp-1',
          name: 'Poached Organic Eggs (x2)',
          calories: 140,
          protein: 12,
          carbs: 1,
          fats: 10,
          fiber: 0,
          portion: '2 large eggs',
          confidence: 99,
          category: 'Protein' as const,
          boundingBox: { ymin: 15, xmin: 30, ymax: 55, xmax: 70 }
        },
        {
          id: 'samp-2',
          name: 'Mashed Hass Avocado',
          calories: 130,
          protein: 2,
          carbs: 6,
          fats: 12,
          fiber: 5,
          portion: '1/2 avocado (75g)',
          confidence: 97,
          category: 'Fat/Sauce' as const,
          boundingBox: { ymin: 35, xmin: 20, ymax: 75, xmax: 80 }
        },
        {
          id: 'samp-3',
          name: 'Artisan Sourdough Toast',
          calories: 110,
          protein: 4,
          carbs: 25,
          fats: 1,
          fiber: 2,
          portion: '2 thick slices',
          confidence: 96,
          category: 'Carbs' as const,
          boundingBox: { ymin: 40, xmin: 10, ymax: 90, xmax: 90 }
        }
      ]
    }
  },
  {
    label: 'Grilled Chicken Bowl',
    icon: 'lunch_dining',
    nutrition: {
      foodName: 'Grilled Chicken Quinoa Power Bowl',
      calories: 520,
      protein: 44,
      carbs: 48,
      fats: 16,
      fiber: 8,
      portionDescription: '200g chicken breast, quinoa, broccoli, avocado',
      confidenceScore: 97,
      dishType: 'High-Protein Grain Bowl',
      healthScore: 96,
      hiddenCalorieWarning: 'Sesame dressing (~25 kcal)',
      dietaryTags: ['High Protein', 'Lean Muscle', 'Gluten-Free'],
      items: [
        {
          id: 'samp-4',
          name: 'Charbroiled Chicken Breast',
          calories: 260,
          protein: 36,
          carbs: 0,
          fats: 6,
          fiber: 0,
          portion: '180g cutlet',
          confidence: 99,
          category: 'Protein' as const,
          boundingBox: { ymin: 15, xmin: 25, ymax: 55, xmax: 75 }
        },
        {
          id: 'samp-5',
          name: 'Fluffy Quinoa Base',
          calories: 180,
          protein: 6,
          carbs: 38,
          fats: 3,
          fiber: 4,
          portion: '130g portion',
          confidence: 96,
          category: 'Carbs' as const,
          boundingBox: { ymin: 45, xmin: 15, ymax: 85, xmax: 55 }
        },
        {
          id: 'samp-6',
          name: 'Steamed Broccoli & Avocado',
          calories: 80,
          protein: 2,
          carbs: 10,
          fats: 7,
          fiber: 4,
          portion: '110g mix',
          confidence: 95,
          category: 'Veggies/Fiber' as const,
          boundingBox: { ymin: 45, xmin: 55, ymax: 85, xmax: 90 }
        }
      ]
    }
  },
  {
    label: 'Paneer Tikka Salad',
    icon: 'dinner_dining',
    nutrition: {
      foodName: 'Paneer Tikka Protein Salad Bowl',
      calories: 410,
      protein: 26,
      carbs: 22,
      fats: 24,
      fiber: 5,
      portionDescription: '180g paneer tikka with veggies & mint yogurt',
      confidenceScore: 96,
      dishType: 'Vegetarian Fit Plate',
      healthScore: 91,
      hiddenCalorieWarning: 'Tandoori oil marinade (~30 kcal)',
      dietaryTags: ['Vegetarian', 'Keto Friendly', 'Calcium Rich'],
      items: [
        {
          id: 'samp-7',
          name: 'Tandoori Paneer Tikka Cubes',
          calories: 280,
          protein: 20,
          carbs: 8,
          fats: 20,
          fiber: 1,
          portion: '160g portion',
          confidence: 98,
          category: 'Protein' as const,
          boundingBox: { ymin: 20, xmin: 20, ymax: 60, xmax: 80 }
        },
        {
          id: 'samp-8',
          name: 'Crisp Bell Pepper & Onion Mix',
          calories: 80,
          protein: 3,
          carbs: 12,
          fats: 3,
          fiber: 3,
          portion: '100g sauteed',
          confidence: 94,
          category: 'Veggies/Fiber' as const,
          boundingBox: { ymin: 55, xmin: 15, ymax: 90, xmax: 60 }
        },
        {
          id: 'samp-9',
          name: 'Mint Greek Yogurt Dip',
          calories: 50,
          protein: 3,
          carbs: 2,
          fats: 1,
          fiber: 1,
          portion: '35g side',
          confidence: 95,
          category: 'Fat/Sauce' as const,
          boundingBox: { ymin: 60, xmin: 65, ymax: 88, xmax: 90 }
        }
      ]
    }
  },
  {
    label: 'Berry Whey Smoothie',
    icon: 'local_cafe',
    nutrition: {
      foodName: 'Wild Berry Whey Protein Smoothie',
      calories: 290,
      protein: 30,
      carbs: 34,
      fats: 4,
      fiber: 6,
      portionDescription: '1 large glass (450ml) • Hydrating Shake',
      confidenceScore: 99,
      dishType: 'Post-Workout Shake',
      healthScore: 98,
      hiddenCalorieWarning: 'None detected (Sugar-Free Base)',
      dietaryTags: ['Post-Workout', 'Low Fat', 'Antioxidants'],
      items: [
        {
          id: 'samp-10',
          name: 'Whey Isolate & Almond Milk Base',
          calories: 160,
          protein: 26,
          carbs: 4,
          fats: 3,
          fiber: 1,
          portion: '300ml base',
          confidence: 99,
          category: 'Protein' as const,
          boundingBox: { ymin: 10, xmin: 20, ymax: 90, xmax: 80 }
        },
        {
          id: 'samp-11',
          name: 'Blended Wild Blueberries & Strawberries',
          calories: 130,
          protein: 4,
          carbs: 30,
          fats: 1,
          fiber: 5,
          portion: '150g berries',
          confidence: 97,
          category: 'Beverage' as const,
          boundingBox: { ymin: 20, xmin: 25, ymax: 80, xmax: 75 }
        }
      ]
    }
  }
];

const CameraScan: React.FC<CameraScanProps> = ({ user, onAddEntry, onClose }) => {
  const [scanMode, setScanMode] = useState<'photo' | 'label' | 'barcode'>('photo');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackagedProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [cameraAvailable, setCameraAvailable] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Analyzing Portion...');
  
  // WebRTC Live Viewfinder State
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeItemHover, setActiveItemHover] = useState<string | null>(null);
  const [showItemEditor, setShowItemEditor] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCalories, setNewItemCalories] = useState<number>(100);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check camera hardware support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const hasVideoInput = devices.some(device => device.kind === 'videoinput');
          setCameraAvailable(hasVideoInput);
        })
        .catch(() => {
          setCameraAvailable(false);
        });
    } else {
      setCameraAvailable(false);
    }

    return () => {
      stopLiveStream();
    };
  }, []);

  // WebRTC Live Stream attachment sync effect
  useEffect(() => {
    if (isLiveStreamActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(e => console.warn("Video play exception:", e));
    }
  }, [isLiveStreamActive]);

  // WebRTC Live Stream Launcher with 3-tier hardware fallback
  const startLiveStream = async (facing: 'environment' | 'user' = facingMode) => {
    try {
      stopLiveStream();
      triggerHaptic('medium');
      setError(null);
      
      let stream: MediaStream | null = null;
      
      // Tier 1: Try ideal HD resolution with specified facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (err1) {
        // Tier 2: Try basic facing mode constraint without width/height requirements
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing }
          });
        } catch (err2) {
          // Tier 3: Universal fallback to any default video device
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        setIsLiveStreamActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Video play error:", e));
        }
      }
    } catch (err: any) {
      console.warn("Live stream initialization notice:", err);
      setIsLiveStreamActive(false);
      setError("Webcam stream unavailable. Use Phone Camera or File Upload below.");
      // Fall back to native file camera picker if on mobile
      cameraInputRef.current?.click();
    }
  };

  const stopLiveStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveStreamActive(false);
  };

  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isLiveStreamActive) {
      startLiveStream(nextFacing);
    }
  };

  const captureLiveFrame = () => {
    if (!videoRef.current) return;
    triggerHaptic('heavy');
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImage(dataUrl);
      stopLiveStream();
      processImageAnalysis(dataUrl);
    }
  };

  const handleSampleScan = (sample: typeof SAMPLE_DISHES[0]) => {
    stopLiveStream();
    triggerHaptic('medium');
    setImage('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzEzZWMzNyIvPjwvc3ZnPg==');
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStatus(`Analyzing multi-item components for ${sample.label}...`);
    
    setTimeout(() => {
      setResult(sample.nutrition as PackagedProductData);
      setLoading(false);
      triggerHaptic('success');
    }, 850);
  };

  const preprocessImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          const maxDim = 900;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          // Contrast enhancement
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          const contrast = 18; 
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // R
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  const processImageAnalysis = async (rawBase64: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (scanMode === 'label') {
      setLoadingStatus('Scanning Nutrition Label OCR & Serving Sizes...');
    } else if (scanMode === 'barcode') {
      setLoadingStatus('OCR Scanning Packaged Product, Barcode & Ingredients...');
    } else {
      setLoadingStatus('Detecting multi-item components, portions, and hidden macros...');
    }

    try {
      const processedBase64 = await preprocessImage(rawBase64);
      const mimeType = processedBase64.match(/data:([^;]+);base64/)?.[1] || 'image/jpeg';
      const base64Data = processedBase64.split(',')[1];

      let successResult: PackagedProductData | null = null;
      
      if (scanMode === 'label') {
        successResult = await analyzeNutritionLabel(base64Data, mimeType);
      } else if (scanMode === 'barcode') {
        successResult = await analyzePackagedProductWithBarcode(base64Data, mimeType, user);
      } else {
        successResult = await analyzeFoodImage(base64Data, mimeType, user);
      }

      if (successResult && successResult.foodName && successResult.calories) {
        setResult(successResult);
        triggerHaptic('success');
      } else {
        throw new Error("Failed to extract food profile from image");
      }
    } catch (err: any) {
      console.error("AI Scan Error: ", err);
      let errMessage = err?.message || String(err);
      if (errMessage.includes('API key') || errMessage.includes('API_KEY_INVALID')) {
        errMessage = 'Custom Gemini API Key missing or invalid. Check your Profile Settings or try our instant sample AI demo below.';
      }
      setError(errMessage);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('medium');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      setImage(rawBase64);
      stopLiveStream();
      processImageAnalysis(rawBase64);
    };
    reader.readAsDataURL(file);
  };

  const handleBarcodeLookup = async (codeToSearch?: string) => {
    const code = codeToSearch || barcodeInput;
    if (!code || !code.trim()) return;
    
    stopLiveStream();
    triggerHaptic('medium');
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStatus(`Searching Open Food Facts DB for barcode ${code}...`);
    
    try {
      const data = await fetchBarcodeNutrition(code);
      setResult(data);
      triggerHaptic('success');
    } catch (err: any) {
      console.error("Barcode search error:", err);
      setError(`Could not retrieve nutrition for barcode '${code}'.`);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  // Itemized Drawer Modifications
  const handleScaleItemPortion = (itemId: string, scaleFactor: number) => {
    if (!result || !result.items) return;
    triggerHaptic('light');
    const updatedItems = result.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          calories: Math.round(item.calories * scaleFactor),
          protein: Math.round(item.protein * scaleFactor),
          carbs: Math.round(item.carbs * scaleFactor),
          fats: Math.round(item.fats * scaleFactor),
          fiber: Math.round(item.fiber * scaleFactor),
          portion: `${scaleFactor}x (${item.portion})`
        };
      }
      return item;
    });

    recalculateTotalFromItems(updatedItems);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!result || !result.items) return;
    triggerHaptic('medium');
    const updatedItems = result.items.filter(item => item.id !== itemId);
    recalculateTotalFromItems(updatedItems);
  };

  const handleAddCustomItem = () => {
    if (!newItemName.trim() || !result) return;
    triggerHaptic('success');
    const newItem: FoodItemDetail = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      calories: newItemCalories,
      protein: Math.round(newItemCalories * 0.15 / 4),
      carbs: Math.round(newItemCalories * 0.5 / 4),
      fats: Math.round(newItemCalories * 0.35 / 9),
      fiber: 2,
      portion: '1 added portion',
      confidence: 100,
      category: 'Snack'
    };

    const currentItems = result.items || [];
    const updatedItems = [...currentItems, newItem];
    recalculateTotalFromItems(updatedItems);
    setNewItemName('');
    setShowItemEditor(false);
  };

  const recalculateTotalFromItems = (updatedItems: FoodItemDetail[]) => {
    if (!result) return;
    const newCal = updatedItems.reduce((sum, item) => sum + item.calories, 0);
    const newProt = updatedItems.reduce((sum, item) => sum + item.protein, 0);
    const newCarbs = updatedItems.reduce((sum, item) => sum + item.carbs, 0);
    const newFats = updatedItems.reduce((sum, item) => sum + item.fats, 0);
    const newFiber = updatedItems.reduce((sum, item) => sum + item.fiber, 0);

    setResult({
      ...result,
      items: updatedItems,
      calories: newCal,
      protein: newProt,
      carbs: newCarbs,
      fats: newFats,
      fiber: newFiber
    });
  };

  const confirmAdd = () => {
    if (result) {
      triggerHaptic('success');
      const updatedPortion = multiplier !== 1 
        ? `${multiplier}x (${result.portionDescription || '1 serving'})` 
        : (result.portionDescription || '1 serving');
      onAddEntry({
        ...result,
        portionDescription: updatedPortion,
        calories: Math.round(result.calories * multiplier),
        protein: Math.round(result.protein * multiplier),
        carbs: Math.round(result.carbs * multiplier),
        fats: Math.round(result.fats * multiplier),
        fiber: Math.round((result.fiber || 0) * multiplier),
      });
      stopLiveStream();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-background-dark z-[100] flex flex-col items-center p-4 md:p-6 overflow-y-auto custom-scrollbar">
      {/* Top Navigation Bar */}
      <div className="w-full flex justify-between items-center mb-4 sticky top-0 bg-background-dark/80 backdrop-blur-md py-2 z-20">
        <button 
          onClick={() => { stopLiveStream(); onClose(); }} 
          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white active:scale-90 transition-all border border-white/10"
        >
          <span className="material-icons-round text-base">close</span>
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-1.5">
            <span className="material-icons-round text-primary text-sm animate-pulse">center_focus_strong</span>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">NutriVision Scanner</h2>
          </div>
          <p className="text-[9px] font-bold text-primary/80 uppercase tracking-widest mt-0.5">Multi-Item AI Precision</p>
        </div>

        <div className="w-10"></div>
      </div>

      {/* 3-Way Mode Switcher */}
      <div className="bg-white/5 p-1 rounded-2xl flex space-x-1 mb-5 border border-white/10 w-full max-w-sm shrink-0">
        <button
          onClick={() => { setScanMode('photo'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center space-x-1.5 ${
            scanMode === 'photo' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-sm">filter_center_focus</span>
          <span>Multi-Food</span>
        </button>

        <button
          onClick={() => { setScanMode('label'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center space-x-1.5 ${
            scanMode === 'label' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-sm">receipt_long</span>
          <span>Label OCR</span>
        </button>

        <button
          onClick={() => { setScanMode('barcode'); triggerHaptic('light'); }}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center space-x-1.5 ${
            scanMode === 'barcode' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-sm">qr_code_scanner</span>
          <span>Barcode</span>
        </button>
      </div>

      {/* WEBRTC LIVE VIEWFINDER SCREEN */}
      {isLiveStreamActive && !image && !loading && (
        <div className="w-full max-w-sm flex-1 flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-2 border-primary/40 shadow-[0_0_40px_rgba(19,236,55,0.2)] bg-black">
            <video 
              ref={videoRef} 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />

            {/* Viewfinder HUD Overlays */}
            <div className="absolute inset-0 border-[16px] border-black/30 pointer-events-none"></div>
            
            {/* Target Reticle corners */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>

            {/* Laser scanning beam */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_#13ec37] animate-[scan_2.5s_ease-in-out_infinite]"></div>

            {/* Floating Live Guidance Badge */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/30 flex items-center space-x-2 text-white text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span>{scanMode === 'label' ? 'Center Nutrition Facts Table' : scanMode === 'barcode' ? 'Align Barcode in View' : 'Center Plate for Multi-Food Scan'}</span>
            </div>

            {/* Camera Control Overlay */}
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <button 
                onClick={toggleFacingMode}
                className="w-10 h-10 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <span className="material-icons-round text-lg">flip_camera_ios</span>
              </button>
            </div>
          </div>

          {/* Shutter Controls */}
          <div className="flex items-center justify-center space-x-6 w-full pt-2">
            <button 
              onClick={() => { stopLiveStream(); fileInputRef.current?.click(); }}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Gallery Upload"
            >
              <span className="material-icons-round text-xl">collections</span>
            </button>

            <button 
              onClick={captureLiveFrame}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-[#13ec37] to-[#10b981] p-1.5 shadow-[0_0_30px_rgba(19,236,55,0.5)] active:scale-90 transition-all hover:scale-105 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full border-4 border-black/40 bg-white/20 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/80"></div>
              </div>
            </button>

            <button 
              onClick={stopLiveStream}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Cancel Live View"
            >
              <span className="material-icons-round text-xl">videocam_off</span>
            </button>
          </div>
        </div>
      )}

      {/* BARCODE SEARCH MODE VIEW */}
      {scanMode === 'barcode' && !image && !result && !loading && !isLiveStreamActive && (
        <div className="w-full max-w-xs space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary border border-primary/20">
              <span className="material-icons-round text-3xl">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Barcode & Packaged Product</h3>
              <p className="text-slate-400 text-xs mt-1">Scan package barcodes or search global food databases instantly.</p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button 
                onClick={() => startLiveStream('environment')}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-3.5 px-5 rounded-2xl shadow-[0_10px_25px_rgba(19,236,55,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.15em] border border-emerald-300/30 group"
              >
                <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-sm text-black">videocam</span>
                </div>
                <span>Start Live Barcode Stream</span>
              </button>

              <button 
                onClick={() => { triggerHaptic('light'); fileInputRef.current?.click(); }}
                className="w-full flex items-center justify-center space-x-3 glass-card bg-white/10 hover:bg-white/15 text-white font-black py-3.5 px-5 rounded-2xl border border-white/20 active:scale-95 transition-all text-xs uppercase tracking-[0.15em]"
              >
                <span className="material-icons-round text-sm text-primary">collections</span>
                <span>Upload Product Image</span>
              </button>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10 text-left">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Or Enter Barcode Number:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 737628001143"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeLookup()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => handleBarcodeLookup()}
                  className="bg-primary text-background-dark px-4 py-2 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all"
                >
                  Search
                </button>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2">Try Sample Barcodes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: '737628001143', label: 'Rice Noodles' },
                    { code: '3017620422003', label: 'Nutella' },
                    { code: '5449000000996', label: 'Coca-Cola' }
                  ].map((sample) => (
                    <button
                      key={sample.code}
                      onClick={() => { setBarcodeInput(sample.code); handleBarcodeLookup(sample.code); }}
                      className="text-[10px] font-semibold bg-white/5 hover:bg-primary/20 text-slate-300 hover:text-primary px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LABEL OCR MODE VIEW */}
      {scanMode === 'label' && !image && !result && !loading && !isLiveStreamActive && (
        <div className="w-full max-w-xs space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary border border-primary/20">
              <span className="material-icons-round text-3xl">receipt_long</span>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Nutrition Facts Label OCR</h3>
              <p className="text-slate-400 text-xs mt-1">Point your camera directly at the nutrition table on the back of any food package.</p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button 
                onClick={() => startLiveStream('environment')}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-3.5 px-5 rounded-2xl shadow-[0_10px_25px_rgba(19,236,55,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.15em] border border-emerald-300/30 group"
              >
                <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                  <span className="material-icons-round text-sm text-black">photo_camera</span>
                </div>
                <span>Open Label Scanner</span>
              </button>

              <button 
                onClick={() => { triggerHaptic('light'); fileInputRef.current?.click(); }}
                className="w-full flex items-center justify-center space-x-3 glass-card bg-white/10 hover:bg-white/15 text-white font-black py-3.5 px-5 rounded-2xl border border-white/20 active:scale-95 transition-all text-xs uppercase tracking-[0.15em]"
              >
                <span className="material-icons-round text-sm text-primary">collections</span>
                <span>Upload Label Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI MULTI-FOOD PHOTO ENTRY VIEW */}
      {scanMode === 'photo' && !image && !result && !loading && !isLiveStreamActive && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-xs animate-in fade-in zoom-in-95 duration-500">
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-700 animate-pulse"></div>
            <div className="w-56 h-56 border-2 border-dashed border-primary/40 rounded-[2.5rem] flex items-center justify-center bg-primary/5 relative overflow-hidden transition-all duration-500">
              <span className="material-icons-round text-6xl text-primary animate-bounce">center_focus_strong</span>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-white">Multi-Food Vision Scanner</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Detects every component, side dish, sauce, and portion size on your plate with forensic accuracy.
            </p>
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={() => { stopLiveStream(); triggerHaptic('medium'); cameraInputRef.current?.click(); }}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-4 px-6 rounded-2xl shadow-[0_10px_30px_rgba(19,236,55,0.35)] hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.15em] border border-emerald-300/30 group"
            >
              <div className="w-7 h-7 rounded-xl bg-black/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <span className="material-icons-round text-base text-black">photo_camera</span>
              </div>
              <span>Phone Camera (Native App)</span>
            </button>

            <button 
              onClick={() => startLiveStream('environment')}
              className="w-full flex items-center justify-center space-x-3 glass-card bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.15em] group"
            >
              <div className="w-6 h-6 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-primary group-hover:scale-110 transition-transform">
                <span className="material-icons-round text-base">videocam</span>
              </div>
              <span>Start Live Viewfinder</span>
            </button>

            <button 
              onClick={() => { triggerHaptic('light'); fileInputRef.current?.click(); }}
              className="w-full flex items-center justify-center space-x-3 glass-card bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.15em] group"
            >
              <span className="material-icons-round text-sm text-slate-400">collections</span>
              <span>Upload Photo File</span>
            </button>

            {/* Instant Sample Multi-Food Cards */}
            <div className="w-full text-left pt-3 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Or Try Multi-Item AI Demo:</span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_DISHES.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSampleScan(sample)}
                    className="glass-card p-3 rounded-2xl border border-white/10 hover:border-primary/50 text-left flex items-center space-x-2.5 transition-all group active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="material-icons-round text-base">{sample.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">{sample.label}</p>
                      <p className="text-[8px] font-semibold text-primary">{sample.nutrition.calories} kcal • {sample.nutrition.items.length} items</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Hidden Input Elements */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        ref={cameraInputRef}
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* SCANNING ANALYSIS OR RESULT DISPLAY */}
      {(image || loading || result || error) && !isLiveStreamActive && (
        <div className="flex-1 w-full max-w-sm flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          {/* IMAGE PREVIEW WITH INTERACTIVE BOUNDING BOX OVERLAYS */}
          {image && (
            <div className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl group bg-black">
              <img src={image} alt="Scanned Food" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              
              {/* Bounding Box Visual Overlay Badges */}
              {result && result.items && result.items.length > 0 && !loading && (
                <div className="absolute inset-0 pointer-events-auto">
                  {result.items.map((item) => {
                    const box = item.boundingBox;
                    if (!box) return null;
                    const isHovered = activeItemHover === item.id;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setActiveItemHover(item.id)}
                        onMouseLeave={() => setActiveItemHover(null)}
                        onClick={() => {
                          setActiveItemHover(item.id);
                          triggerHaptic('light');
                        }}
                        style={{
                          top: `${box.ymin}%`,
                          left: `${box.xmin}%`,
                          width: `${Math.max(15, box.xmax - box.xmin)}%`,
                          height: `${Math.max(15, box.ymax - box.ymin)}%`,
                        }}
                        className={`absolute border-2 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between p-1.5 ${
                          isHovered 
                            ? 'border-primary bg-primary/20 shadow-[0_0_20px_#13ec37] z-20 scale-105' 
                            : 'border-white/60 bg-black/30 hover:border-primary hover:bg-primary/10'
                        }`}
                      >
                        <span className="text-[8px] font-black bg-black/80 text-primary px-1.5 py-0.5 rounded-full self-start truncate max-w-full">
                          {item.name}
                        </span>
                        <span className="text-[8px] font-bold bg-primary text-black px-1.5 py-0.5 rounded-full self-end">
                          {item.calories} kcal
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scanning Animation Header overlay */}
              {loading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-center px-4">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/50 shadow-[0_0_20px_#13ec37] animate-[scan_2s_ease-in-out_infinite]"></div>
                  <div className="p-5 bg-black/50 rounded-3xl border border-white/10 backdrop-blur-lg flex flex-col items-center max-w-[280px]">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-primary font-black uppercase tracking-[0.2em] text-[10px] animate-pulse leading-relaxed">{loadingStatus}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANALYSIS RESULT CARD & MULTI-ITEM DRAWER */}
          {result && !loading && (
            <div className="glass-card rounded-[2.5rem] p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 border border-white/10 shadow-2xl">
              
              {/* Header Title & Overall Confidence Rating */}
              <div className="flex justify-between items-start">
                <div className="space-y-1 pr-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="material-icons-round text-primary text-base">center_focus_strong</span>
                    <h3 className="text-lg font-black text-white tracking-tight leading-tight line-clamp-2">{result.foodName}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {result.confidenceScore && (
                      <span className="text-[9px] font-black bg-primary/20 border border-primary/30 text-primary px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <span className="material-icons-round text-[10px]">verified</span>
                        <span>{result.confidenceScore}% AI Precision</span>
                      </span>
                    )}

                    {result.healthScore && (
                      <span className="text-[9px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full">
                        Score: {result.healthScore}/100
                      </span>
                    )}

                    {result.dishType && (
                      <span className="text-[9px] font-semibold bg-white/10 text-white/80 px-2.5 py-0.5 rounded-full">
                        {result.dishType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-3xl font-black text-primary leading-tight">{Math.round((result.calories || 0) * multiplier)}</p>
                  <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Total kcal</p>
                </div>
              </div>

              {/* Portion Scaling Control */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Meal Scale</p>
                  <p className="text-[10px] font-bold text-white/80">{result.portionDescription}</p>
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                  {[0.5, 1, 1.5, 2].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMultiplier(m)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                        multiplier === m 
                          ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105' 
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      {m === 0.5 ? '½' : m === 1 ? '1x' : m === 1.5 ? '1.5x' : '2x'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plate Macro Overview Cards */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Prot', val: Math.round((result.protein || 0) * multiplier), color: 'text-primary' },
                  { label: 'Carb', val: Math.round((result.carbs || 0) * multiplier), color: 'text-white' },
                  { label: 'Fat', val: Math.round((result.fats || 0) * multiplier), color: 'text-amber-400' },
                  { label: 'Fiber', val: Math.round((result.fiber || 0) * multiplier), color: 'text-emerald-400' },
                ].map((macro) => (
                  <div key={macro.label} className="text-center p-2.5 bg-white/5 rounded-2xl border border-white/5">
                    <p className={`text-sm font-black ${macro.color}`}>{macro.val}g</p>
                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">{macro.label}</p>
                  </div>
                ))}
              </div>

              {/* Hidden Calorie Warning Banner */}
              {result.hiddenCalorieWarning && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start space-x-2.5 text-left">
                  <span className="material-icons-round text-amber-400 text-sm mt-0.5">visibility</span>
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Hidden Calorie Alert</p>
                    <p className="text-[11px] text-amber-200/90 font-medium leading-tight mt-0.5">{result.hiddenCalorieWarning}</p>
                  </div>
                </div>
              )}

              {/* Cooking Method & Identified Ingredients */}
              {result.cookingMethod && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-left">
                  <span className="material-icons-round text-primary text-sm">soup_kitchen</span>
                  <span>Preparation: <strong className="text-white">{result.cookingMethod}</strong></span>
                </div>
              )}

              {result.ingredientsList && result.ingredientsList.length > 0 && (
                <div className="space-y-1.5 text-left bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
                    <span className="material-icons-round text-xs">restaurant_menu</span>
                    <span>Identified Recipe Ingredients:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {result.ingredientsList.map((ing, i) => (
                      <span key={i} className="text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-lg">
                        • {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary Badges */}
              {result.dietaryTags && result.dietaryTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.dietaryTags.map((tag, i) => (
                    <span key={i} className="text-[9px] font-bold bg-white/5 border border-white/10 text-white/90 px-2.5 py-1 rounded-xl">
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* MULTI-ITEM ITEMIZATION DRAWER */}
              {result.items && result.items.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-white/10 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                      <span className="material-icons-round text-sm">checklist</span> Detected Items ({result.items.length}):
                    </p>
                    <button
                      onClick={() => setShowItemEditor(!showItemEditor)}
                      className="text-[10px] font-black text-primary hover:underline flex items-center space-x-1"
                    >
                      <span className="material-icons-round text-[11px]">add_circle</span>
                      <span>Add Item</span>
                    </button>
                  </div>

                  {/* Add Custom Component Form */}
                  {showItemEditor && (
                    <div className="p-3 bg-white/5 rounded-2xl border border-primary/30 space-y-2 animate-in fade-in duration-200">
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Add Custom Plate Component</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Extra Olive Oil / Sauce"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="flex-[2] bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                        />
                        <input
                          type="number"
                          placeholder="kcal"
                          value={newItemCalories}
                          onChange={(e) => setNewItemCalories(Number(e.target.value))}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={handleAddCustomItem}
                          className="bg-primary text-black font-black px-3 rounded-xl text-xs hover:brightness-110 active:scale-95 transition-all"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Itemized Cards List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {result.items.map((item) => {
                      const isHovered = activeItemHover === item.id;
                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => setActiveItemHover(item.id)}
                          onMouseLeave={() => setActiveItemHover(null)}
                          className={`p-3 rounded-2xl border transition-all ${
                            isHovered 
                              ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' 
                              : 'bg-white/5 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                              <p className="text-xs font-black text-white truncate">{item.name}</p>
                              {item.category && (
                                <span className="text-[8px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-full shrink-0">
                                  {item.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-xs font-black text-primary">{item.calories} kcal</span>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                title="Remove Item"
                              >
                                <span className="material-icons-round text-sm">delete</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{item.portion} • {item.protein}g P | {item.carbs}g C | {item.fats}g F</span>
                            
                            <div className="flex space-x-1">
                              {[0.5, 1.5].map((factor) => (
                                <button
                                  key={factor}
                                  onClick={() => handleScaleItemPortion(item.id, factor)}
                                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-primary/20 text-white hover:text-primary transition-all font-bold"
                                >
                                  {factor === 0.5 ? '½x' : '1.5x'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full Ingredient List for Packaged Products */}
              {result.ingredientsList && result.ingredientsList.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/10 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                      <span className="material-icons-round text-sm">fact_check</span> Full Ingredient List ({result.ingredientsList.length}):
                    </p>
                    {result.brand && (
                      <span className="text-[9px] font-bold bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
                        Brand: {result.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-2 bg-white/5 rounded-2xl border border-white/5">
                    {result.ingredientsList.map((ing, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-primary/10 border border-primary/20 text-white/90 px-2.5 py-1 rounded-xl">
                        • {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Log / Reset Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button 
                  onClick={() => { setImage(null); setResult(null); setError(null); startLiveStream('environment'); }}
                  className="flex-1 bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest active:scale-[0.95] transition-all hover:bg-white/10"
                >
                  Rescan
                </button>
                <button 
                  onClick={confirmAdd}
                  className="flex-[2] bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-widest"
                >
                  Log Plate to Diary
                </button>
              </div>
            </div>
          )}

          {/* ERROR DISPLAY */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-400 text-center animate-in shake duration-500">
              <span className="material-icons-round text-3xl mb-2">error_outline</span>
              <p className="text-xs font-bold leading-relaxed">{error}</p>
              <button 
                onClick={() => { setImage(null); setResult(null); setError(null); }}
                className="mt-4 px-6 py-2 bg-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/30 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          {/* Hidden File Inputs */}
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={cameraInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
        </div>
      )}
      <div className="h-10"></div>
    </div>
  );
};

export default CameraScan;