import { WebSocket } from "ws";
import type { Game, Player } from "../types/types.js";

const BASE_POINTS = 1000;

function broadcastToGame(game: Game, payload: unknown) {
    const raw = JSON.stringify(payload);
    for (const p of game.players) {
        if (p.ws?.readyState === WebSocket.OPEN) {
            p.ws.send(raw);
        }
    }
    if (game.hostWs?.readyState === WebSocket.OPEN) {
        game.hostWs.send(raw);
    }
}

export function broadcastUpdatePlayers(game: Game) {
    broadcastToGame(game, {
        type: "update_players",
        data: game.players.map((p) => ({
            name: p.name,
            index: p.index,
            score: p.score,
        })),
        id: 0,
    });
}

export function beginQuestionRound(game: Game, questionIndex: number) {
    if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = undefined;
    }

    game.currentQuestion = questionIndex;
    game.questionStartTime = Date.now();
    game.playerAnswers.clear();

    const q = game.questions[questionIndex];
    const questionMsg = {
        type: "question",
        data: {
            questionNumber: questionIndex + 1,
            totalQuestions: game.questions.length,
            text: q.text,
            options: q.options,
            timeLimitSec: q.timeLimitSec,
        },
        id: 0,
    };

    broadcastToGame(game, questionMsg);

    game.questionTimer = setTimeout(() => {
        endQuestionRound(game);
    }, q.timeLimitSec * 1000);
}

export function endQuestionRound(game: Game) {
    if (game.status !== "in_progress") return;

    const qIdx = game.currentQuestion;
    if (qIdx < 0 || qIdx >= game.questions.length) return;

    if (game._lastResolvedQuestion === qIdx) return;

    if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = undefined;
    }

    game._lastResolvedQuestion = qIdx;

    const q = game.questions[qIdx];
    const correctIndex = q.correctIndex;
    const timeLimitSec = q.timeLimitSec;
    const timeLimitMs = timeLimitSec * 1000;
    const start = game.questionStartTime ?? Date.now();

    const playerResults: Array<{
        name: string;
        answered: boolean;
        correct: boolean;
        pointsEarned: number;
        totalScore: number;
    }> = [];

    for (const p of game.players) {
        const rec = game.playerAnswers.get(p.name);
        const answered = !!rec;

        let correct = false;
        let pointsEarned = 0;

        if (answered && rec) {
            correct = rec.answerIndex === correctIndex;
            if (correct) {
                const elapsedMs = Math.min(Math.max(0, rec.timestamp - start), timeLimitMs);
                const elapsedSec = elapsedMs / 1000;
                const timeRemainingSec = Math.max(0, timeLimitSec - elapsedSec);
                pointsEarned = Math.min(
                    BASE_POINTS,
                    Math.round(BASE_POINTS * (timeRemainingSec / timeLimitSec))
                );
            }
        }

        p.score += pointsEarned;
        playerResults.push({
            name: p.name,
            answered,
            correct,
            pointsEarned,
            totalScore: p.score,
        });
    }

    broadcastToGame(game, {
        type: "question_result",
        data: {
            questionIndex: qIdx,
            correctIndex,
            playerResults,
        },
        id: 0,
    });

    const nextIndex = qIdx + 1;
    if (nextIndex < game.questions.length) {
        beginQuestionRound(game, nextIndex);
    } else {
        game.status = "finished";
        const sorted = [...game.players].sort((a, b) => b.score - a.score);
        let rank = 1;
        const scoreboard = sorted.map((pl: Player, i: number) => {
            if (i > 0 && pl.score < sorted[i - 1]!.score) {
                rank = i + 1;
            }
            return { name: pl.name, score: pl.score, rank };
        });

        broadcastToGame(game, {
            type: "game_finished",
            data: { scoreboard },
            id: 0,
        });
    }
}

export function maybeEndIfAllPlayersAnswered(game: Game) {
    if (game.status !== "in_progress") return;
    if (game.players.length === 0) return;

    const allAnswered = game.players.every((p) => game.playerAnswers.has(p.name));
    if (allAnswered) {
        endQuestionRound(game);
    }
}
