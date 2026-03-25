import type { AuthedWebSocket, JoinGameData, Player } from "../types/types.js";
import { games, players } from "../store/store.js";

function isJoinGameData(x: unknown): x is JoinGameData {
    if (!x || typeof x !== "object") return false;
    const d = x as Record<string, unknown>;
    return typeof d.code === "string" && d.code.trim().length > 0;
}

export const handleJoinGame = (ws: AuthedWebSocket, msg: unknown) => {
    console.log("handleJoinGame", msg);
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }

    if (!isJoinGameData(msg)) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid data" }));
        return;
    }

    const code = msg.code.trim().toLowerCase();

    console.log(games)

    const game = [...games.values()].find((g) => g.code === code);
    console.log("game", game);
    if (!game) {
        console.log("game not found");
        ws.send(JSON.stringify({ id: 0, error: "Game not found" }));
        return;
    }

    // Ensure we have a Player entry for this user and attach ws
    const existing = players.get(ws.user.name);
    const player: Player = existing ?? { name: ws.user.name, index: ws.user.index, score: 0 };
    player.ws = ws;
    players.set(ws.user.name, player);

    const alreadyInGame = game.players.some((p: Player) => p.index === player.index);
    if (!alreadyInGame) {
        game.players.push(player);
    }
    
    console.log('before ws send')

    ws.send(JSON.stringify({ type: "game_joined", data: { gameId: game.id }, id: 0 }));
}