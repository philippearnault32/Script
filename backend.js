const { WebSocketServer } = require('ws');
const { exec } = require('child_process');
const fs = require('fs');    
const path = require('path');  

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: port });

console.log(`=== SERVEUR EN LIGNE SUR LE PORT ${port} ===`);

// --- AUTOMATISATION DU TUNNEL ET DU NAVIGATEUR ---
// On lance localtunnel directement depuis Node.js pour éviter les bugs Windows (.bat)
const localtunnelProcess = exec(`npx localtunnel --port ${port}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`[Localtunnel Erreur] : ${error.message}`);
    }
});

// Lecture du flux généré par localtunnel pour attraper l'URL
localtunnelProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // On cherche la ligne contenant l'URL (ex: your url is: https://xxxx.loca.lt)
    if (output.includes('url is:')) {
        const rawUrl = output.split('url is:')[1].trim();
        console.log(`[Succès] URL publique détectée : ${rawUrl}`);
        
        // Nettoyage pour extraire uniquement le sous-domaine (ex: xxxx.loca.lt)
        let cleanUrl = rawUrl.replace('https://', '').replace('http://', '').trim();
        const targetAddress = `http://localhost:8080/?tunnel=${cleanUrl}`;
        
        console.log(`[Navigateur] Ouverture automatique de : ${targetAddress}`);
        
        // Commande Windows standard pour ouvrir l'URL dans le navigateur par défaut
        exec(`start ${targetAddress}`);
    }
});

// Capturer les erreurs potentielles de flux
localtunnelProcess.stderr.on('data', (data) => {
    console.error(`[Localtunnel Statut] : ${data.toString().trim()}`);
});
// -------------------------------------------------

const clients = new Map();
const rooms = {};

