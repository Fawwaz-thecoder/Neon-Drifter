export enum CellType {
  PATH = 0,
  WALL = 1,
  START = 2,
  GOAL = 3,
  COIN = 4,
}

export type Grid = number[][];

export interface Position {
  x: number;
  y: number;
}

export interface CarState {
  x: number;
  y: number;
  angle: number; // in radians
  speed: number; // Scalar speed (legacy/display)
  vx: number;    // Velocity X
  vy: number;    // Velocity Y
}

export enum GameState {
  MENU = 'MENU',
  LEVEL_SELECT = 'LEVEL_SELECT',
  GARAGE = 'GARAGE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum GameMode {
  CLASSIC = 'CLASSIC',
  TIMED = 'TIMED',
  DRIFT = 'DRIFT',
  MULTI_RACE = 'MULTI_RACE',
  MULTI_DRIFT = 'MULTI_DRIFT',
}

export interface LevelConfig {
  grid: Grid;
  startPos: Position;
  goalPos: Position;
  name: string;
}

export interface CarConfig {
  id: string;
  name: string;
  color: string;
  accent: string;
  price: number;
  speedStat: number; // 0.0 to 1.0 visual
  turnStat: number; // 0.0 to 1.0 visual
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
  friction: number; // Determines grip/driftiness
}
