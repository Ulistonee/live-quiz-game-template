import { games } from "../store/store.js";
import { v4 as uuid } from "uuid";
import type { AuthedWebSocket } from "../types/types.js";
import type { CreateGameData, Game, Question } from "../types/types.js";

function isQuestion(x: unknown): x is Question {
    if (!x || typeof x !== "object") return false;
    const q = x as Record<string, unknown>;

    return (
        typeof q.text === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o) => typeof o === "string") &&
        typeof q.correctIndex === "number" &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3 &&
        typeof q.timeLimitSec === "number" &&
        Number.isFinite(q.timeLimitSec) &&
        q.timeLimitSec > 0
    );
}

function isCreateGameData(x: unknown): x is CreateGameData {
    if (!x || typeof x !== "object") return false;
    const d = x as Record<string, unknown>;
    return Array.isArray(d.questions) && d.questions.every(isQuestion);
}

export const handleCreateGame = (ws: AuthedWebSocket, msg: unknown) => {
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }

    if (!isCreateGameData(msg)) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid data" }));
        return;
    }

    const { questions } = msg;

    const game: Game = {
        id: uuid(),
        code: uuid().slice(0, 6),
        hostId: ws.user.index,
        hostWs: ws,
        questions: questions,
        players: [],
        currentQuestion: -1,
        status: 'waiting',
        questionStartTime: undefined,
        questionTimer: undefined,
        playerAnswers: new Map()
    }

    games.set(game.id, game);

    ws.send(JSON.stringify(
        { 
            type: "game_created",
            data: {
                gameId: game.id,
                code: game.code
            },
            id: 0 
        })
    );
}