import type { AuthedWebSocket, StartGameData } from "../types/types.js";
import { games } from "../store/store.js";


export const handleStartGame = (ws: AuthedWebSocket, msg: unknown) => {
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }


    const game = games.get(msg.gameId);

    if (game.status !== "waiting") {
        ws.send(JSON.stringify({ id: 0, error: "Game already started" }));
        return;
    }

    game.status = "in_progress";
    game.currentQuestion = 0;

    const question = game.questions[0];

    const questionMsg = JSON.stringify({
        type: "question",
        data: {
            questionNumber: 1,
            totalQuestions: game.questions.length,
            text: question.text,
            options: question.options,
            timeLimitSec: question.timeLimitSec,
        },
        id: 0,
    });

    for (const p of game.players) {
        if (p.ws && p.ws.readyState === p.ws.OPEN) {
            p.ws.send(questionMsg);
        }
    }

    if (game.hostWs && game.hostWs.readyState === game.hostWs.OPEN) {
        game.hostWs.send(questionMsg);
    }
}
