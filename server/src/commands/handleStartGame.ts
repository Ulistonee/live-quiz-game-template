import type { AuthedWebSocket, StartGameData } from "../types/types.js";
import { games } from "../store/store.js";
import { beginQuestionRound } from "../game/questionFlow.js";

function isStartGameData(x: unknown): x is StartGameData {
    if (!x || typeof x !== "object") return false;
    const d = x as Record<string, unknown>;
    return typeof d.gameId === "string" && d.gameId.length > 0;
}

export const handleStartGame = (ws: AuthedWebSocket, msg: unknown) => {
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }

    if (!isStartGameData(msg)) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid data" }));
        return;
    }

    const game = games.get(msg.gameId);
    if (!game) {
        ws.send(JSON.stringify({ id: 0, error: "Game not found" }));
        return;
    }

    if (String(ws.user.index) !== String(game.hostId)) {
        ws.send(JSON.stringify({ id: 0, error: "Only host can start the game" }));
        return;
    }

    if (game.status !== "waiting") {
        ws.send(JSON.stringify({ id: 0, error: "Game already started" }));
        return;
    }

    game.status = "in_progress";
    game._lastResolvedQuestion = undefined;
    beginQuestionRound(game, 0);
};
