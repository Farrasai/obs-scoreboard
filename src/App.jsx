import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Plus, Minus, MonitorPlay, Smartphone, Settings2, RefreshCw, ArrowLeft, Image as ImageIcon, Palette, X, Copy, Check } from 'lucide-react';

const DEFAULT_STATE = {
  sport: 'football', // football, volleyball, esport, table_tennis
  teamA: { name: 'TEAM A', score: 0, color: '#ef4444', logo: '' },
  teamB: { name: 'TEAM B', score: 0, color: '#3b82f6', logo: '' },
  matchInfo: { period: '1st Half', setsA: 0, setsB: 0, server: 'A' },
  timer: { minutes: 0, seconds: 0, isRunning: false },
  showOverlay: true,
  design: { fontFamily: 'ui-sans-serif, system-ui, sans-serif', titleSize: 30 }
};

export default function App() {
  // Cek URL untuk direct link (misal: ?mode=overlay)
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam === 'overlay' || modeParam === 'controller') return modeParam;
    }
    return null;
  }); 
  const [gameState, setGameState] = useState(DEFAULT_STATE);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const channelRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize BroadcastChannel for tab-to-tab communication
  useEffect(() => {
    channelRef.current = new BroadcastChannel('obs_scoreboard_sync');
    
    if (mode === 'overlay') {
      document.body.style.backgroundColor = 'transparent'; // Essential for OBS
      channelRef.current.onmessage = (event) => {
        if (event.data) {
          // Fallback missing states for backward compatibility if needed
          const data = event.data;
          if (!data.design) data.design = DEFAULT_STATE.design;
          setGameState(data);
        }
      };
    } else if (mode === 'controller') {
      document.body.style.backgroundColor = '#f3f4f6';
      // Sync initial state to overlay when controller opens
      channelRef.current.postMessage(gameState);
    }

    return () => {
      if (channelRef.current) channelRef.current.close();
    };
  }, [mode]);

  // Timer Logic (Only runs on controller, syncs to overlay)
  useEffect(() => {
    if (mode === 'controller') {
      if (gameState.timer.isRunning) {
        timerRef.current = setInterval(() => {
          setGameState((prev) => {
            let newSec = prev.timer.seconds + 1;
            let newMin = prev.timer.minutes;
            if (newSec >= 60) {
              newSec = 0;
              newMin += 1;
            }
            const newState = {
              ...prev,
              timer: { ...prev.timer, minutes: newMin, seconds: newSec }
            };
            channelRef.current.postMessage(newState);
            return newState;
          });
        }, 1000);
      } else {
        clearInterval(timerRef.current);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [mode, gameState.timer.isRunning]);

  const updateState = (updater) => {
    setGameState((prev) => {
      const updates = typeof updater === 'function' ? updater(prev) : updater;
      // Merge top-level properties so we don't accidentally drop state keys
      const newState = { ...prev, ...updates };
      
      // Ensure design object exists when merging
      if (!newState.design) newState.design = DEFAULT_STATE.design;
      
      channelRef.current.postMessage(newState);
      return newState;
    });
  };

  // Handle Logo Upload and Compress (Max 150px)
  const handleLogoUpload = (e, teamKey) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150; 
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        
        canvas.width = width; 
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to Base64 Data URL to allow cross-tab syncing without a backend
        const dataUrl = canvas.toDataURL('image/png');
        updateState(p => ({
          [teamKey]: { ...p[teamKey], logo: dataUrl }
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be selected again if removed
    e.target.value = null; 
  };

  // --- SELECTION SCREEN ---
  if (!mode) {
    const handleCopyLink = (targetMode) => {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', targetMode);
      
      // Copy URL ke Clipboard
      const copyText = document.createElement("textarea");
      copyText.value = url.toString();
      document.body.appendChild(copyText);
      copyText.select();
      document.execCommand("copy");
      document.body.removeChild(copyText);

      setCopiedLink(targetMode);
      setTimeout(() => setCopiedLink(null), 2000); // Reset icon setelah 2 detik
    };

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          PRO Scoreboard Generator
        </h1>
        <p className="text-slate-400 mb-12">Pilih mode untuk perangkat ini</p>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
          {/* Overlay Card */}
          <div className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 flex flex-col items-center transition-all hover:border-blue-500 shadow-xl">
            <MonitorPlay size={64} className="text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Mode OBS Overlay</h2>
            <p className="text-center text-slate-400 text-sm mb-6 flex-1">
              Pilih ini jika Anda memasukkan URL/File ini di dalam OBS Browser Source. Background otomatis transparan.
            </p>
            <div className="w-full flex gap-3">
              <button onClick={() => setMode('overlay')} className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-colors">
                Buka Mode Ini
              </button>
              <button onClick={() => handleCopyLink('overlay')} className="px-4 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors flex items-center justify-center" title="Copy Direct URL Overlay">
                {copiedLink === 'overlay' ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {/* Controller Card */}
          <div className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 flex flex-col items-center transition-all hover:border-emerald-500 shadow-xl">
            <Settings2 size={64} className="text-emerald-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Mode Control Panel</h2>
            <p className="text-center text-slate-400 text-sm mb-6 flex-1">
              Pilih ini di tab terpisah atau PC lain untuk mengontrol skor dan tampilan. Perubahan akan tersinkronisasi.
            </p>
            <div className="w-full flex gap-3">
              <button onClick={() => setMode('controller')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl font-bold transition-colors">
                Buka Mode Ini
              </button>
              <button onClick={() => handleCopyLink('controller')} className="px-4 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors flex items-center justify-center" title="Copy Direct URL Controller">
                {copiedLink === 'controller' ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- CONTROLLER MODE ---
  if (mode === 'controller') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans pb-24">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  try {
                    window.history.pushState({}, '', window.location.pathname); // Hapus query params dari URL
                  } catch (error) {
                    // Abaikan error SecurityError jika berjalan di dalam iframe
                    console.warn("pushState diabaikan dalam lingkungan iframe.");
                  }
                  setMode(null);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
                title="Kembali ke Pilihan Mode"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Control Panel</h1>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${gameState.showOverlay ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Overlay {gameState.showOverlay ? 'Live' : 'Hidden'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <select 
                className="flex-1 md:flex-none bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                value={gameState.sport}
                onChange={(e) => updateState({ sport: e.target.value })}
              >
                <option value="football">⚽ Sepak Bola / Futsal</option>
                <option value="volleyball">🏐 Bola Voli</option>
                <option value="esport">🎮 E-Sports (FIFA/MLBB)</option>
                <option value="table_tennis">🏓 Tenis Meja</option>
              </select>
              <button 
                onClick={() => updateState({ showOverlay: !gameState.showOverlay })}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-semibold transition-colors ${gameState.showOverlay ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {gameState.showOverlay ? 'Hide Overlay' : 'Show Overlay'}
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            
            {/* DESIGN SETTINGS SECTION */}
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-50 shadow-sm col-span-1 lg:col-span-3">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Palette size={20} className="text-indigo-500" /> Pengaturan Tampilan Huruf
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Gaya Huruf (Font)</label>
                  <select 
                    value={gameState.design?.fontFamily || DEFAULT_STATE.design.fontFamily}
                    onChange={(e) => updateState(p => ({ design: { ...p.design, fontFamily: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ui-sans-serif, system-ui, sans-serif">Modern (Sans-Serif)</option>
                    <option value="ui-serif, Georgia, serif">Klasik (Serif)</option>
                    <option value="ui-monospace, SFMono-Regular, monospace">Digital (Monospace)</option>
                    <option value="Impact, fantasy">Sporty (Impact/Tebal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Ukuran Teks Nama Tim: {gameState.design?.titleSize || DEFAULT_STATE.design.titleSize}px
                  </label>
                  <input 
                    type="range" min="16" max="64" 
                    value={gameState.design?.titleSize || DEFAULT_STATE.design.titleSize}
                    onChange={(e) => updateState(p => ({ design: { ...p.design, titleSize: parseInt(e.target.value) } }))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* TEAM A CONTROLS */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Tim A (Kiri)</h2>
                <input 
                  type="color" 
                  value={gameState.teamA?.color || '#ef4444'}
                  onChange={(e) => updateState(p => ({ teamA: { ...p.teamA, color: e.target.value } }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                  title="Warna Tim A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nama Tim</label>
                <input 
                  type="text" 
                  value={gameState.teamA?.name || ''}
                  onChange={(e) => updateState(p => ({ teamA: { ...p.teamA, name: e.target.value } }))}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Logo Tim</label>
                <div className="flex items-center gap-2">
                  {gameState.teamA?.logo ? (
                    <div className="relative border border-slate-300 rounded bg-white p-1">
                      <img src={gameState.teamA.logo} alt="Logo A" className="h-10 w-10 object-contain" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded bg-slate-200 flex items-center justify-center text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                     <input 
                        type="file" accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'teamA')}
                        className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                     />
                  </div>
                  {gameState.teamA?.logo && (
                    <button onClick={() => updateState(p => ({ teamA: { ...p.teamA, logo: '' } }))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus Logo">
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center bg-white p-5 rounded-xl border border-slate-200 mt-2">
                <span className="text-sm font-medium text-slate-500 mb-2">SKOR</span>
                <div className="flex items-center gap-6">
                  <button onClick={() => updateState(p => ({ teamA: { ...p.teamA, score: Math.max(0, p.teamA.score - 1) } }))} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 active:scale-95 transition-all"><Minus size={24} /></button>
                  <span className="text-6xl font-black text-slate-800 w-16 text-center">{gameState.teamA?.score || 0}</span>
                  <button onClick={() => updateState(p => ({ teamA: { ...p.teamA, score: (p.teamA?.score || 0) + 1 } }))} className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-200 active:scale-95 transition-all"><Plus size={24} /></button>
                </div>
              </div>

              {(gameState.sport === 'volleyball' || gameState.sport === 'table_tennis') && (
                <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="font-medium text-slate-600">Set Won</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateState(p => ({ matchInfo: { ...p.matchInfo, setsA: Math.max(0, p.matchInfo.setsA - 1) } }))} className="p-1 bg-slate-100 rounded hover:bg-slate-200"><Minus size={16} /></button>
                    <span className="text-xl font-bold">{gameState.matchInfo?.setsA || 0}</span>
                    <button onClick={() => updateState(p => ({ matchInfo: { ...p.matchInfo, setsA: (p.matchInfo?.setsA || 0) + 1 } }))} className="p-1 bg-slate-100 rounded hover:bg-slate-200"><Plus size={16} /></button>
                  </div>
                </div>
              )}
            </div>

            {/* MATCH CONTROLS (Center) */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Match Center</h2>
              
              {/* Timer Section (For Football/Esports) */}
              {(gameState.sport === 'football' || gameState.sport === 'esport') && (
                <div className="bg-slate-900 rounded-xl p-6 text-white mb-6 shadow-md">
                  <div className="text-center mb-4">
                    <span className="text-5xl font-mono font-bold tracking-wider">
                      {String(gameState.timer?.minutes || 0).padStart(2, '0')}:{String(gameState.timer?.seconds || 0).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => updateState(p => ({ timer: { ...p.timer, isRunning: !p.timer.isRunning } }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors ${gameState.timer?.isRunning ? 'bg-amber-500 hover:bg-amber-600 text-amber-950' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                      {gameState.timer?.isRunning ? <Pause size={20} /> : <Play size={20} />}
                      {gameState.timer?.isRunning ? 'Pause' : 'Start'}
                    </button>
                    <button 
                      onClick={() => updateState(p => ({ timer: { ...p.timer, isRunning: false, minutes: 0, seconds: 0 } }))}
                      className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white" title="Reset Timer"
                    >
                      <Square size={20} />
                    </button>
                  </div>
                  <div className="mt-4 flex gap-2">
                     <button onClick={() => updateState(p => ({ timer: { ...p.timer, minutes: Math.max(0, p.timer.minutes - 1) } }))} className="flex-1 bg-slate-800 py-2 text-sm rounded hover:bg-slate-700">-1 Min</button>
                     <button onClick={() => updateState(p => ({ timer: { ...p.timer, minutes: p.timer.minutes + 1 } }))} className="flex-1 bg-slate-800 py-2 text-sm rounded hover:bg-slate-700">+1 Min</button>
                  </div>
                </div>
              )}

              {/* General Match Info */}
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Periode / Keterangan</label>
                  <input 
                    type="text" 
                    value={gameState.matchInfo?.period || ''}
                    onChange={(e) => updateState(p => ({ matchInfo: { ...p.matchInfo, period: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold"
                    placeholder="e.g., 1ST HALF, BO3, FINAL"
                  />
                </div>

                {gameState.sport === 'table_tennis' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <label className="block text-sm font-medium text-slate-600 mb-2 text-center">Server (Servis)</label>
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={() => updateState(p => ({ matchInfo: { ...p.matchInfo, server: 'A' } }))}
                        className={`px-4 py-2 rounded-lg font-bold ${gameState.matchInfo?.server === 'A' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                      >
                        Tim A
                      </button>
                      <button 
                        onClick={() => updateState(p => ({ matchInfo: { ...p.matchInfo, server: 'B' } }))}
                        className={`px-4 py-2 rounded-lg font-bold ${gameState.matchInfo?.server === 'B' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                      >
                        Tim B
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-6">
                  {!showResetConfirm ? (
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw size={18} /> Reset Match
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <button 
                        onClick={() => {
                          updateState({
                            teamA: { ...gameState.teamA, score: 0 },
                            teamB: { ...gameState.teamB, score: 0 },
                            matchInfo: { ...gameState.matchInfo, setsA: 0, setsB: 0 },
                            timer: { ...gameState.timer, isRunning: false, minutes: 0, seconds: 0 }
                          });
                          setShowResetConfirm(false);
                        }}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold flex items-center justify-center shadow-sm"
                      >
                        Ya, Reset
                      </button>
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-3 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-bold flex items-center justify-center shadow-sm"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TEAM B CONTROLS */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <input 
                  type="color" 
                  value={gameState.teamB?.color || '#3b82f6'}
                  onChange={(e) => updateState(p => ({ teamB: { ...p.teamB, color: e.target.value } }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                  title="Warna Tim B"
                />
                <h2 className="text-xl font-bold text-slate-800">Tim B (Kanan)</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 text-right">Nama Tim</label>
                <input 
                  type="text" 
                  value={gameState.teamB?.name || ''}
                  onChange={(e) => updateState(p => ({ teamB: { ...p.teamB, name: e.target.value } }))}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 text-right">Logo Tim</label>
                <div className="flex items-center gap-2 flex-row-reverse">
                  {gameState.teamB?.logo ? (
                    <div className="relative border border-slate-300 rounded bg-white p-1">
                      <img src={gameState.teamB.logo} alt="Logo B" className="h-10 w-10 object-contain" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded bg-slate-200 flex items-center justify-center text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="flex-1 text-right">
                     <input 
                        type="file" accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'teamB')}
                        className="w-full text-sm text-slate-500 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 file:float-right"
                     />
                  </div>
                  {gameState.teamB?.logo && (
                    <button onClick={() => updateState(p => ({ teamB: { ...p.teamB, logo: '' } }))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus Logo">
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center bg-white p-5 rounded-xl border border-slate-200 mt-2">
                <span className="text-sm font-medium text-slate-500 mb-2">SKOR</span>
                <div className="flex items-center gap-6">
                  <button onClick={() => updateState(p => ({ teamB: { ...p.teamB, score: Math.max(0, p.teamB.score - 1) } }))} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 active:scale-95 transition-all"><Minus size={24} /></button>
                  <span className="text-6xl font-black text-slate-800 w-16 text-center">{gameState.teamB?.score || 0}</span>
                  <button onClick={() => updateState(p => ({ teamB: { ...p.teamB, score: (p.teamB?.score || 0) + 1 } }))} className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-200 active:scale-95 transition-all"><Plus size={24} /></button>
                </div>
              </div>

              {(gameState.sport === 'volleyball' || gameState.sport === 'table_tennis') && (
                <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="font-medium text-slate-600">Set Won</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateState(p => ({ matchInfo: { ...p.matchInfo, setsB: Math.max(0, p.matchInfo.setsB - 1) } }))} className="p-1 bg-slate-100 rounded hover:bg-slate-200"><Minus size={16} /></button>
                    <span className="text-xl font-bold">{gameState.matchInfo?.setsB || 0}</span>
                    <button onClick={() => updateState(p => ({ matchInfo: { ...p.matchInfo, setsB: (p.matchInfo?.setsB || 0) + 1 } }))} className="p-1 bg-slate-100 rounded hover:bg-slate-200"><Plus size={16} /></button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- OVERLAY MODE ---
  if (mode === 'overlay') {
    if (!gameState.showOverlay) return null;

    const { sport, teamA, teamB, matchInfo, timer, design } = gameState;

    // Provide fallbacks to avoid undefined errors during fast reloads
    const tA = teamA || DEFAULT_STATE.teamA;
    const tB = teamB || DEFAULT_STATE.teamB;
    const mI = matchInfo || DEFAULT_STATE.matchInfo;
    const tm = timer || DEFAULT_STATE.timer;
    const dsg = design || DEFAULT_STATE.design;

    // Format timer
    const timeString = `${String(tm.minutes).padStart(2, '0')}:${String(tm.seconds).padStart(2, '0')}`;

    // Helper for custom typography
    const textStyle = { fontFamily: dsg.fontFamily, fontSize: `${dsg.titleSize}px`, lineHeight: 1.1 };

    // Layout 1: Football / Futsal (Top Center, Sleek, Gradient)
    if (sport === 'football') {
      return (
        <div className="w-full h-screen overflow-hidden pointer-events-none p-10 flex justify-center items-start font-sans">
          <div className="flex flex-col items-center drop-shadow-2xl">
            <div className="flex bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/20 h-[80px]">
              
              {/* Team A */}
              <div className="flex items-center min-w-[320px]">
                <div className="h-full w-4" style={{ backgroundColor: tA.color }}></div>
                <div className="flex-1 py-2 px-6 flex justify-end items-center gap-4 h-full">
                  <h2 className="font-black tracking-wider text-slate-800 uppercase truncate max-w-[200px]" style={textStyle}>{tA.name}</h2>
                  {tA.logo && <img src={tA.logo} alt="Logo" className="max-h-[50px] max-w-[50px] object-contain drop-shadow" />}
                </div>
                <div className="bg-slate-100 px-6 border-l border-slate-200 h-full flex items-center justify-center min-w-[80px]">
                  <span className="text-5xl font-black text-slate-900">{tA.score}</span>
                </div>
              </div>

              {/* Center Match Info */}
              <div className="bg-slate-900 text-white flex flex-col items-center justify-center px-6 min-w-[150px] relative overflow-hidden h-full">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                <span className="text-4xl font-mono font-bold tracking-widest relative z-10">{timeString}</span>
              </div>

              {/* Team B */}
              <div className="flex items-center min-w-[320px]">
                <div className="bg-slate-100 px-6 border-r border-slate-200 h-full flex items-center justify-center min-w-[80px]">
                  <span className="text-5xl font-black text-slate-900">{tB.score}</span>
                </div>
                <div className="flex-1 py-2 px-6 flex justify-start items-center gap-4 h-full">
                  {tB.logo && <img src={tB.logo} alt="Logo" className="max-h-[50px] max-w-[50px] object-contain drop-shadow" />}
                  <h2 className="font-black tracking-wider text-slate-800 uppercase truncate max-w-[200px]" style={textStyle}>{tB.name}</h2>
                </div>
                <div className="h-full w-4" style={{ backgroundColor: tB.color }}></div>
              </div>

            </div>
            {/* Period Badge */}
            <div className="mt-2 bg-slate-900/80 backdrop-blur-sm text-white px-6 py-1 rounded-full text-sm font-bold tracking-widest uppercase shadow-lg border border-white/10">
              {mI.period}
            </div>
          </div>
        </div>
      );
    }

    // Layout 2: Volleyball (Bottom Center, shows sets)
    if (sport === 'volleyball') {
      return (
        <div className="w-full h-screen overflow-hidden pointer-events-none p-16 flex justify-center items-end font-sans">
          <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50 w-full max-w-4xl flex flex-col">
            
            {/* Header */}
            <div className="text-center py-2 bg-slate-800/50 rounded-t-xl mb-1">
              <span className="text-amber-400 font-bold tracking-widest uppercase text-sm">{mI.period}</span>
            </div>

            {/* Teams Container */}
            <div className="flex flex-col gap-1">
              {/* Team A Row */}
              <div className="flex items-center bg-white rounded-lg overflow-hidden h-[70px]">
                <div className="w-4 h-full" style={{ backgroundColor: tA.color }}></div>
                {tA.logo && (
                  <div className="pl-4 h-full flex items-center justify-center">
                    <img src={tA.logo} alt="Logo A" className="max-h-[45px] max-w-[45px] object-contain" />
                  </div>
                )}
                <div className={`flex-1 ${tA.logo ? 'px-4' : 'px-6'} flex items-center h-full`}>
                  <h2 className="font-black text-slate-800 uppercase truncate" style={textStyle}>{tA.name}</h2>
                </div>
                <div className="px-6 h-full bg-slate-200 flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-xs font-bold text-slate-500 uppercase leading-tight">Sets</span>
                  <span className="text-3xl font-black text-slate-800 leading-tight">{mI.setsA}</span>
                </div>
                <div className="px-8 h-full bg-amber-400 min-w-[120px] flex items-center justify-center">
                  <span className="text-6xl font-black text-slate-900">{tA.score}</span>
                </div>
              </div>

              {/* Team B Row */}
              <div className="flex items-center bg-white rounded-lg overflow-hidden h-[70px]">
                <div className="w-4 h-full" style={{ backgroundColor: tB.color }}></div>
                {tB.logo && (
                  <div className="pl-4 h-full flex items-center justify-center">
                    <img src={tB.logo} alt="Logo B" className="max-h-[45px] max-w-[45px] object-contain" />
                  </div>
                )}
                <div className={`flex-1 ${tB.logo ? 'px-4' : 'px-6'} flex items-center h-full`}>
                  <h2 className="font-black text-slate-800 uppercase truncate" style={textStyle}>{tB.name}</h2>
                </div>
                <div className="px-6 h-full bg-slate-200 flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-xs font-bold text-slate-500 uppercase leading-tight">Sets</span>
                  <span className="text-3xl font-black text-slate-800 leading-tight">{mI.setsB}</span>
                </div>
                <div className="px-8 h-full bg-amber-400 min-w-[120px] flex items-center justify-center">
                  <span className="text-6xl font-black text-slate-900">{tB.score}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Layout 3: E-Sports (Top Full Width Bar, Angular)
    if (sport === 'esport') {
      return (
        <div className="w-full h-screen overflow-hidden pointer-events-none flex justify-center items-start font-sans">
          <div className="w-full max-w-6xl flex justify-center mt-6 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
            <div className="flex items-stretch h-16 w-full text-white">
              
              {/* Team A Side */}
              <div className="flex-1 flex justify-end items-center relative overflow-hidden" style={{ backgroundColor: tA.color }}>
                <div className="absolute right-0 top-0 h-full w-12 bg-slate-900 transform translate-x-6 skew-x-12"></div>
                <div className="flex items-center gap-4 pr-12 relative z-10">
                  <h2 className="font-black uppercase tracking-wider drop-shadow-md truncate max-w-[300px]" style={textStyle}>{tA.name}</h2>
                  {tA.logo && <img src={tA.logo} alt="Logo" className="h-10 w-10 object-contain drop-shadow-lg" />}
                </div>
              </div>
              
              {/* Score Box A */}
              <div className="bg-slate-900 w-24 flex items-center justify-center relative z-20">
                <span className="text-5xl font-black">{tA.score}</span>
              </div>

              {/* Center Info */}
              <div className="bg-slate-800 px-6 flex flex-col items-center justify-center min-w-[160px] relative z-20 border-x border-slate-700">
                <span className="text-xl font-mono font-bold text-emerald-400">{timeString}</span>
                <span className="text-xs font-bold tracking-widest uppercase text-slate-400">{mI.period}</span>
              </div>

              {/* Score Box B */}
              <div className="bg-slate-900 w-24 flex items-center justify-center relative z-20">
                <span className="text-5xl font-black">{tB.score}</span>
              </div>

              {/* Team B Side */}
              <div className="flex-1 flex justify-start items-center relative overflow-hidden" style={{ backgroundColor: tB.color }}>
                <div className="absolute left-0 top-0 h-full w-12 bg-slate-900 transform -translate-x-6 -skew-x-12"></div>
                <div className="flex items-center gap-4 pl-12 relative z-10">
                  {tB.logo && <img src={tB.logo} alt="Logo" className="h-10 w-10 object-contain drop-shadow-lg" />}
                  <h2 className="font-black uppercase tracking-wider drop-shadow-md truncate max-w-[300px]" style={textStyle}>{tB.name}</h2>
                </div>
              </div>

            </div>
          </div>
        </div>
      );
    }

    // Layout 4: Table Tennis (Minimalist, Right Corner or Top Center)
    if (sport === 'table_tennis') {
      return (
        <div className="w-full h-screen overflow-hidden pointer-events-none p-12 flex justify-center items-start font-sans">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl flex flex-col border-2 border-slate-200 overflow-hidden w-[400px]">
            
            <div className="bg-slate-900 text-white text-center py-2 text-sm font-bold tracking-widest uppercase">
              {mI.period}
            </div>

            <div className="flex flex-col">
              {/* Player A */}
              <div className={`flex items-center p-3 border-b border-slate-200 relative min-h-[70px] ${mI.server === 'A' ? 'bg-amber-50' : 'bg-white'}`}>
                {mI.server === 'A' && <div className="absolute left-3 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>}
                <div className="ml-8 flex-1 flex items-center gap-3">
                  {tA.logo && <img src={tA.logo} alt="Logo A" className="h-8 w-8 object-contain" />}
                  <h3 className="font-bold text-slate-800 uppercase truncate max-w-[150px]" style={{ fontFamily: dsg.fontFamily, fontSize: `${Math.max(16, dsg.titleSize * 0.7)}px` }}>
                    {tA.name}
                  </h3>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded text-slate-500 font-bold mr-3 text-lg">{mI.setsA}</div>
                <div className="w-16 text-center">
                  <span className="text-5xl font-black text-slate-900">{tA.score}</span>
                </div>
              </div>

              {/* Player B */}
              <div className={`flex items-center p-3 relative min-h-[70px] ${mI.server === 'B' ? 'bg-amber-50' : 'bg-white'}`}>
                {mI.server === 'B' && <div className="absolute left-3 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>}
                <div className="ml-8 flex-1 flex items-center gap-3">
                  {tB.logo && <img src={tB.logo} alt="Logo B" className="h-8 w-8 object-contain" />}
                  <h3 className="font-bold text-slate-800 uppercase truncate max-w-[150px]" style={{ fontFamily: dsg.fontFamily, fontSize: `${Math.max(16, dsg.titleSize * 0.7)}px` }}>
                    {tB.name}
                  </h3>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded text-slate-500 font-bold mr-3 text-lg">{mI.setsB}</div>
                <div className="w-16 text-center">
                  <span className="text-5xl font-black text-slate-900">{tB.score}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      );
    }
  }

  return null;
}