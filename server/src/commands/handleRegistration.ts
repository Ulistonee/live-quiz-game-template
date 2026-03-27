import { players } from '../store/store.js';
import { users } from '../store/store.js';
import type { AuthedWebSocket } from '../types/types.js';

export const handleRegistration = (ws: AuthedWebSocket, msg: any) => {
    const { name, password } = msg;
    let index;

    if (!name || !password) {
        ws.send(JSON.stringify({ id: 0, error: 'Invalid data' }));
        return;
    }

    if (users.has(name)) {
        const user = users.get(name);

        if (user?.password !== password) {
            ws.send(JSON.stringify({ id: 0, error: 'Invalid password' }));
            return;
        }
        index = users.get(name)?.index;
    }
    else {
        index = users.size + 1;
        users.set(name, {
            name: name,
            index: index,
            password: password,
            ws: ws,
        });
    }
    

    players.set(name, {
        name: name,
        index: index,
        score: 0,
        ws: ws,
    });

    ws.user = { name: name, index: index, password: password };
    ws.user.ws = ws;

    ws.send(JSON.stringify(
    { 
        type: "reg",
        data: {
            name: name,
            index: index,
            error: false,
            errorText: ""
        },
        id: 0
    }));
}