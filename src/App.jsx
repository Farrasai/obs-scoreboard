import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Plus, Minus, MonitorPlay, Smartphone, Settings2, RefreshCw } from 'lucide-react';

const DEFAULT_STATE = {
  sport: 'football', // football, volleyball, esport, table_tennis
  teamA: { name: 'TEAM A', score: 0, color: '#ef4444', logo: '' },
  teamB: { name: 'TEAM B', score: 0, color: '#3b82f6', logo: '' },
  matchInfo: { period: '1st Half', setsA: 0, setsB: 0, server: 'A' },
  timer: { minutes: 0, seconds: 0, isRunning: false },
  showOverlay: true,
};

export default function App() {
  const [mode, setMode] = useState(null); // 'controller' | 'overlay' | null
  const [gameState, setGameState] = useState(DEFAULT_STATE);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const channelRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize BroadcastChannel for tab-to-tab communication
  useEffect(() => {
    channelRef.current = new BroadcastChannel('obs_scoreboard_sync');
    
    if (mode === 'overlay') {
      document.body.style.backgroundColor = 'transparent'; // Essential for OBS
      channelRef.current.onmessage = (event) => {
        if (event.data) {
          setGameState(event.data);
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
      channelRef.current.postMessage(newState);
      return newState;
    });
  };

  // --- SELECTION SCREEN ---
  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          PRO Scoreboard Generator
        </h1>
        <p className="text-slate-400 mb-12">Pilih mode untuk perangkat ini</p>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
          <button 
            onClick={() => setMode('overlay')}
            className="flex-1 bg-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center transition-all hover:scale-105 group"
          >
            <MonitorPlay size={64} className="text-blue-400 mb-4 group-hover:text-blue-300" />
            <h2 className="text-2xl font-bold mb-2">Mode OBS Overlay</h2>
            <p className="text-center text-slate-400 text-sm">
              Pilih ini jika Anda memasukkan URL/File ini di dalam OBS Browser Source (Set 1920x1080). Background akan transparan.
            </p>
          </button>

          <button 
            onClick={() => setMode('controller')}
            className="flex-1 bg-slate-800 border-2 border-slate-700 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center transition-all hover:scale-105 group"
          >
            <Settings2 size={64} className="text-emerald-400 mb-4 group-hover:text-emerald-300" />
            <h2 className="text-2xl font-bold mb-2">Mode Control Panel</h2>
            <p className="text-center text-slate-400 text-sm">
              Pilih ini di tab terpisah atau HP untuk mengontrol skor dan timer. Perubahan akan langsung tampil di OBS.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // --- CONTROLLER MODE ---
  if (mode === 'controller') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Control Panel</h1>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${gameState.showOverlay ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Overlay {gameState.showOverlay ? 'Live' : 'Hidden'}
              </p>
            </div>
            <div className="flex gap-4">
              <select 
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
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
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${gameState.showOverlay ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {gameState.showOverlay ? 'Hide Overlay' : 'Show Overlay'}
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* TEAM A CONTROLS */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Tim A (Kiri)</h2>
                <input 
                  type="color" 
                  value={gameState.teamA?.color || '#ef4444'}
                  onChange={(e) => updateState(p => ({ teamA: { ...p.teamA, color: e.target.value } }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nama Tim</label>
                  <input 
                    type="text" 
                    value={gameState.teamA?.name || ''}
                    onChange={(e) => updateState(p => ({ teamA: { ...p.teamA, name: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200">
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
            </div>

            {/* MATCH CONTROLS (Center) */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Match Center</h2>
              
              {/* Timer Section (For Football/Esports) */}
              {(gameState.sport === 'football' || gameState.sport === 'esport') && (
                <div className="bg-slate-900 rounded-xl p-6 text-white mb-6">
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
                     <button onClick={() => updateState(p => ({ timer: { ...p.timer, minutes: Math.max(0, p.timer.minutes - 1) } }))} className="flex-1 bg-slate-800 py-1 text-sm rounded">-1 Min</button>
                     <button onClick={() => updateState(p => ({ timer: { ...p.timer, minutes: p.timer.minutes + 1 } }))} className="flex-1 bg-slate-800 py-1 text-sm rounded">+1 Min</button>
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
                
                <div className="mt-auto pt-4 border-t border-slate-200">
                  {!showResetConfirm ? (
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} /> Reset Match
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
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
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center"
                      >
                        Yes, Reset
                      </button>
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold flex items-center justify-center"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TEAM B CONTROLS */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <input 
                  type="color" 
                  value={gameState.teamB?.color || '#3b82f6'}
                  onChange={(e) => updateState(p => ({ teamB: { ...p.teamB, color: e.target.value } }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <h2 className="text-xl font-bold text-slate-800">Tim B (Kanan)</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1 text-right">Nama Tim</label>
                  <input 
                    type="text" 
                    value={gameState.teamB?.name || ''}
                    onChange={(e) => updateState(p => ({ teamB: { ...p.teamB, name: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none text-right"
                  />
                </div>
                
                <div className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200">
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
      </div>
    );
  }

  // --- OVERLAY MODE ---
  if (mode === 'overlay') {
    if (!gameState.showOverlay) return null;

    const { sport, teamA, teamB, matchInfo, timer } = gameState;

    // Provide fallbacks to avoid undefined errors during fast reloads
    const tA = teamA || DEFAULT_STATE.teamA;
    const tB = teamB || DEFAULT_STATE.teamB;
    const mI = matchInfo || DEFAULT_STATE.matchInfo;
    const tm = timer || DEFAULT_STATE.timer;

    // Format timer
    const timeString = `${String(tm.minutes).padStart(2, '0')}:${String(tm.seconds).padStart(2, '0')}`;

    // Layout 1: Football / Futsal (Top Center, Sleek, Gradient)
    if (sport === 'football') {
      return (
        <div className="w-full h-screen overflow-hidden pointer-events-none p-10 flex justify-center items-start font-sans">
          <div className="flex flex-col items-center drop-shadow-2xl">
            <div className="flex bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/20">
              
              {/* Team A */}
              <div className="flex items-center w-[300px]">
                <div className="h-full w-4" style={{ backgroundColor: tA.color }}></div>
                <div className="flex-1 py-3 px-6 text-right">
                  <h2 className="text-3xl font-black tracking-wider text-slate-800 uppercase truncate">{tA.name}</h2>
                </div>
                <div className="bg-slate-100 py-3 px-6 border-l border-slate-200">
                  <span className="text-4xl font-black text-slate-900">{tA.score}</span>
                </div>
              </div>

              {/* Center Match Info */}
              <div className="bg-slate-900 text-white flex flex-col items-center justify-center px-6 min-w-[140px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                <span className="text-3xl font-mono font-bold tracking-widest relative z-10">{timeString}</span>
              </div>

              {/* Team B */}
              <div className="flex items-center w-[300px]">
                <div className="bg-slate-100 py-3 px-6 border-r border-slate-200">
                  <span className="text-4xl font-black text-slate-900">{tB.score}</span>
                </div>
                <div className="flex-1 py-3 px-6 text-left">
                  <h2 className="text-3xl font-black tracking-wider text-slate-800 uppercase truncate">{tB.name}</h2>
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
              <div className="flex items-center bg-white rounded-lg overflow-hidden">
                <div className="w-4 h-full min-h-[60px]" style={{ backgroundColor: tA.color }}></div>
                <div className="flex-1 px-6">
                  <h2 className="text-3xl font-black text-slate-800 uppercase">{tA.name}</h2>
                </div>
                <div className="px-6 py-2 bg-slate-200 flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-xs font-bold text-slate-500 uppercase">Sets</span>
                  <span className="text-2xl font-black text-slate-800">{mI.setsA}</span>
                </div>
                <div className="px-8 py-2 bg-amber-400 min-w-[120px] flex items-center justify-center">
                  <span className="text-5xl font-black text-slate-900">{tA.score}</span>
                </div>
              </div>

              {/* Team B Row */}
              <div className="flex items-center bg-white rounded-lg overflow-hidden">
                <div className="w-4 h-full min-h-[60px]" style={{ backgroundColor: tB.color }}></div>
                <div className="flex-1 px-6">
                  <h2 className="text-3xl font-black text-slate-800 uppercase">{tB.name}</h2>
                </div>
                <div className="px-6 py-2 bg-slate-200 flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-xs font-bold text-slate-500 uppercase">Sets</span>
                  <span className="text-2xl font-black text-slate-800">{mI.setsB}</span>
                </div>
                <div className="px-8 py-2 bg-amber-400 min-w-[120px] flex items-center justify-center">
                  <span className="text-5xl font-black text-slate-900">{tB.score}</span>
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
                {/* Slanted edge effect using borders */}
                <div className="absolute right-0 top-0 h-full w-12 bg-slate-900 transform translate-x-6 skew-x-12"></div>
                <h2 className="text-3xl font-black uppercase tracking-wider pr-12 relative z-10 drop-shadow-md">{tA.name}</h2>
              </div>
              
              {/* Score Box A */}
              <div className="bg-slate-900 w-24 flex items-center justify-center relative z-20">
                <span className="text-4xl font-black">{tA.score}</span>
              </div>

              {/* Center Info */}
              <div className="bg-slate-800 px-6 flex flex-col items-center justify-center min-w-[160px] relative z-20 border-x border-slate-700">
                <span className="text-xl font-mono font-bold text-emerald-400">{timeString}</span>
                <span className="text-xs font-bold tracking-widest uppercase text-slate-400">{mI.period}</span>
              </div>

              {/* Score Box B */}
              <div className="bg-slate-900 w-24 flex items-center justify-center relative z-20">
                <span className="text-4xl font-black">{tB.score}</span>
              </div>

              {/* Team B Side */}
              <div className="flex-1 flex justify-start items-center relative overflow-hidden" style={{ backgroundColor: tB.color }}>
                <div className="absolute left-0 top-0 h-full w-12 bg-slate-900 transform -translate-x-6 -skew-x-12"></div>
                <h2 className="text-3xl font-black uppercase tracking-wider pl-12 relative z-10 drop-shadow-md">{tB.name}</h2>
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
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl flex flex-col border-2 border-slate-200 overflow-hidden w-96">
            
            <div className="bg-slate-900 text-white text-center py-2 text-sm font-bold tracking-widest uppercase">
              {mI.period}
            </div>

            <div className="flex flex-col">
              {/* Player A */}
              <div className={`flex items-center p-3 border-b border-slate-200 relative ${mI.server === 'A' ? 'bg-amber-50' : 'bg-white'}`}>
                {mI.server === 'A' && <div className="absolute left-3 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>}
                <div className="ml-8 flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 uppercase truncate">{tA.name}</h3>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded text-slate-500 font-bold mr-3">{mI.setsA}</div>
                <div className="w-16 text-center">
                  <span className="text-5xl font-black text-slate-900">{tA.score}</span>
                </div>
              </div>

              {/* Player B */}
              <div className={`flex items-center p-3 relative ${mI.server === 'B' ? 'bg-amber-50' : 'bg-white'}`}>
                {mI.server === 'B' && <div className="absolute left-3 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>}
                <div className="ml-8 flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 uppercase truncate">{tB.name}</h3>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded text-slate-500 font-bold mr-3">{mI.setsB}</div>
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