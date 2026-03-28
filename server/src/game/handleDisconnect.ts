import type { AuthedWebSocket } from "../types/types.js";
import { games, players, users } from "../store/store.js";
import { broadcastUpdatePlayers, maybeEndIfAllPlayersAnswered } from "./questionFlow.js";

export function handleClientDisconnect(ws: AuthedWebSocket) {
    if (!ws.user) return;

    const { name } = ws.user;

    const globalPlayer = players.get(name);
    if (globalPlayer?.ws === ws) {
        globalPlayer.ws = undefined;
    }

    const user = users.get(name);
    if (user?.ws === ws) {
        user.ws = undefined;
    }

    for (const game of games.values()) {
        if (game.hostWs === ws) {
            game.hostWs = undefined;
        }

        const idx = game.players.findIndex((p) => p.ws === ws);
        if (idx === -1) continue;

        game.players.splice(idx, 1);
        game.playerAnswers.delete(name);

        broadcastUpdatePlayers(game);

        if (game.status === "in_progress") {
            maybeEndIfAllPlayersAnswered(game);
        }
    }
}
