import { GoogleGenAI, Type } from "@google/genai";
import { CellType, Grid, Position } from "../types";

// Safety check for API key
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateMazeWithGemini = async (prompt: string): Promise<{ grid: Grid, start: Position, goal: Position } | null> => {
  if (!API_KEY) {
    console.error("API Key not found");
    return null;
  }

  try {
    const model = 'gemini-2.5-flash';
    const gridSize = 15;
    
    // Schema definition for the maze grid
    // 0 = Path, 1 = Wall, 2 = Start, 3 = Goal
    const response = await ai.models.generateContent({
      model: model,
      contents: `Generate a 2D maze grid layout of size ${gridSize}x${gridSize} based on the theme: "${prompt}".
      
      Rules:
      1. The grid must be exactly ${gridSize}x${gridSize}.
      2. Use numbers: 0 for PATH, 1 for WALL, 2 for START, 3 for GOAL.
      3. There must be exactly one Start (2) and one Goal (3).
      4. Ensure there is a solvable path from Start to Goal.
      5. Walls (1) should form the structure.
      6. If the theme implies openness (e.g. "highway"), use fewer walls. If "bunker", use more.
      
      Return ONLY the JSON object defined in the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layout: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      const grid = data.layout as number[][];
      
      // Validate dimensions
      if (!grid || grid.length !== gridSize || grid[0].length !== gridSize) {
        throw new Error("Invalid grid dimensions returned by AI");
      }

      // Find start and goal
      let start: Position = { x: 1, y: 1 };
      let goal: Position = { x: gridSize - 2, y: gridSize - 2 };

      for(let y=0; y<gridSize; y++) {
        for(let x=0; x<gridSize; x++) {
          if (grid[y][x] === CellType.START) start = { x, y };
          if (grid[y][x] === CellType.GOAL) goal = { x, y };
        }
      }

      return { grid, start, goal };
    }
    return null;

  } catch (error) {
    console.error("Gemini Maze Generation Error:", error);
    return null;
  }
};
