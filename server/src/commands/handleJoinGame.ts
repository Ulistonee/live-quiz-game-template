import type { AuthedWebSocket, JoinGameData, Player } from "../types/types.js";
import { games, players, users } from "../store/store.js";

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

    let player = players.get(ws.user.name);
    if (!player) {
        const u = users.get(ws.user.name);
        if (!u) {
            ws.send(JSON.stringify({ id: 0, error: "Register first" }));
            return;
        }
        player = { name: u.name, index: u.index, score: 0, ws };
        players.set(ws.user.name, player);
    }
    player.ws = ws;

    const alreadyInGame = game.players.some((p: Player) => p.index === player.index);
    if (!alreadyInGame) {
        game.players.push(player);
    }

    ws.send(JSON.stringify({ type: "game_joined", data: { gameId: game.id }, id: 0 }));

    const broadcastMsg = JSON.stringify({
        type: "player_joined",
        data: {
            playerName: player.name,
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
        game.hostWs.send(updatePlayersMsg);
    }
}