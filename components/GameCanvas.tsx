import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CarState, Grid, CellType, Position, GameMode, CarConfig } from '../types';
import { TILE_SIZE, CAR_SIZE, NEON_BLUE, NEON_PINK, WALL_COLOR, COIN_VALUE, BONUS_COIN_VALUE, NEON_YELLOW, NEON_RED, NEON_GREEN } from '../constants';
import { Pause, Play, Timer, Trophy, LogOut, Zap, Users, Swords, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { findPathBFS } from '../utils/pathing';

interface GameCanvasProps {
  grid: Grid;
  startPos: Position;
  goalPos: Position;
  mode: GameMode;
  carConfig: CarConfig;
  onGameOver: (win: boolean, score?: number, timeTaken?: number) => void;
  onExit: () => void;
  onCollectCoin: (amount: number) => void;
  level?: number;
  isBonusLevel?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ grid, startPos, goalPos, mode, carConfig, onGameOver, onExit, onCollectCoin, level, isBonusLevel = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Viewport
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const gridRef = useRef<Grid>(grid.map(row => [...row]));

  useEffect(() => { gridRef.current = grid.map(row => [...row]); }, [grid]);

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Constants
  const FRICTION = (mode === GameMode.DRIFT || mode === GameMode.MULTI_DRIFT) ? 0.99 : carConfig.friction; 
  const BASE_ACCEL = carConfig.accel;
  const BASE_MAX_SPEED = carConfig.maxSpeed;
  const TURN_SPEED = carConfig.turnSpeed * ((mode === GameMode.DRIFT || mode === GameMode.MULTI_DRIFT) ? 1.2 : 1.0);
  
  // Player State
  const carRef = useRef<CarState>({
    x: startPos.x * TILE_SIZE + TILE_SIZE / 2,
    y: startPos.y * TILE_SIZE + TILE_SIZE / 2,
    angle: 0,
    speed: 0,
    vx: 0,
    vy: 0
  });

  // Bot State (Only used in MULTI modes)
  const isMultiplayer = mode === GameMode.MULTI_RACE || mode === GameMode.MULTI_DRIFT;
  const botRef = useRef<CarState>({
    x: startPos.x * TILE_SIZE + TILE_SIZE / 2,
    y: startPos.y * TILE_SIZE + TILE_SIZE / 2,
    angle: 0,
    speed: 0,
    vx: 0,
    vy: 0
  });
  const botPathRef = useRef<Position[]>([]);
  const botPathIndexRef = useRef<number>(0);
  const botScoreRef = useRef<number>(0);
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const nitroRef = useRef<number>(100);
  const isBoostingRef = useRef<boolean>(false);

  // Pause
  const [isPaused, setIsPaused] = useState(false);
  const pauseStartRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);

  // HUD
  const [displayValue, setDisplayValue] = useState<string>("0");
  const scoreRef = useRef<number>(0);
  const driftComboRef = useRef<number>(0); 
  const particlesRef = useRef<{x: number, y: number, life: number, color: string, vx: number, vy: number}[]>([]);

  // Initialize Bot Path
  useEffect(() => {
    if (isMultiplayer) {
        const path = findPathBFS(grid, startPos, goalPos);
        // Smoothen path slightly? No, grid path is fine.
        // We might want to remove the first node if it's the start node
        if (path.length > 0 && path[0].x === startPos.x && path[0].y === startPos.y) {
            path.shift();
        }
        botPathRef.current = path;
        botPathIndexRef.current = 0;
        botScoreRef.current = 0;
        
        // Reset bot pos
        botRef.current = {
            x: startPos.x * TILE_SIZE + TILE_SIZE / 2,
            y: startPos.y * TILE_SIZE + TILE_SIZE / 2,
            angle: 0,
            speed: 0,
            vx: 0,
            vy: 0
        };
    }
  }, [grid, startPos, goalPos, isMultiplayer]);

  // Input Handling
  const handleKeyDown = (e: KeyboardEvent) => {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", "Space"].indexOf(e.code) > -1) e.preventDefault();
    if (e.code === 'Escape') togglePause();
    keysRef.current[e.code] = true;
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keysRef.current[e.code] = false;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPaused]); 

  const togglePause = () => {
    setIsPaused(prev => {
      const nextState = !prev;
      if (nextState) pauseStartRef.current = Date.now();
      else totalPausedTimeRef.current += (Date.now() - pauseStartRef.current);
      return nextState;
    });
  };

  const checkCollision = (newX: number, newY: number) => {
    const corners = [
      { x: newX - CAR_SIZE / 2, y: newY - CAR_SIZE / 2 },
      { x: newX + CAR_SIZE / 2, y: newY - CAR_SIZE / 2 },
      { x: newX + CAR_SIZE / 2, y: newY + CAR_SIZE / 2 },
      { x: newX - CAR_SIZE / 2, y: newY + CAR_SIZE / 2 },
    ];

    for (const corner of corners) {
      const gridX = Math.floor(corner.x / TILE_SIZE);
      const gridY = Math.floor(corner.y / TILE_SIZE);

      if (
        gridY < 0 || gridY >= gridRef.current.length ||
        gridX < 0 || gridX >= gridRef.current[0].length ||
        gridRef.current[gridY][gridX] === CellType.WALL
      ) {
        return true;
      }
    }
    return false;
  };

  const updateBot = (dt: number) => {
      if (!isMultiplayer || botPathIndexRef.current >= botPathRef.current.length) return;

      const bot = botRef.current;
      const targetNode = botPathRef.current[botPathIndexRef.current];
      const targetX = targetNode.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = targetNode.y * TILE_SIZE + TILE_SIZE / 2;

      const dx = targetX - bot.x;
      const dy = targetY - bot.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const targetAngle = Math.atan2(dy, dx);

      // Steering
      let angleDiff = targetAngle - bot.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Turn
      if (Math.abs(angleDiff) > 0.05) {
          bot.angle += Math.sign(angleDiff) * carConfig.turnSpeed;
      }

      // Physics similar to player
      // Accelerate
      // Slow down if sharp turn coming or close to waypoint to avoid overshooting
      let throttle = 1.0;
      if (Math.abs(angleDiff) > 0.5) throttle = 0.5;
      
      const accel = carConfig.accel * throttle;
      
      bot.vx += Math.cos(bot.angle) * accel;
      bot.vy += Math.sin(bot.angle) * accel;
      bot.vx *= FRICTION;
      bot.vy *= FRICTION;

      // Cap speed
      const currentSpeed = Math.sqrt(bot.vx * bot.vx + bot.vy * bot.vy);
      // Bot is usually perfect, so maybe cap it a bit lower to give player a chance?
      // Or exactly similar as requested.
      const maxS = carConfig.maxSpeed; 
      if (currentSpeed > maxS) {
          const scale = maxS / currentSpeed;
          bot.vx *= scale;
          bot.vy *= scale;
      }
      bot.speed = currentSpeed;

      // Move
      const nextX = bot.x + bot.vx;
      const nextY = bot.y + bot.vy;
      
      // Simple collision check (stops if hits wall)
      // Bot pathfinding is perfect, but physics might slide it into wall.
      // We allow bot to slide along wall slightly
      if (!checkCollision(nextX, bot.y)) bot.x = nextX;
      else bot.vx *= 0.5;

      if (!checkCollision(bot.x, nextY)) bot.y = nextY;
      else bot.vy *= 0.5;

      // Check waypoint reached
      if (dist < TILE_SIZE / 2) {
          botPathIndexRef.current++;
      }

      // Check Goal
      const gridX = Math.floor(bot.x / TILE_SIZE);
      const gridY = Math.floor(bot.y / TILE_SIZE);
      if (gridX === goalPos.x && gridY === goalPos.y) {
          // Bot Wins Logic
          // We handle Game Over in the main update loop
      }

      // Bot Drift Score
      if (mode === GameMode.MULTI_DRIFT) {
          // Fake drift points for bot: based on speed and turning
          if (currentSpeed > 5 && Math.abs(angleDiff) > 0.1) {
              botScoreRef.current += (currentSpeed * 0.5);
          } else {
             // Even if not drifting, give small points to simulate competence
             botScoreRef.current += (currentSpeed * 0.1); 
          }
      }
  };

  const update = useCallback(() => {
    if (isPaused) return;

    const car = carRef.current;
    const keys = keysRef.current;
    const now = Date.now();
    const elapsed = (now - startTimeRef.current - totalPausedTimeRef.current) / 1000;

    // Display Values
    if (mode === GameMode.TIMED) {
      const remaining = Math.max(0, 60 - elapsed);
      setDisplayValue(remaining.toFixed(1));
      if (remaining <= 0) { onGameOver(false, 0, elapsed); return; }
    } else if (mode === GameMode.DRIFT) {
      setDisplayValue(Math.floor(scoreRef.current).toString());
    } else if (isMultiplayer) {
      if (mode === GameMode.MULTI_DRIFT) {
          setDisplayValue(`P: ${Math.floor(scoreRef.current)} | B: ${Math.floor(botScoreRef.current)}`);
      } else {
          // Race
          setDisplayValue(elapsed.toFixed(2));
      }
    } else {
      setDisplayValue(elapsed.toFixed(2));
    }

    // Bot Update
    if (isMultiplayer) updateBot(0.016);

    // Player Nitro
    const wantsBoost = keys['ShiftLeft'] || keys['ShiftRight'] || keys['Space'] || keys['BoostBtn'];
    let currentAccel = BASE_ACCEL;
    let currentMaxSpeed = BASE_MAX_SPEED;

    if (wantsBoost && nitroRef.current > 0) {
        isBoostingRef.current = true;
        currentAccel *= 2.5; 
        currentMaxSpeed += 6.0; 
        nitroRef.current = Math.max(0, nitroRef.current - 0.6); 
        
        if (Math.random() > 0.3) {
             const angle = car.angle + Math.PI + (Math.random() - 0.5) * 0.5;
             particlesRef.current.push({
                x: car.x - Math.cos(car.angle) * 16, y: car.y - Math.sin(car.angle) * 16,
                life: 0.4, color: '#00ffff', vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10
            });
        }
    } else {
        isBoostingRef.current = false;
        if (nitroRef.current < 100) nitroRef.current = Math.min(100, nitroRef.current + 0.08); 
    }

    // Player Physics
    if (Math.abs(car.speed) > 0.1 || keys['ArrowUp'] || keys['KeyW'] || keys['ArrowDown'] || keys['KeyS']) {
      if (keys['ArrowLeft'] || keys['KeyA']) car.angle -= TURN_SPEED;
      if (keys['ArrowRight'] || keys['KeyD']) car.angle += TURN_SPEED;
    }

    if (keys['ArrowUp'] || keys['KeyW']) {
      car.vx += Math.cos(car.angle) * currentAccel;
      car.vy += Math.sin(car.angle) * currentAccel;
    } else if (keys['ArrowDown'] || keys['KeyS']) {
      car.vx -= Math.cos(car.angle) * (currentAccel * 0.5); 
      car.vy -= Math.sin(car.angle) * (currentAccel * 0.5);
    }

    car.vx *= FRICTION;
    car.vy *= FRICTION;

    const currentSpeed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
    if (currentSpeed > currentMaxSpeed) {
      const scale = currentMaxSpeed / currentSpeed;
      car.vx *= scale;
      car.vy *= scale;
    }
    car.speed = currentSpeed; 

    // Player Drift
    if (mode === GameMode.DRIFT || mode === GameMode.MULTI_DRIFT) {
        if (currentSpeed > 2.0) {
            const moveAngle = Math.atan2(car.vy, car.vx);
            const angleDiff = Math.abs(car.angle - moveAngle);
            const normalizedDiff = Math.abs(Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)));
            
            if (normalizedDiff > 0.3) {
                const driftPoints = normalizedDiff * currentSpeed * 0.5;
                driftComboRef.current += driftPoints;
                scoreRef.current += driftPoints;
                if (Math.random() > 0.5) {
                    particlesRef.current.push({
                        x: car.x, y: car.y, life: 0.5, color: NEON_YELLOW,
                        vx: (Math.random() - 0.5), vy: (Math.random() - 0.5)
                    });
                }
            } else {
                driftComboRef.current *= 0.9;
            }
        }
    }

    // Movement
    let nextX = car.x + car.vx;
    let nextY = car.y + car.vy;
    if (checkCollision(nextX, car.y)) { car.vx = 0; nextX = car.x; }
    if (checkCollision(nextX, nextY)) { car.vy = 0; nextY = car.y; }
    car.x = nextX;
    car.y = nextY;

    // Grid Interactions
    const gridX = Math.floor(car.x / TILE_SIZE);
    const gridY = Math.floor(car.y / TILE_SIZE);
    
    // Check Player Win/Goal
    if (gridY >= 0 && gridY < gridRef.current.length && gridX >= 0 && gridX < gridRef.current[0].length) {
        const cell = gridRef.current[gridY][gridX];
        if (cell === CellType.GOAL) {
            if (isMultiplayer) {
                 // Player reached goal first or during game
                 const playerWon = mode === GameMode.MULTI_RACE || (mode === GameMode.MULTI_DRIFT && scoreRef.current > botScoreRef.current);
                 onGameOver(playerWon, Math.floor(scoreRef.current), elapsed);
            } else {
                 onGameOver(true, Math.floor(scoreRef.current), elapsed);
            }
            return;
        }
        if (cell === CellType.COIN) {
            gridRef.current[gridY][gridX] = CellType.PATH; 
            onCollectCoin(isBonusLevel ? BONUS_COIN_VALUE : COIN_VALUE);
            // Spawn Coin Particles
            for(let i=0; i<8; i++) {
                particlesRef.current.push({
                    x: gridX * TILE_SIZE + TILE_SIZE/2,
                    y: gridY * TILE_SIZE + TILE_SIZE/2,
                    life: 0.8,
                    color: isBonusLevel ? NEON_GREEN : NEON_YELLOW,
                    vx: (Math.random()-0.5)*8,
                    vy: (Math.random()-0.5)*8
                });
            }
        }
    }

    // Check Bot Goal Reach (Multiplayer only)
    if (isMultiplayer) {
        const botGX = Math.floor(botRef.current.x / TILE_SIZE);
        const botGY = Math.floor(botRef.current.y / TILE_SIZE);
        if (botGX === goalPos.x && botGY === goalPos.y) {
             // Bot finished
             const botWon = mode === GameMode.MULTI_RACE || (mode === GameMode.MULTI_DRIFT && botScoreRef.current > scoreRef.current);
             // If bot won, player lost (win=false)
             onGameOver(!botWon, Math.floor(scoreRef.current), elapsed);
             return;
        }
    }
    
    // Particles emission
    if (currentSpeed > 2 && !isBoostingRef.current) {
       particlesRef.current.push({
           x: car.x - Math.cos(car.angle) * 16, y: car.y - Math.sin(car.angle) * 16,
           life: 0.6, color: Math.random() > 0.5 ? NEON_BLUE : NEON_PINK,
           vx: (Math.random()-0.5), vy: (Math.random()-0.5)
       });
    }

  }, [isPaused, onGameOver, mode, carConfig, onCollectCoin, isMultiplayer, isBonusLevel]);

  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, colorOverride?: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const mainColor = colorOverride || carConfig.color;

    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 20;

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.roundRect(-CAR_SIZE/2, -CAR_SIZE/2, CAR_SIZE, CAR_SIZE, 6);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(-CAR_SIZE/4, -CAR_SIZE/2 + 2, CAR_SIZE/2, CAR_SIZE - 10, 3);
    ctx.fill();
    
    // Accent (Stripes)
    ctx.fillStyle = carConfig.accent;
    ctx.fillRect(-2, -CAR_SIZE/2 + 4, 4, CAR_SIZE - 16);

    if (!colorOverride && isBoostingRef.current) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-CAR_SIZE/2 - 5, -5, 5, 10);
    }

    // Headlights
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#ccf';
    ctx.beginPath();
    ctx.arc(CAR_SIZE/2 - 2, -8, 4, 0, Math.PI * 2);
    ctx.arc(CAR_SIZE/2 - 2, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Taillights
    ctx.shadowColor = '#f00';
    ctx.fillStyle = '#f00';
    ctx.fillRect(-CAR_SIZE/2, -10, 3, 8);
    ctx.fillRect(-CAR_SIZE/2, 2, 3, 8);
    ctx.restore();
  };

  const drawOffscreenIndicator = (ctx: CanvasRenderingContext2D, targetX: number, targetY: number, color: string, label: string, camX: number, camY: number) => {
     const margin = 50;
     if (targetX > camX + margin && targetX < camX + viewport.width - margin && 
         targetY > camY + margin && targetY < camY + viewport.height - margin) return;

     const centerX = camX + viewport.width / 2;
     const centerY = camY + viewport.height / 2;
     
     const dx = targetX - centerX;
     const dy = targetY - centerY;
     const angle = Math.atan2(dy, dx);
     const radius = Math.min(viewport.width, viewport.height) / 2 - 60;
     
     const indX = centerX + Math.cos(angle) * radius;
     const indY = centerY + Math.sin(angle) * radius;

     ctx.save();
     ctx.translate(indX, indY);
     ctx.rotate(angle);
     
     ctx.fillStyle = color;
     ctx.shadowColor = color;
     ctx.shadowBlur = 10;
     ctx.beginPath();
     ctx.moveTo(15, 0);
     ctx.lineTo(-10, 10);
     ctx.lineTo(-10, -10);
     ctx.fill();
     
     ctx.rotate(-angle);
     ctx.fillStyle = '#fff';
     ctx.shadowColor = '#000';
     ctx.shadowBlur = 4;
     ctx.font = 'bold 14px Orbitron';
     ctx.textAlign = 'center';
     ctx.fillText(label, 0, 25);
     ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Camera Logic
    const worldW = gridRef.current[0].length * TILE_SIZE;
    const worldH = gridRef.current.length * TILE_SIZE;
    
    let camX = carRef.current.x - viewport.width / 2;
    let camY = carRef.current.y - viewport.height / 2;
    
    if (worldW < viewport.width) { camX = -(viewport.width - worldW) / 2; } 
    else { camX = Math.max(0, Math.min(camX, worldW - viewport.width)); }

    if (worldH < viewport.height) { camY = -(viewport.height - worldH) / 2; } 
    else { camY = Math.max(0, Math.min(camY, worldH - viewport.height)); }

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.save();
    ctx.translate(-camX, -camY);

    // Grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startGX = Math.floor(camX / 50) * 50;
    const startGY = Math.floor(camY / 50) * 50;
    for(let x=startGX; x<=camX + viewport.width; x+=50) { ctx.moveTo(x, startGY); ctx.lineTo(x, camY + viewport.height); }
    for(let y=startGY; y<=camY + viewport.height; y+=50) { ctx.moveTo(startGX, y); ctx.lineTo(camX + viewport.width, y); }
    ctx.stroke();

    // World
    for (let y = 0; y < gridRef.current.length; y++) {
      for (let x = 0; x < gridRef.current[0].length; x++) {
        const cell = gridRef.current[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (px + TILE_SIZE < camX || px > camX + viewport.width || py + TILE_SIZE < camY || py > camY + viewport.height) continue;

        if (cell === CellType.WALL) {
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.shadowBlur = 10; ctx.shadowColor = '#0ff'; ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#112'; ctx.fillRect(px + 12, py + 12, TILE_SIZE - 24, TILE_SIZE - 24);

        } else if (cell === CellType.GOAL) {
          ctx.shadowBlur = 20; ctx.shadowColor = '#39ff14'; ctx.fillStyle = 'rgba(57, 255, 20, 0.2)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#39ff14'; ctx.font = 'bold 20px Orbitron'; ctx.textAlign = 'center';
          ctx.fillText('FINISH', px + TILE_SIZE/2, py + TILE_SIZE/2 + 8); ctx.textAlign = 'start'; ctx.shadowBlur = 0;
        } else if (cell === CellType.START) {
           ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
           ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
           ctx.fillText('START', px + TILE_SIZE/2, py + TILE_SIZE/2 + 5); ctx.textAlign = 'start';
        } else if (cell === CellType.COIN) {
           const cx = px + TILE_SIZE/2; const cy = py + TILE_SIZE/2;
           // Differentiate visual for Bonus Coins
           const coinColor = isBonusLevel ? NEON_GREEN : NEON_YELLOW;
           const coinRadius = isBonusLevel ? 14 : 10;
           
           ctx.shadowColor = coinColor; ctx.shadowBlur = 15; ctx.fillStyle = coinColor;
           ctx.beginPath(); ctx.arc(cx, cy, coinRadius, 0, Math.PI * 2); ctx.fill();
           ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, coinRadius, 0, Math.PI * 2); ctx.stroke();
           ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
           ctx.fillText('$', cx, cy + 4); ctx.textAlign = 'start'; ctx.shadowBlur = 0;
        }
      }
    }

    // Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        if (!isPaused) { p.life -= 0.05; p.x += p.vx || 0; p.y += p.vy || 0; }
        if(p.life <= 0) { particlesRef.current.splice(i, 1); continue; }
        if (p.x < camX || p.x > camX + viewport.width || p.y < camY || p.y > camY + viewport.height) continue;

        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    }

    // Draw Bot
    if (isMultiplayer) {
        drawCar(ctx, botRef.current.x, botRef.current.y, botRef.current.angle, NEON_RED);
        // Draw Bot name tag
        ctx.fillStyle = NEON_RED;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("BOT", botRef.current.x, botRef.current.y - 30);
        ctx.textAlign = 'start';
    }

    // Draw Player
    drawCar(ctx, carRef.current.x, carRef.current.y, carRef.current.angle);

    // Indicators
    const goalX = goalPos.x * TILE_SIZE + TILE_SIZE/2;
    const goalY = goalPos.y * TILE_SIZE + TILE_SIZE/2;
    drawOffscreenIndicator(ctx, goalX, goalY, '#39ff14', 'FINISH', camX, camY);

    if (isMultiplayer) {
        // Draw indicator for BOT if offscreen
        drawOffscreenIndicator(ctx, botRef.current.x, botRef.current.y, NEON_RED, 'BOT', camX, camY);
    }

    ctx.restore();

    // Pause Overlay
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        ctx.shadowColor = NEON_PINK; ctx.shadowBlur = 20; ctx.fillStyle = NEON_PINK;
        ctx.font = 'italic 900 64px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('PAUSED', viewport.width / 2, viewport.height / 2);
        ctx.shadowBlur = 0; ctx.textAlign = 'start';
    }

  }, [grid, carConfig, isPaused, viewport, isMultiplayer, mode, isBonusLevel]); 

  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [loop]);

  const handleTouchStart = (key: string) => { keysRef.current[key] = true; };
  const handleTouchEnd = (key: string) => { keysRef.current[key] = false; };

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-30">
      {/* HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 text-white z-40 font-bold tracking-widest text-xl pointer-events-none">
        {mode === GameMode.TIMED && (
           <div className={`flex items-center gap-2 ${parseFloat(displayValue) < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
             <Timer className="drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]" /> <span>{displayValue}s</span>
           </div>
        )}
        {mode === GameMode.DRIFT && (
           <div className="flex flex-col">
             <div className="flex items-center gap-2 text-lime-400">
               <Trophy className="drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]" /> <span>DRIFT: {displayValue}</span>
             </div>
             {driftComboRef.current > 50 && <div className="text-sm text-cyan-400 animate-bounce">PERFECT DRIFT!</div>}
           </div>
        )}
        {(mode === GameMode.CLASSIC) && (
           <div className="flex flex-col">
                <span className={`drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] ${isBonusLevel ? 'text-green-400 font-black' : 'text-cyan-400'}`}>
                    {isBonusLevel ? 'BONUS STAGE' : `TIME: ${displayValue}s`}
                </span>
                {level && !isBonusLevel && <span className="text-sm text-gray-400">LEVEL {level}</span>}
                {isBonusLevel && <span className="text-sm text-yellow-400 animate-pulse">COLLECT COINS!</span>}
           </div>
        )}
        {isMultiplayer && (
           <div className="flex flex-col gap-1">
               <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] flex gap-2"><Users size={20}/> VS BOT</span>
               <span className="text-sm text-gray-300">
                   {mode === GameMode.MULTI_RACE ? `TIME: ${displayValue}s` : `${displayValue}`}
               </span>
           </div>
        )}
      </div>

       {/* Nitro Bar */}
       <div className="absolute top-20 left-4 z-40 w-48 h-6 bg-gray-900 border border-gray-600 rounded skew-x-[-10deg] overflow-hidden">
          <div className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-100 ease-linear" style={{ width: `${nitroRef.current}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold italic tracking-wider text-white mix-blend-difference">NITRO</div>
       </div>

       <button onClick={togglePause} className="absolute top-4 right-4 z-50 p-2 rounded-full border border-white/50 text-white hover:bg-white/20 transition bg-black/50 backdrop-blur">
        {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
      </button>

      {isPaused && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto">
           <div className="flex flex-col gap-4 mt-24 animate-in fade-in zoom-in duration-300">
              <button onClick={togglePause} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 text-xl shadow-[0_0_20px_#0891b2] transform transition hover:scale-105">
                 <Play size={24} fill="currentColor"/> RESUME
              </button>
              <button onClick={onExit} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 text-xl shadow-[0_0_20px_#b91c1c] transform transition hover:scale-105">
                 <LogOut size={24} /> EXIT TO MENU
              </button>
           </div>
        </div>
      )}

      <canvas ref={canvasRef} width={viewport.width} height={viewport.height} className="block bg-[#050505]" />
      
      {/* Persistent On-Screen Controls */}
      <div className="absolute bottom-8 flex gap-8 w-full justify-between px-8 z-40 pointer-events-none">
         {/* Left Controls: Turn */}
         <div className="flex gap-4 pointer-events-auto">
            <button 
                className="w-20 h-20 rounded-full border-2 border-cyan-500 bg-black/60 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center backdrop-blur-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95" 
                onTouchStart={() => handleTouchStart('ArrowLeft')} onTouchEnd={() => handleTouchEnd('ArrowLeft')}
                onMouseDown={() => handleTouchStart('ArrowLeft')} onMouseUp={() => handleTouchEnd('ArrowLeft')}
            >
                <ChevronLeft size={40} strokeWidth={3} />
            </button>
            <button 
                className="w-20 h-20 rounded-full border-2 border-cyan-500 bg-black/60 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center backdrop-blur-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95" 
                onTouchStart={() => handleTouchStart('ArrowRight')} onTouchEnd={() => handleTouchEnd('ArrowRight')}
                onMouseDown={() => handleTouchStart('ArrowRight')} onMouseUp={() => handleTouchEnd('ArrowRight')}
            >
                <ChevronRight size={40} strokeWidth={3} />
            </button>
         </div>

         {/* Right Controls: Gas, Brake, Nitro */}
         <div className="flex gap-6 items-end pointer-events-auto relative">
             {/* Nitro */}
            <button 
                className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-cyan-900/60 text-cyan-400 active:bg-cyan-400 active:text-black flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_#22d3ee] mb-8 transition-all active:scale-95" 
                onTouchStart={() => handleTouchStart('BoostBtn')} onTouchEnd={() => handleTouchEnd('BoostBtn')}
                onMouseDown={() => handleTouchStart('BoostBtn')} onMouseUp={() => handleTouchEnd('BoostBtn')}
            >
                <Zap size={28} fill="currentColor" />
            </button>

            <div className="flex flex-col gap-4">
                {/* Gas */}
                <button 
                    className="w-20 h-20 rounded-full border-2 border-green-500 bg-black/60 text-green-400 active:bg-green-500 active:text-black flex items-center justify-center backdrop-blur-sm transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95" 
                    onTouchStart={() => handleTouchStart('ArrowUp')} onTouchEnd={() => handleTouchEnd('ArrowUp')}
                    onMouseDown={() => handleTouchStart('ArrowUp')} onMouseUp={() => handleTouchEnd('ArrowUp')}
                >
                    <ChevronUp size={40} strokeWidth={3} />
                </button>
                {/* Brake/Reverse */}
                <button 
                    className="w-20 h-20 rounded-full border-2 border-red-500 bg-black/60 text-red-400 active:bg-red-500 active:text-black flex items-center justify-center backdrop-blur-sm transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95" 
                    onTouchStart={() => handleTouchStart('ArrowDown')} onTouchEnd={() => handleTouchEnd('ArrowDown')}
                    onMouseDown={() => handleTouchStart('ArrowDown')} onMouseUp={() => handleTouchEnd('ArrowDown')}
                >
                    <ChevronDown size={40} strokeWidth={3} />
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default GameCanvas;
