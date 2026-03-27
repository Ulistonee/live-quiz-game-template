import type { AuthedWebSocket, JoinGameData, Player } from "../types/types.js";
import { games, players } from "../store/store.js";

function isJoinGameData(x: unknown): x is JoinGameData {
    if (!x || typeof x !== "object") return false;
    const d = x as Record<string, unknown>;
    return typeof d.code === "string" && d.code.trim().length > 0;
}

export const handleJoinGame = (ws: AuthedWebSocket, msg: unknown) => {
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }

    if (!isJoinGameData(msg)) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid data" }));
        return;
    }

    const code = msg.code.trim().toLowerCase();

    const game = [...games.values()].find((g) => g.code === code);
    if (!game) {
        ws.send(JSON.stringify({ id: 0, error: "Game not found" }));
        return;
    }

    const existing = players.get(ws.user.name);

    const alreadyInGame = game.players.some((p: Player) => p.index === existing.index);
    if (!alreadyInGame) {
        game.players.push(existing);
    }

    ws.send(JSON.stringify({ type: "game_joined", data: { gameId: game.id }, id: 0 }));

    const broadcastMsg = JSON.stringify({
        type: "player_joined",
        data: {
            playerName: existing.name,
            playerCount: game.players.length,
        },
        id: 0,
    });

    const updatePlayersMsg = JSON.stringify({
        type: "update_players",
        data: game.players.map((p) => ({
            name: p.name,
            index: p.index,
            score: p.score,
        })),
        id: 0,
    });

    for (const p of game.players) {
        if (p.ws && p.ws.readyState === p.ws.OPEN) {
            p.ws.send(broadcastMsg);
            p.ws.send(updatePlayersMsg);
        }
    }

    if (game.hostWs && game.hostWs.readyState === game.hostWs.OPEN) {
        game.hostWs.send(broadcastMsg);
        game.hostWs.send(updatePlayersMsg);
    }
}