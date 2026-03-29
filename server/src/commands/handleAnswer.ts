import { games } from "../store/store.js";
import type { AnswerData, AuthedWebSocket, Player } from "../types/types.js";
import { maybeEndIfAllPlayersAnswered } from "../game/questionFlow.js";

function isAnswerData(x: unknown): x is AnswerData {
    if (!x || typeof x !== "object") return false;
    const d = x as Record<string, unknown>;
    return (
        typeof d.gameId === "string" &&
        typeof d.questionIndex === "number" &&
        Number.isInteger(d.questionIndex) &&
        typeof d.answerIndex === "number" &&
        Number.isInteger(d.answerIndex)
    );
}

export const handleAnswer = (ws: AuthedWebSocket, msg: unknown) => {
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }

    if (!isAnswerData(msg)) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid data" }));
        return;
    }

    const { gameId, questionIndex, answerIndex } = msg;

    const game = games.get(gameId);

    if (!game) {
        ws.send(JSON.stringify({ id: 0, error: "Game not found" }));
        return;
    }

    if (game.status !== "in_progress") {
        ws.send(JSON.stringify({ id: 0, error: "Game not in progress" }));
        return;
    }

    if (questionIndex !== game.currentQuestion) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid question index" }));
        return;
    }

    if (questionIndex < 0 || questionIndex >= game.questions.length) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid question index" }));
        return;
    }

    const q = game.questions[questionIndex];
    if (answerIndex < 0 || answerIndex >= q.options.length) {
        ws.send(JSON.stringify({ id: 0, error: "Invalid answer index" }));
        return;
    }

    const isPlayer = game.players.some((p: Player) => p.name === ws.user!.name);
    if (!isPlayer) {
        ws.send(JSON.stringify({ id: 0, error: "You are not in this game" }));
        return;
    }

    game.playerAnswers.set(ws.user.name, { answerIndex, timestamp: Date.now() });

    ws.send(JSON.stringify({ type: "answer_accepted", data: { questionIndex }, id: 0 }));

    maybeEndIfAllPlayersAnswered(game);
};
