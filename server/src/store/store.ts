import type { Player } from "../types/types.js";    
import type { Game } from "../types/types.js";
import type { User } from "../types/types.js";

export const players = new Map<string, Player>();
export const users = new Map<string, User>();
export const games = new Map<string, Game>();