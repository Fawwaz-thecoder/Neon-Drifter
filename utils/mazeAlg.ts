import { CellType, Grid, Position } from '../types';

export const generateMazeDFS = (width: number, height: number, isBonus: boolean = false): { grid: Grid, start: Position, goal: Position } => {
  // Enforce odd dimensions for the maze generation algorithm
  const mazeWidth = width % 2 === 0 ? width - 1 : width;
  const mazeHeight = height % 2 === 0 ? height - 1 : height;

  // Initialize grid with walls
  const grid: Grid = Array(height).fill(null).map(() => Array(width).fill(CellType.WALL));
  const start: Position = { x: 1, y: 1 };
  
  if (isBonus) {
      // BONUS LEVEL GENERATION: Snake/Zig-Zag Pattern
      // Clear path filled with coins
      grid[start.y][start.x] = CellType.START;
      
      let cx = 1;
      let cy = 1;
      let direction = 1; // 1 = right, -1 = left
      const path: Position[] = [];

      // Generate a simple zig-zag path to cover the area
      while (cy < mazeHeight - 1) {
          // Horizontal sweep
          while (cx > 0 && cx < mazeWidth - 1) {
              grid[cy][cx] = CellType.PATH;
              path.push({x: cx, y: cy});
              
              const nextX = cx + direction;
              if (nextX <= 0 || nextX >= mazeWidth - 1) break;
              cx = nextX;
          }
          
          grid[cy][cx] = CellType.PATH;
          path.push({x: cx, y: cy});

          // Move down
          if (cy < mazeHeight - 2) {
             grid[cy+1][cx] = CellType.PATH;
             path.push({x: cx, y: cy+1});
             grid[cy+2][cx] = CellType.PATH;
             path.push({x: cx, y: cy+2});
          }
          cy += 2;
          direction *= -1;
      }
      
      // Goal at end of path
      const goal = { x: cx, y: Math.min(cy, mazeHeight - 2) };
      grid[goal.y][goal.x] = CellType.GOAL;
      grid[start.y][start.x] = CellType.START; // Re-affirm start in case it was overwritten

      // Place 8 Bonus Coins (Value > 100, Total ~1000)
      // We want them "everywhere from start to finish"
      // Distribute evenly along path
      const coinCount = 8;
      if (path.length > coinCount + 2) {
          const step = Math.floor(path.length / (coinCount + 1));
          for(let i = 1; i <= coinCount; i++) {
              const idx = i * step;
              if (idx < path.length) {
                  const p = path[idx];
                  if ((p.x !== start.x || p.y !== start.y) && (p.x !== goal.x || p.y !== goal.y)) {
                      grid[p.y][p.x] = CellType.COIN;
                  }
              }
          }
      }

      return { grid, start, goal };

  } else {
      // STANDARD MAZE GENERATION
      const stack: Position[] = [];
      
      grid[start.y][start.x] = CellType.PATH;
      stack.push(start);

      const directions = [
        { x: 0, y: -2 }, // Up
        { x: 0, y: 2 },  // Down
        { x: -2, y: 0 }, // Left
        { x: 2, y: 0 }   // Right
      ];

      // 1. Generate Perfect Maze (DFS)
      while (stack.length > 0) {
        const current = stack[stack.length - 1];
        
        // Shuffle directions
        const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
        let found = false;

        for (const dir of shuffledDirs) {
          const nextX = current.x + dir.x;
          const nextY = current.y + dir.y;

          if (nextX > 0 && nextX < mazeWidth && nextY > 0 && nextY < mazeHeight && grid[nextY][nextX] === CellType.WALL) {
            grid[nextY][nextX] = CellType.PATH;
            grid[current.y + dir.y / 2][current.x + dir.x / 2] = CellType.PATH; // Carve path between
            stack.push({ x: nextX, y: nextY });
            found = true;
            break;
          }
        }

        if (!found) {
          stack.pop();
        }
      }

      // 2. Define Goal Position
      let goalX = mazeWidth - 2;
      let goalY = mazeHeight - 2;

      grid[start.y][start.x] = CellType.START;
      
      if (grid[goalY][goalX] === CellType.WALL) {
         grid[goalY][goalX] = CellType.PATH;
         if (grid[goalY][goalX-1] === CellType.PATH) { }
         else if (grid[goalY-1][goalX] === CellType.PATH) { }
         else {
            grid[goalY][goalX-1] = CellType.PATH; 
         }
      }
      
      grid[goalY][goalX] = CellType.GOAL;
      const goal = { x: goalX, y: goalY };

      // 3. Braiding
      for(let y = 1; y < mazeHeight - 1; y++) {
        for(let x = 1; x < mazeWidth - 1; x++) {
          if (grid[y][x] === CellType.PATH) {
            let walls = 0;
            if (grid[y-1][x] === CellType.WALL) walls++;
            if (grid[y+1][x] === CellType.WALL) walls++;
            if (grid[y][x-1] === CellType.WALL) walls++;
            if (grid[y][x+1] === CellType.WALL) walls++;

            if (walls === 3) {
               if (Math.random() > 0.5) {
                   const neighbors = [
                     {x: x, y: y-1}, {x: x, y: y+1}, {x: x-1, y: y}, {x: x+1, y: y}
                   ];
                   const validWalls = neighbors.filter(n => 
                     n.x > 0 && n.x < mazeWidth - 1 && 
                     n.y > 0 && n.y < mazeHeight - 1 && 
                     grid[n.y][n.x] === CellType.WALL
                   );
                   
                   if (validWalls.length > 0) {
                     const toRemove = validWalls[Math.floor(Math.random() * validWalls.length)];
                     grid[toRemove.y][toRemove.x] = CellType.PATH;
                   }
               }
            }
          }
        }
      }

      // 4. Scatter Coins
      for(let y = 1; y < height - 1; y++) {
        for(let x = 1; x < width - 1; x++) {
           if (grid[y][x] === CellType.PATH) {
             if ((x === start.x && y === start.y) || (x === goal.x && y === goal.y)) continue;
             if (Math.random() < 0.10) {
               grid[y][x] = CellType.COIN;
             }
           }
        }
      }

      return { grid, start, goal };
  }
};
