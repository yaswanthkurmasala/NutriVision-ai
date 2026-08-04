import React, { useState, useRef, useEffect } from 'react';
import { analyzeFoodImage, fetchBarcodeNutrition, analyzePackagedProductWithBarcode, PackagedProductData } from '../services/geminiService';
import { NutritionData, UserProfile } from '../types';
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
      portionDescription: '2 slices sourdough with 1 avocado & 2 eggs'
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
      portionDescription: '200g chicken breast, quinoa, broccoli, avocado'
    }
  },
  {
    label: 'Paneer Tikka Salad',
    icon: 'dinner_dining',
    nutrition: {
      foodName: 'Paneer Tikka Protein Bowl',
      calories: 410,
      protein: 26,
      carbs: 22,
      fats: 24,
      fiber: 5,
      portionDescription: '180g paneer tikka with veggies & mint yogurt'
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
      portionDescription: '1 large glass (450ml)'
    }
  }
];

const CameraScan: React.FC<CameraScanProps> = ({ user, onAddEntry, onClose }) => {
  const [scanMode, setScanMode] = useState<'photo' | 'barcode'>('photo');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackagedProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [cameraAvailable, setCameraAvailable] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Analyzing Portion...');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSampleScan = (sample: typeof SAMPLE_DISHES[0]) => {
    triggerHaptic('medium');
    setImage('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzEzZWMzNyIvPjwvc3ZnPg==');
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStatus(`Analyzing ${sample.label} portions and macros...`);
    
    setTimeout(() => {
      setResult(sample.nutrition);
      setLoading(false);
      triggerHaptic('success');
    }, 900);
  };

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
  }, []);

  // Preprocesses images by resizing them to a maximum 800px on either side 
  // and enhancing natural contrast to bring out texture, boundaries and volume details.
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

          const maxDim = 800;
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

          // Draw onto canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Enhance contrast (by 20%) to assist LLM with border and shadow estimation
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          const contrast = 20; 
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // R
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (e) {
          console.error("CameraScan image preprocessing warning:", e);
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('medium');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      setImage(rawBase64); // Display raw user image instantly for visual responsive feedback
      setLoading(true);
      setError(null);
      setResult(null);
      setLoadingStatus(scanMode === 'barcode' ? 'Reading Packaged Barcode & Ingredients...' : 'Preprocessing image...');

      try {
        // Step 1: Pre-process (Resize & Contrast Enhancing)
        const processedBase64 = await preprocessImage(rawBase64);
        
        const mimeType = processedBase64.match(/data:([^;]+);base64/)?.[1] || 'image/jpeg';
        const base64Data = processedBase64.split(',')[1];

        // Step 2: Retry mechanism with exponential backoff
        const maxRetries = 2;
        let attempt = 0;
        let successResult: PackagedProductData | null = null;
        let lastErr: any = null;

        while (attempt < maxRetries) {
          try {
            if (scanMode === 'barcode') {
              setLoadingStatus('OCR Scanning Packaged Product, Barcode & Ingredients...');
              successResult = await analyzePackagedProductWithBarcode(base64Data, mimeType, user);
            } else {
              setLoadingStatus('Analyzing portions and macros...');
              successResult = await analyzeFoodImage(base64Data, mimeType, user);
            }
            
            // Confirm the response is valid and populated
            if (successResult && successResult.foodName && successResult.calories) {
              break; // Success!
            }
          } catch (err: any) {
            attempt++;
            lastErr = err;
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
        }

        if (successResult) {
          setResult(successResult);
          triggerHaptic('success');
        } else {
          throw lastErr || new Error("Failed to extract food profile after retry attempts");
        }

      } catch (err: any) {
        console.error("AI Scan Error: ", err);
        let errMessage = err?.message || String(err);
        if (errMessage.includes('API key') || errMessage.includes('API_KEY_INVALID') || errMessage.includes('{')) {
          errMessage = 'Custom Gemini API Key missing or invalid. Please check your API Key in Profile Settings or use our 1-click sample scanner below.';
        }
        setError(errMessage);
        triggerHaptic('error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBarcodeLookup = async (codeToSearch?: string) => {
    const code = codeToSearch || barcodeInput;
    if (!code || !code.trim()) return;
    
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
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-background-dark z-[100] flex flex-col items-center p-6 overflow-y-auto custom-scrollbar">
      <div className="w-full flex justify-between items-center mb-4 sticky top-0 bg-background-dark/80 backdrop-blur-md py-2 z-10">
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white active:scale-90 transition-transform">
          <span className="material-icons-round">close</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">NutriVision AI</h2>
          <div className="h-0.5 w-8 bg-primary/30 rounded-full mt-0.5"></div>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white/5 p-1 rounded-2xl flex space-x-1 mb-6 border border-white/10 w-full max-w-xs">
        <button
          onClick={() => { setScanMode('photo'); triggerHaptic('light'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            scanMode === 'photo' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-sm">photo_camera</span>
          <span>AI Vision</span>
        </button>
        <button
          onClick={() => { setScanMode('barcode'); triggerHaptic('light'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            scanMode === 'barcode' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-icons-round text-sm">qr_code_scanner</span>
          <span>Barcode</span>
        </button>
      </div>

      {/* BARCODE SCANNER ENTRY VIEW */}
      {scanMode === 'barcode' && !image && !result && !loading && (
        <div className="w-full max-w-xs space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <span className="material-icons-round text-3xl">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Barcode & Packaged Scanner</h3>
              <p className="text-slate-400 text-xs mt-1">Snap a photo of any packaged product or enter barcode for full ingredient analysis.</p>
            </div>

            {/* Packaged Product Camera / Photo Buttons */}
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => {
                  triggerHaptic('medium');
                  if (!cameraAvailable) {
                    fileInputRef.current?.click();
                  } else {
                    cameraInputRef.current?.click();
                  }
                }}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-3.5 px-5 rounded-2xl shadow-[0_10px_25px_rgba(19,236,55,0.3)] hover:shadow-[0_12px_30px_rgba(19,236,55,0.4)] hover:scale-[1.02] active:scale-95 transition-all duration-300 text-xs uppercase tracking-[0.15em] border border-emerald-300/30 group"
              >
                <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-icons-round text-sm text-black">photo_camera</span>
                </div>
                <span>Snap Packaged Product</span>
              </button>

              <button 
                onClick={() => {
                  triggerHaptic('light');
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center justify-center space-x-3 glass-card bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-primary/40 text-white font-black py-3.5 px-5 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 text-xs uppercase tracking-[0.15em] group"
              >
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-primary group-hover:scale-110 transition-transform">
                  <span className="material-icons-round text-sm">collections</span>
                </div>
                <span>Upload Product Image</span>
              </button>
            </div>

            {/* Manual Barcode Input Form */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block text-left">Or Type EAN Barcode Number:</span>
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

              <div className="pt-2 text-left">
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

      {/* AI VISION PHOTO ENTRY VIEW */}
      {scanMode === 'photo' && !image && !result && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-xs animate-in fade-in zoom-in-95 duration-500">
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-700 animate-pulse"></div>
            <div className="w-64 h-64 border-2 border-dashed border-primary/40 rounded-[2.5rem] flex items-center justify-center bg-primary/5 relative overflow-hidden transition-all duration-500">
              <span className="material-icons-round text-7xl text-primary animate-bounce">camera_enhance</span>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black tracking-tight">AI Vision Scan</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our AI calculates macros by visually estimating the portion size of your meal.
            </p>
          </div>

          <div className="w-full space-y-3">
            {!cameraAvailable && (
              <div className="w-full bg-orange-500/10 border border-orange-500/20 p-4.5 rounded-2xl flex items-start space-x-3 text-left animate-in fade-in duration-300">
                <span className="material-icons-round text-orange-400 mt-0.5">no_photography</span>
                <div>
                  <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest leading-none">Camera Unavailable</p>
                  <p className="text-[10px] text-white/60 font-medium leading-relaxed mt-1">
                    No active camera stream detected. Select a meal picture from your local photobook/gallery to start food recognition.
                  </p>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                triggerHaptic('medium');
                if (!cameraAvailable) {
                  fileInputRef.current?.click();
                } else {
                  cameraInputRef.current?.click();
                }
              }}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[#13ec37] via-[#22c55e] to-[#10b981] text-black font-black py-4 px-6 rounded-2xl shadow-[0_10px_30px_rgba(19,236,55,0.35)] hover:shadow-[0_12px_35px_rgba(19,236,55,0.45)] hover:scale-[1.02] active:scale-95 transition-all duration-300 text-xs uppercase tracking-[0.15em] border border-emerald-300/30 group"
            >
              <div className="w-7 h-7 rounded-xl bg-black/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <span className="material-icons-round text-base text-black">
                  {!cameraAvailable ? 'photo_library' : 'photo_camera'}
                </span>
              </div>
              <span>{!cameraAvailable ? 'Select Photo File' : 'Take Photo'}</span>
            </button>

            <button 
              onClick={() => {
                triggerHaptic('light');
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center justify-center space-x-3 glass-card bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-primary/40 text-white font-black py-4 px-6 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 text-xs uppercase tracking-[0.15em] group"
            >
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-primary group-hover:scale-110 transition-transform">
                <span className="material-icons-round text-base">collections</span>
              </div>
              <span>Choose from Gallery</span>
            </button>

            {/* Instant Sample Food Cards */}
            <div className="w-full text-left pt-3 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Or Try Instant AI Vision Demo:</span>
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
                      <p className="text-[8px] font-semibold text-primary">{sample.nutrition.calories} kcal</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Hidden File Input Elements */}
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

      {/* LOADING OR RESULT VIEW */}
      {(image || loading || result || error) && (
        <div className="flex-1 w-full max-w-sm flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {image && (
            <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-2xl group">
              <img src={image} alt="Scanned Food" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              
              {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/50 shadow-[0_0_15px_rgba(19,236,55,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col items-center max-w-[280px]">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-primary font-black uppercase tracking-[0.2em] text-[10px] animate-pulse leading-relaxed">{loadingStatus}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!image && loading && (
            <div className="glass-card rounded-[2rem] p-8 flex flex-col items-center text-center space-y-4 border border-white/10">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-primary font-black uppercase tracking-widest text-xs animate-pulse">{loadingStatus}</p>
            </div>
          )}

          {result && (
            <div className="glass-card rounded-[2rem] p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 relative border border-white/10 shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="space-y-1 pr-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="material-icons-round text-primary text-sm">auto_awesome</span>
                    <h3 className="text-lg font-black text-white tracking-tight line-clamp-1">{result.foodName}</h3>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 mt-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Estimated Portion</p>
                    <p className="text-xs font-bold text-white/90">{result.portionDescription}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-black text-primary leading-tight">{Math.round((result.calories || 0) * multiplier)}</p>
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Total kcal</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fine-tune Portion</p>
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

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Prot', val: Math.round((result.protein || 0) * multiplier), color: 'text-primary' },
                  { label: 'Carb', val: Math.round((result.carbs || 0) * multiplier), color: 'text-white' },
                  { label: 'Fat', val: Math.round((result.fats || 0) * multiplier), color: 'text-white/60' },
                  { label: 'Fiber', val: Math.round((result.fiber || 0) * multiplier), color: 'text-green-400' },
                ].map((macro) => (
                  <div key={macro.label} className="text-center p-2.5 bg-white/5 rounded-2xl border border-white/5">
                    <p className={`text-sm font-black ${macro.color}`}>{macro.val}g</p>
                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">{macro.label}</p>
                  </div>
                ))}
              </div>

              {/* Full Ingredient Breakdown List */}
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

              <div className="flex space-x-3">
                 <button 
                  onClick={() => { setImage(null); setResult(null); setError(null); }}
                  className="flex-1 bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest active:scale-[0.95] transition-all"
                >
                  Reset
                </button>
                <button 
                  onClick={confirmAdd}
                  className="flex-[2] bg-primary text-black font-black py-4 rounded-2xl shadow-xl shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-widest"
                >
                  Log This Meal
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-400 text-center animate-in shake duration-500">
              <span className="material-icons-round text-3xl mb-2">error_outline</span>
              <p className="text-sm font-bold leading-relaxed">{error}</p>
              <button 
                onClick={() => { setImage(null); setResult(null); setError(null); }}
                className="mt-4 px-6 py-2 bg-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/30 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
      <div className="h-10"></div>
    </div>
  );
};

export default CameraScan;