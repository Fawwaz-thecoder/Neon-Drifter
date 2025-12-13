import React, { useState, useEffect } from 'react';
import { GameState, LevelConfig, GameMode, CarConfig } from './types';
import { generateMazeDFS } from './utils/mazeAlg';
import GameCanvas from './components/GameCanvas';
import { DEFAULT_GRID_SIZE, CARS, INITIAL_CREDITS, WIN_REWARD, MAX_LEVEL } from './constants';
import { Play, Timer, Zap, Trophy, ShoppingBag, Lock, AlertTriangle, Car as CarIcon, CircleDollarSign, Check, Users, Swords } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [levelConfig, setLevelConfig] = useState<LevelConfig | null>(null);
  const [gameResult, setGameResult] = useState<boolean | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC);
  const [credits, setCredits] = useState<number>(INITIAL_CREDITS);
  const [unlockedCars, setUnlockedCars] = useState<string[]>(['starter']);
  const [selectedCarId, setSelectedCarId] = useState<string>('starter');
  const [lastScore, setLastScore] = useState<number>(0);
  const [lastTimeTaken, setLastTimeTaken] = useState<number>(0);
  const [lastReward, setLastReward] = useState<number>(0);
  
  // New States
  const [currentLevel, setCurrentLevel] = useState<number>(1); // The level currently being played
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1); // The highest unlocked level
  const [driftHighScore, setDriftHighScore] = useState<number>(0);

  const currentCar = CARS.find(c => c.id === selectedCarId) || CARS[0];
  const isBonusLevel = gameMode === GameMode.CLASSIC && currentLevel % 21 === 0 && currentLevel > 1;

  useEffect(() => {
    // Load persisted data
    const savedScore = localStorage.getItem('neon_drifter_high_drift');
    if (savedScore) setDriftHighScore(parseInt(savedScore));

    const savedMaxLevel = localStorage.getItem('neon_drifter_max_level');
    if (savedMaxLevel) setMaxUnlockedLevel(parseInt(savedMaxLevel));

    const savedCredits = localStorage.getItem('neon_drifter_credits');
    if (savedCredits) setCredits(parseInt(savedCredits));
    
    const savedCars = localStorage.getItem('neon_drifter_cars');
    if (savedCars) setUnlockedCars(JSON.parse(savedCars));
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('neon_drifter_credits', credits.toString());
    localStorage.setItem('neon_drifter_max_level', maxUnlockedLevel.toString());
    localStorage.setItem('neon_drifter_cars', JSON.stringify(unlockedCars));
  }, [credits, maxUnlockedLevel, unlockedCars]);

  const startGame = (mode: GameMode, levelOverride?: number) => {
    setGameMode(mode);
    
    // Set current level if Classic
    const levelToPlay = levelOverride || (mode === GameMode.CLASSIC ? maxUnlockedLevel : 1);
    if (mode === GameMode.CLASSIC) setCurrentLevel(levelToPlay);

    // Calculate grid size based on level if Classic
    let width = DEFAULT_GRID_SIZE;
    let height = DEFAULT_GRID_SIZE;
    const isBonus = mode === GameMode.CLASSIC && levelToPlay % 21 === 0 && levelToPlay > 1;
    
    if (mode === GameMode.CLASSIC) {
        if (isBonus) {
            // Bonus levels are always medium sized for density
            width = 17;
            height = 17;
        } else {
            const growth = Math.floor((levelToPlay - 1) / 5) * 2;
            const size = Math.min(51, 15 + growth);
            width = size;
            height = size;
        }
    }

    const { grid, start, goal } = generateMazeDFS(width, height, isBonus);
    setLevelConfig({ grid, startPos: start, goalPos: goal, name: mode });
    setGameState(GameState.PLAYING);
    setGameResult(null);
  };

  const handleGameOver = (win: boolean, score?: number, timeTaken?: number) => {
    setGameResult(win);
    setLastScore(score || 0);
    setLastTimeTaken(timeTaken || 0);
    
    if (win) {
      let totalReward = WIN_REWARD;
      if (timeTaken) {
         const efficiency = Math.max(0, 60 - timeTaken);
         const timeBonus = Math.floor(efficiency * 10);
         totalReward += timeBonus;
      }
      
      if (score) {
          totalReward += Math.floor(score / 10);
      }

      setLastReward(totalReward);
      setCredits(prev => prev + totalReward);
      
      if (gameMode === GameMode.CLASSIC) {
          if (currentLevel === maxUnlockedLevel && maxUnlockedLevel < MAX_LEVEL) {
              setMaxUnlockedLevel(prev => prev + 1);
          }
      }
      
      if (gameMode === GameMode.DRIFT && score && score > driftHighScore) {
          setDriftHighScore(score);
          localStorage.setItem('neon_drifter_high_drift', score.toString());
      }
    } else {
        setLastReward(0);
    }
    
    if (gameMode === GameMode.DRIFT && score && score > driftHighScore) {
        setDriftHighScore(score);
        localStorage.setItem('neon_drifter_high_drift', score.toString());
    }

    setGameState(GameState.GAME_OVER);
  };

  const handleCollectCoin = (amount: number) => {
    setCredits(prev => prev + amount);
  };

  const resetToMenu = () => {
    setGameState(GameState.MENU);
    setGameResult(null);
  };

  const continueGame = () => {
      if (gameResult && gameMode === GameMode.CLASSIC && currentLevel < MAX_LEVEL) {
           startGame(GameMode.CLASSIC, currentLevel + 1);
      } else {
          resetToMenu();
      }
  };

  const buyCar = (car: CarConfig) => {
    if (credits >= car.price && !unlockedCars.includes(car.id)) {
      setCredits(prev => prev - car.price);
      setUnlockedCars(prev => [...prev, car.id]);
      setSelectedCarId(car.id);
    }
  };

  const range = (start: number, end: number) => Array.from({length: (end - start + 1)}, (v, k) => k + start);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden font-sans text-white bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-emerald-900 to-black">
      {/* Header */}
      <header className="absolute top-0 w-full p-4 z-20 flex justify-center items-center bg-black/40 backdrop-blur-sm border-b border-white/10 h-20">
        <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-500 neon-text-blue flex items-center gap-2 whitespace-nowrap">
          NEON DRIFTER
        </h1>
        <div className="absolute right-4 flex items-center gap-4">
           {gameMode === GameMode.CLASSIC && gameState === GameState.PLAYING && (
               <div className="px-3 py-1 border border-cyan-500/50 bg-black/50 rounded-full text-cyan-400 font-bold text-sm">
                   {isBonusLevel ? 'BONUS LEVEL' : `LVL ${currentLevel} / ${MAX_LEVEL}`}
               </div>
           )}
           <div className="flex items-center gap-2 text-yellow-400 font-mono text-lg bg-black/50 px-4 py-1 rounded-full border border-yellow-400/30">
             <CircleDollarSign size={20} /> <span>{credits}</span>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow relative flex items-center justify-center">
        
        {/* MENU STATE */}
        {gameState === GameState.MENU && (
          <div className="relative z-10 w-full max-w-4xl p-8 flex flex-col md:flex-row gap-8 items-center justify-center animate-fade-in">
             
             {/* Left Panel: Modes */}
             <div className="flex flex-col gap-4 w-full md:w-1/2 overflow-y-auto max-h-[80vh] custom-scrollbar pr-2">
                <h2 className="text-2xl font-bold text-cyan-300 mb-2 neon-text-blue">SELECT MODE</h2>
                
                <button onClick={() => setGameState(GameState.LEVEL_SELECT)} className="group bg-black/60 border-2 border-cyan-500/50 p-4 rounded-xl hover:bg-cyan-900/40 transition-all flex items-center gap-4 relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]">
                   <div className="bg-cyan-500 p-3 rounded-lg text-black group-hover:scale-110 transition shadow-[0_0_10px_#06b6d4]"><Play /></div>
                   <div className="text-left relative z-10">
                     <h3 className="font-bold text-lg text-cyan-400">CLASSIC</h3>
                     <p className="text-xs text-gray-400">Campaign Mode ({maxUnlockedLevel}/{MAX_LEVEL})</p>
                   </div>
                </button>

                <button onClick={() => startGame(GameMode.TIMED)} className="group bg-black/60 border-2 border-red-500/50 p-4 rounded-xl hover:bg-red-900/40 transition-all flex items-center gap-4 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]">
                   <div className="bg-red-500 p-3 rounded-lg text-black group-hover:scale-110 transition shadow-[0_0_10px_#ef4444]"><Timer /></div>
                   <div className="text-left">
                     <h3 className="font-bold text-lg text-red-500">TIMED ATTACK</h3>
                     <p className="text-xs text-gray-400">Race against 60s</p>
                   </div>
                </button>

                <button onClick={() => startGame(GameMode.DRIFT)} className="group bg-black/60 border-2 border-lime-500/50 p-4 rounded-xl hover:bg-lime-900/40 transition-all flex items-center gap-4 shadow-[0_0_15px_rgba(132,204,22,0.3)] hover:shadow-[0_0_25px_rgba(132,204,22,0.6)]">
                   <div className="bg-lime-500 p-3 rounded-lg text-black group-hover:scale-110 transition shadow-[0_0_10px_#84cc16]"><Zap /></div>
                   <div className="text-left">
                     <h3 className="font-bold text-lg text-lime-400">DRIFT KING</h3>
                     <p className="text-xs text-gray-400">Best: {driftHighScore}</p>
                   </div>
                </button>

                <div className="bg-black/40 border border-white/10 p-4 rounded-xl">
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Swords size={18} /> MULTIPLAYER VS BOT</h3>
                    <div className="flex gap-2">
                        <button onClick={() => startGame(GameMode.MULTI_RACE)} className="flex-1 bg-green-900/40 border border-green-500/50 p-3 rounded-lg hover:bg-green-800/40 transition flex flex-col items-center">
                             <div className="bg-green-500 p-2 rounded text-black mb-1"><Users size={16}/></div>
                             <span className="font-bold text-sm">RACE</span>
                        </button>
                        <button onClick={() => startGame(GameMode.MULTI_DRIFT)} className="flex-1 bg-fuchsia-900/40 border border-fuchsia-500/50 p-3 rounded-lg hover:bg-fuchsia-800/40 transition flex flex-col items-center">
                             <div className="bg-fuchsia-500 p-2 rounded text-black mb-1"><Trophy size={16}/></div>
                             <span className="font-bold text-sm text-fuchsia-400">DRIFT</span>
                        </button>
                    </div>
                </div>

             </div>

             {/* Right Panel: Garage Preview */}
             <div className="w-full md:w-1/2 flex flex-col gap-4">
                <div className="bg-black/80 border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] p-6 rounded-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 to-transparent opacity-50"></div>
                   <h2 className="text-xl font-bold text-white relative z-10 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]">CURRENT RIDE</h2>
                   <div className="relative z-10 w-32 h-32 flex items-center justify-center">
                      <CarIcon size={80} color={currentCar.color} />
                   </div>
                   <div className="text-center z-10">
                      <h3 className="text-2xl font-black italic">{currentCar.name.toUpperCase()}</h3>
                      <div className="flex gap-2 mt-2 text-xs text-gray-400 justify-center">
                        <span className="bg-gray-800 px-2 py-1 rounded">SPD: {Math.round(currentCar.speedStat * 100)}</span>
                        <span className="bg-gray-800 px-2 py-1 rounded">HAD: {Math.round(currentCar.turnStat * 100)}</span>
                      </div>
                   </div>
                   <button onClick={() => setGameState(GameState.GARAGE)} className="z-10 mt-4 bg-white hover:bg-gray-200 text-orange-600 px-6 py-2 rounded-full font-bold flex items-center gap-2 transition shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                     <ShoppingBag size={18} /> GO TO GARAGE
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* LEVEL SELECT STATE */}
        {gameState === GameState.LEVEL_SELECT && (
            <div className="w-full max-w-6xl p-8 flex flex-col h-[90vh] animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-black italic text-cyan-400">SELECT LEVEL</h2>
                        <p className="text-gray-400 text-sm">Campaign Progress: {Math.floor((maxUnlockedLevel/MAX_LEVEL)*100)}%</p>
                    </div>
                    <button onClick={resetToMenu} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">BACK</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                        {range(1, MAX_LEVEL).map(lvl => {
                            const isUnlocked = lvl <= maxUnlockedLevel;
                            const isCurrent = lvl === maxUnlockedLevel;
                            const isCompleted = lvl < maxUnlockedLevel;
                            const isBonus = lvl % 21 === 0 && lvl > 1;

                            return (
                                <button
                                    key={lvl}
                                    disabled={!isUnlocked}
                                    onClick={() => startGame(GameMode.CLASSIC, lvl)}
                                    className={`
                                        aspect-square rounded-lg flex flex-col items-center justify-center relative border transition-all
                                        ${isCurrent 
                                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_#0891b2] scale-105 z-10' 
                                            : isCompleted 
                                                ? 'bg-slate-800 border-green-500/50 text-green-400 hover:bg-slate-700' 
                                                : 'bg-black/40 border-gray-800 text-gray-600 cursor-not-allowed'}
                                        ${isBonus && isUnlocked ? 'border-yellow-400 bg-yellow-900/20' : ''}
                                    `}
                                >
                                    <span className="font-bold text-lg">{lvl}</span>
                                    {isBonus && <span className="text-[10px] text-yellow-400 absolute top-1 font-bold">BONUS</span>}
                                    {isCompleted && <Check size={12} className="absolute bottom-1 right-1"/>}
                                    {!isUnlocked && <Lock size={12} className="absolute top-1 right-1 opacity-50"/>}
                                    {isCurrent && <span className="absolute -bottom-2 text-[8px] bg-black px-1 rounded text-cyan-400 font-bold tracking-widest">CURRENT</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* GARAGE STATE */}
        {gameState === GameState.GARAGE && (
          <div className="w-full max-w-6xl p-8 flex flex-col animate-fade-in h-[85vh]">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-3xl font-black italic text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">GARAGE</h2>
               <button onClick={resetToMenu} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">BACK</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-y-auto pb-12 pr-2 custom-scrollbar">
              {CARS.map(car => {
                const isUnlocked = unlockedCars.includes(car.id);
                const isSelected = selectedCarId === car.id;
                const canAfford = credits >= car.price;

                return (
                  <div key={car.id} className={`relative bg-black/60 border-2 p-4 rounded-xl flex flex-col gap-4 transition-all hover:bg-gray-900/80 ${isSelected ? 'border-green-500 shadow-[0_0_20px_#22c55e]' : isUnlocked ? 'border-gray-700' : 'border-red-900/50 opacity-80'}`}>
                     <div className="h-24 flex items-center justify-center bg-gray-900/50 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5"></div>
                        <CarIcon size={60} color={isUnlocked ? car.color : '#333'} />
                     </div>
                     
                     <div className="flex justify-between items-start">
                       <div>
                         <h3 className="font-bold text-lg text-gray-100">{car.name}</h3>
                         {!isUnlocked && <p className="text-yellow-500 text-sm font-mono flex items-center gap-1"><CircleDollarSign size={12}/>{car.price}</p>}
                         {isUnlocked && <p className="text-green-500 text-xs font-mono">OWNED</p>}
                       </div>
                     </div>

                     <div className="space-y-2 text-xs text-gray-400 bg-black/40 p-2 rounded">
                        <div className="flex items-center gap-2">
                           <span className="w-6 font-bold">SPD</span>
                           <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{width: `${car.speedStat * 100}%`}}></div></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-6 font-bold">HAD</span>
                           <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-pink-500" style={{width: `${car.turnStat * 100}%`}}></div></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-6 font-bold">GRP</span>
                           <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{width: `${(car.friction - 0.8) * 500}%`}}></div></div>
                        </div>
                     </div>

                     <button disabled={isSelected || (!isUnlocked && !canAfford)} onClick={() => isUnlocked ? setSelectedCarId(car.id) : buyCar(car)} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${isSelected ? 'bg-green-600 text-white cursor-default' : isUnlocked ? 'bg-gray-700 hover:bg-gray-600 text-white' : canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-gray-900 text-gray-500 cursor-not-allowed'}`}>
                       {isSelected ? 'EQUIPPED' : isUnlocked ? 'SELECT' : canAfford ? 'BUY' : <><Lock size={14}/> LOCKED</>}
                     </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GAME PLAYING STATE */}
        {gameState === GameState.PLAYING && levelConfig && (
          <GameCanvas 
             grid={levelConfig.grid} startPos={levelConfig.startPos} goalPos={levelConfig.goalPos} mode={gameMode}
             carConfig={currentCar} onGameOver={handleGameOver} onExit={resetToMenu} onCollectCoin={handleCollectCoin}
             level={gameMode === GameMode.CLASSIC ? currentLevel : undefined}
             isBonusLevel={isBonusLevel}
          />
        )}

        {/* GAME OVER STATE */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-50 animate-fade-in">
             <div className={`p-10 border-4 ${gameResult ? 'border-green-500 shadow-[0_0_50px_#22c55e]' : 'border-red-500'} rounded-2xl bg-black max-w-sm text-center transform transition-all scale-100`}>
                <h2 className={`text-6xl font-black italic mb-2 ${gameResult ? 'text-green-500' : 'text-red-500'}`}>
                  {gameResult ? 'VICTORY' : 'FAILED'}
                </h2>
                {gameResult && (
                  <div className="my-6">
                    <p className="text-gray-400 text-sm">TOTAL REWARD</p>
                    <div className="flex flex-col items-center">
                        <p className="text-yellow-400 text-4xl font-bold font-mono">+${lastReward}</p>
                        {lastTimeTaken > 0 && lastTimeTaken < 60 && !isBonusLevel && <span className="text-xs text-green-400 mt-1">INCLUDES TIME BONUS</span>}
                        {isBonusLevel && <span className="text-xs text-yellow-400 mt-1">BONUS STAGE COMPLETE!</span>}
                    </div>
                    {gameMode === GameMode.DRIFT && lastScore > 0 && (
                      <div className="mt-2">
                         <p className="text-lime-400 text-sm">Drift Score: {Math.floor(lastScore)}</p>
                         {lastScore === driftHighScore && <p className="text-white text-xs animate-pulse">NEW HIGH SCORE!</p>}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-white mb-8 text-lg font-mono uppercase">
                   {gameResult ? (gameMode.includes('MULTI') ? 'You Beat the Bot!' : 'Sector Cleared') : (gameMode.includes('MULTI') ? 'Bot Won!' : (gameMode === GameMode.TIMED ? 'Time Expired' : 'System Crashed'))}
                </p>
                <button onClick={continueGame} className="bg-white text-black font-black text-xl py-3 px-8 rounded hover:bg-gray-200 transition w-full uppercase tracking-wider">
                  {gameResult && gameMode === GameMode.CLASSIC ? 'NEXT LEVEL' : 'CONTINUE'}
                </button>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
