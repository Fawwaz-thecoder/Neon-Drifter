import { CarConfig } from './types';

export const TILE_SIZE = 100; // Increased to make track wider
export const CAR_SIZE = 36;   // Increased to make car bigger

export const DEFAULT_GRID_SIZE = 15;
export const MAX_LEVEL = 150;
export const COIN_VALUE = 50;
export const BONUS_COIN_VALUE = 125; // 8 coins = 1000 credits

export const NEON_BLUE = '#00f3ff';
export const NEON_PINK = '#ff00ff';
export const NEON_GREEN = '#39ff14';
export const NEON_YELLOW = '#facc15';
export const NEON_RED = '#ef4444';
export const WALL_COLOR = '#111';

// Initial Game Values
export const INITIAL_CREDITS = 500;
export const WIN_REWARD = 200;

export const CARS: CarConfig[] = [
  // Tier 1: Starters & Cheap
  {
    id: 'starter',
    name: 'Neon Cadet',
    color: '#0ea5e9',
    accent: '#ffffff',
    price: 0,
    speedStat: 0.4,
    turnStat: 0.5,
    maxSpeed: 7.0,
    accel: 0.3,
    turnSpeed: 0.08,
    friction: 0.92
  },
  {
    id: 'taxi',
    name: 'Cyber Cab',
    color: '#facc15',
    accent: '#000000',
    price: 200,
    speedStat: 0.45,
    turnStat: 0.4,
    maxSpeed: 7.5,
    accel: 0.25,
    turnSpeed: 0.07,
    friction: 0.93
  },
  {
    id: 'bug',
    name: 'Glitch Bug',
    color: '#ec4899',
    accent: '#fbcfe8',
    price: 400,
    speedStat: 0.5,
    turnStat: 0.8,
    maxSpeed: 7.2,
    accel: 0.4,
    turnSpeed: 0.10,
    friction: 0.90
  },
  
  // Tier 2: Mid Range
  {
    id: 'blaze',
    name: 'Crimson Fury',
    color: '#dc2626',
    accent: '#fca5a5',
    price: 800,
    speedStat: 0.7,
    turnStat: 0.5,
    maxSpeed: 9.0,
    accel: 0.5,
    turnSpeed: 0.08,
    friction: 0.94
  },
  {
    id: 'police',
    name: 'Enforcer',
    color: '#1e293b',
    accent: '#3b82f6',
    price: 1000,
    speedStat: 0.65,
    turnStat: 0.6,
    maxSpeed: 8.5,
    accel: 0.55,
    turnSpeed: 0.08,
    friction: 0.91
  },
  {
    id: 'muscle',
    name: 'Iron Hyde',
    color: '#475569',
    accent: '#94a3b8',
    price: 1500,
    speedStat: 0.8,
    turnStat: 0.3,
    maxSpeed: 10.0,
    accel: 0.6,
    turnSpeed: 0.06,
    friction: 0.96 // Heavy, slides more
  },
  {
    id: 'viper',
    name: 'Toxic Viper',
    color: '#65a30d',
    accent: '#bef264',
    price: 2000,
    speedStat: 0.75,
    turnStat: 0.9,
    maxSpeed: 9.5,
    accel: 0.5,
    turnSpeed: 0.11,
    friction: 0.88 // Grippy
  },

  // Tier 3: High Performance
  {
    id: 'drift_king',
    name: 'Sidewinder',
    color: '#f97316',
    accent: '#ffedd5',
    price: 3000,
    speedStat: 0.85,
    turnStat: 1.0,
    maxSpeed: 10.5,
    accel: 0.6,
    turnSpeed: 0.13,
    friction: 0.98 // Very slippery for drift
  },
  {
    id: 'spectre',
    name: 'Midnight Spectre',
    color: '#9333ea',
    accent: '#d8b4fe',
    price: 4500,
    speedStat: 0.95,
    turnStat: 0.8,
    maxSpeed: 12.0,
    accel: 0.7,
    turnSpeed: 0.09,
    friction: 0.93
  },
  {
    id: 'racer',
    name: 'Formula Zero',
    color: '#ef4444',
    accent: '#ffffff',
    price: 6000,
    speedStat: 1.0,
    turnStat: 0.9,
    maxSpeed: 14.0,
    accel: 0.9,
    turnSpeed: 0.12,
    friction: 0.85 // Super grippy F1 style
  },
  
  // Tier 4: Experimental & New Cars
  {
    id: 'tank',
    name: 'Heavy Metal',
    color: '#3f3f46',
    accent: '#18181b',
    price: 7000,
    speedStat: 0.6,
    turnStat: 0.4,
    maxSpeed: 9.0,
    accel: 0.4,
    turnSpeed: 0.05,
    friction: 0.97 // Heavy momentum
  },
  {
    id: 'phantom',
    name: 'Phantom X',
    color: '#14b8a6',
    accent: '#ccfbf1',
    price: 8000,
    speedStat: 0.9,
    turnStat: 0.9,
    maxSpeed: 13.0,
    accel: 0.8,
    turnSpeed: 0.14,
    friction: 0.95
  },
  {
    id: 'retro',
    name: 'Synthwave 84',
    color: '#db2777',
    accent: '#f472b6',
    price: 9000,
    speedStat: 0.85,
    turnStat: 0.8,
    maxSpeed: 12.5,
    accel: 0.7,
    turnSpeed: 0.09,
    friction: 0.94
  },
  {
    id: 'ufo',
    name: 'Cosmic Drifter',
    color: '#a855f7',
    accent: '#d8b4fe',
    price: 9500,
    speedStat: 0.95,
    turnStat: 1.0,
    maxSpeed: 13.5,
    accel: 0.85,
    turnSpeed: 0.15,
    friction: 0.99 // Zero G feel
  },
  {
    id: 'golden',
    name: 'Midas Touch',
    color: '#eab308',
    accent: '#fef08a',
    price: 10000,
    speedStat: 0.95,
    turnStat: 0.85,
    maxSpeed: 13.5,
    accel: 0.75,
    turnSpeed: 0.10,
    friction: 0.92
  },
  {
    id: 'future',
    name: 'Quantum Racer',
    color: '#fff',
    accent: '#06b6d4',
    price: 12000,
    speedStat: 1.0,
    turnStat: 1.0,
    maxSpeed: 15.0,
    accel: 1.0,
    turnSpeed: 0.13,
    friction: 0.90
  }
];
