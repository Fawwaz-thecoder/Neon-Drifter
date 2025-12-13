import { Grid, Position, CellType } from '../types';

export const findPathBFS = (grid: Grid, start: Position, goal: Position): Position[] => {
  const height = grid.length;
  const width = grid[0].length;
  // Queue stores current position and the path taken to reach it
  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [start] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const dirs = [
    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;

    if (pos.x === goal.x && pos.y === goal.y) {
      return path;
    }

    for (const dir of dirs) {
      const nx = pos.x + dir.x;
      const ny = pos.y + dir.y;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
          grid[ny][nx] !== CellType.WALL && 
          !visited.has(`${nx},${ny}`)) {
        visited.add(`${nx},${ny}`);
        queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return [];
};
