import type { AuthedWebSocket } from "../types/types";
import games from "../store/store";


export const handleStartGame = (ws: AuthedWebSocket, msg: unknown) => {
    if (!ws.user) {
        ws.send(JSON.stringify({ id: 0, error: "Unauthorized: please reg first" }));
        return;
    }

    console.log("handleStartGame", ws.user);

    const { gameId } = msg;
    
    const broadcastMessage = {    
        type: "question",
        data: {
            "questionNumber": "<number>",
            "totalQuestions": "<number>",
            "text": "<string>",
            "options": ["<string>", "<string>", "<string>", "<string>"],
            "timeLimitSec": "<number>"
        },
        id: 0
    };

    for (const p of game.players) {
        if (p.ws && p.ws.readyState === p.ws.OPEN) {
            p.ws.send(broadcastMessage);
        }
    }
}