wss.on('connection', (ws) => {
    clients.set(ws, { 
        id: "User-" + Math.random().toString(36).substring(2, 5).toUpperCase(), 
        pseudo: "Développeur",
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`, 
        cursor: { line: 1, column: 1 },
        mouse: { x: 0, y: 0 },
        activeFile: null, 
        room: null 
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const clientMeta = clients.get(ws);

            switch(data.type) {
                case "set-pseudo":
                    clientMeta.pseudo = data.pseudo;
                    ws.send(JSON.stringify({ type: "welcome", id: clientMeta.id, pseudo: clientMeta.pseudo }));
                    break;

                case "create-room":
                    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    rooms[roomCode] = {
                        owner: ws,
                        filesStructure: [], 
                        fileContents: {},
                        clients: [ws]
                    };
                    clientMeta.room = roomCode;
                    ws.send(JSON.stringify({ type: "room-created", roomCode: roomCode }));
                    break;

                case "join-room":
                    const code = data.roomCode.toUpperCase().trim();
                    if (rooms[code]) {
                        rooms[code].clients.push(ws);
                        clientMeta.room = code;
                        ws.send(JSON.stringify({ 
                            type: "room-joined", 
                            roomCode: code, 
                            treeHTML: rooms[code].filesStructure 
                        }));
                        broadcastToRoom(code, null, { type: "presence", clients: getRoomClients(code) });
                    } else {
                        ws.send(JSON.stringify({ type: "error", message: "Code de session introuvable !" }));
                    }
                    break;

                case "sync-tree":
                    if (clientMeta.room && rooms[clientMeta.room] && rooms[clientMeta.room].owner === ws) {
                        rooms[clientMeta.room].filesStructure = data.treeHTML;
                        broadcastToRoom(clientMeta.room, ws, { type: "tree-updated", treeHTML: data.treeHTML });
                    }
                    break;

                case "request-create-file":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        const ownerWs = rooms[clientMeta.room].owner;
                        ownerWs.send(JSON.stringify({ 
                            type: "cmd-create-file", 
                            parentPath: data.parentPath, 
                            filename: data.filename 
                        }));
                    }
                    break;

                case "open-file":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        clientMeta.activeFile = data.filename;
                        const cache = rooms[clientMeta.room].fileContents[data.filename];
                        
                        if (cache !== undefined) {
                            ws.send(JSON.stringify({ 
                                type: "file-content", 
                                filename: data.filename, 
                                forcedLang: data.forcedLang, 
                                text: cache 
                            }));
                            broadcastToRoom(clientMeta.room, null, { type: "presence", clients: getRoomClients(clientMeta.room) });
                        } else {
                            const ownerWs = rooms[clientMeta.room].owner;
                            ownerWs.send(JSON.stringify({ 
                                type: "request-file-content", 
                                filename: data.filename, 
                                forcedLang: data.forcedLang 
                            }));
                        }
                    }
                    break;

                case "serve-file-content":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        rooms[clientMeta.room].fileContents[data.filename] = data.text;
                        broadcastToRoom(clientMeta.room, null, { 
                            type: "file-content", 
                            filename: data.filename, 
                            forcedLang: data.forcedLang, 
                            text: data.text 
                        });
                        broadcastToRoom(clientMeta.room, null, { type: "presence", clients: getRoomClients(clientMeta.room) });
                    }
                    break;

                case "edit":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        rooms[clientMeta.room].fileContents[data.filename] = data.text;
                        broadcastToRoom(clientMeta.room, ws, { 
                            type: "edit", 
                            filename: data.filename, 
                            text: data.text 
                        });
                    }
                    break;

                case "cursor":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        clientMeta.cursor = data.position;
                        broadcastToRoom(clientMeta.room, ws, { type: "presence", clients: getRoomClients(clientMeta.room) });
                    }
                    break;

                case "mouse-move":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        clientMeta.mouse = data.mouse;
                        broadcastToRoom(clientMeta.room, ws, { 
                            type: "mouse-sync", 
                            clientId: clientMeta.id, 
                            pseudo: clientMeta.pseudo, 
                            color: clientMeta.color, 
                            mouse: data.mouse,
                            editorPos: data.editorPos,
                            activeFile: data.activeFile 
                        });
                    }
                    break;

                case "file-switch":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        clientMeta.activeFile = data.filePath;
                        broadcastToRoom(clientMeta.room, null, { 
                            type: "presence", 
                            clients: getRoomClients(clientMeta.room) 
                        });
                    }
                    break;

                case "selection-change":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        broadcastToRoom(clientMeta.room, ws, {
                            type: "selection-sync",
                            clientId: clientMeta.id,
                            color: clientMeta.color,
                            filename: data.filename,
                            selection: data.selection
                        });
                    }
                    break;

                case "terminal-command":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        exec(data.command, { cwd: process.cwd() }, (error, stdout, stderr) => {
                            const output = stdout || stderr || (error ? error.message : "Commande exécutée sans retour.");
                            broadcastToRoom(clientMeta.room, null, {
                                type: "terminal-output",
                                output: `\n${output}\n`
                            });
                        });
                    }
                    break;

                case "run-file":
                    if (clientMeta.room && rooms[clientMeta.room]) {
                        const room = rooms[clientMeta.room];
                        const ext = data.filename.split('.').pop();
                        const fileContent = data.text || room.fileContents[data.filename] || "";

                        if (ext === "html" || ext === "htm") {
                            broadcastToRoom(clientMeta.room, null, { type: "terminal-output", output: "\n[Système] Impossible d'exécuter un fichier HTML dans la console.\n" });
                            break;
                        } else if (ext !== "py" && ext !== "js") {
                            broadcastToRoom(clientMeta.room, null, { 
                                type: "terminal-output", 
                                output: `\n[Système] L'extension .${ext} n'est pas configurée pour l'exécution.\n` 
                            });
                            break;
                        }

                        const tempFilename = `temp_${clientMeta.room}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                        const tempPath = path.join(process.cwd(), tempFilename);

                        fs.writeFile(tempPath, fileContent, 'utf-8', (err) => {
                            if (err) {
                                broadcastToRoom(clientMeta.room, null, { 
                                    type: "terminal-output", 
                                    output: `\n[Erreur] Impossible de générer l'exécution : ${err.message}\n` 
                                });
                                return;
                            }

                            let cmd = "";
                            if (ext === "py") cmd = `python "${tempFilename}"`;
                            else if (ext === "js") cmd = `node "${tempFilename}"`;

                            broadcastToRoom(clientMeta.room, null, { type: "terminal-output", output: `\n[Exécution] > Exécution instantanée de ${data.filename}...\n` });

                            exec(cmd, { 
                                cwd: process.cwd(),
                                env: { 
                                    ...process.env, 
                                    PYTHONUTF8: "1",               
                                    PYTHONIOENCODING: "utf-8",     
                                    LANG: "fr_FR.UTF-8",           
                                    LC_ALL: "fr_FR.UTF-8"          
                                } 
                            }, (error, stdout, stderr) => {
                                const output = stdout || stderr || (error ? error.message : "Fin de l'exécution.");
                                
                                broadcastToRoom(clientMeta.room, null, {
                                    type: "terminal-output",
                                    output: `${output}\n`
                                });

                                fs.unlink(tempPath, (unlinkErr) => {
                                    if (unlinkErr) console.error(`[Erreur Nettoyage] Impossible de supprimer ${tempFilename}`, unlinkErr);
                                });
                            });
                        });
                    }
                    break;
            }
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => {
        const clientMeta = clients.get(ws);
        if (clientMeta && clientMeta.room && rooms[clientMeta.room]) {
            const rCode = clientMeta.room;
            rooms[rCode].clients = rooms[rCode].clients.filter(c => c !== ws);
            broadcastToRoom(rCode, null, { type: "mouse-leave", clientId: clientMeta.id });
            if (rooms[rCode].clients.length === 0) delete rooms[rCode];
            else broadcastToRoom(rCode, null, { type: "presence", clients: getRoomClients(rCode) });
        }
        clients.delete(ws);
    });
});

function getRoomClients(roomCode) {
    if (!rooms[roomCode]) return [];
    return rooms[roomCode].clients.map(ws => clients.get(ws));
}

function broadcastToRoom(roomCode, sender, data) {
    if (!rooms[roomCode]) return;
    const payload = JSON.stringify(data);
    rooms[roomCode].clients.forEach(client => {
        if (client !== sender && client.readyState === 1) {
            client.send(payload);
        }
    });
}
