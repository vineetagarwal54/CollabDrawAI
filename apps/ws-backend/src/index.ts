import { WebSocket, WebSocketServer } from 'ws';
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config';
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8081 });

console.log("WebSocket server running on port 8081");

interface User {
  ws: WebSocket,
  rooms: string[],
  userId: string,
  userName?: string
}

const users: User[] = [];

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded == "string") {
      return null;
    }

    if (!decoded || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  } catch(e) {
    return null;
  }
  return null;
}

function broadcastUserCount(roomId: string) {
  const roomUsers = users.filter(user => user.rooms.includes(roomId));
  const userCount = roomUsers.length;
  
  roomUsers.forEach(user => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify({
        type: "user_count",
        roomId,
        count: userCount,
        users: roomUsers.map(u => ({ userId: u.userId, userName: u.userName }))
      }));
    }
  });
}

function cleanupDisconnectedUsers() {
  for (let i = users.length - 1; i >= 0; i--) {
    const user = users[i];
    if (user && user.ws.readyState !== WebSocket.OPEN) {
      // Broadcast updated user count for all rooms the user was in
      user.rooms.forEach(roomId => {
        broadcastUserCount(roomId);
      });
      users.splice(i, 1);
    }
  }
}

wss.on('connection', function connection(ws, request) {
  const url = request.url;
  if (!url) {
    return;
  }
  const queryParams = new URLSearchParams(url.split('?')[1]);
  const token = queryParams.get('token') || "";
  const userId = checkUser(token);

  if (userId == null) {
    ws.close()
    return null;
  }

  console.log(`User ${userId} connected`);

  const newUser: User = {
    userId,
    rooms: [],
    ws
  };

  users.push(newUser);

  ws.on('message', async function message(data) {
    let parsedData;
    if (typeof data !== "string") {
      parsedData = JSON.parse(data.toString());
    } else {
      parsedData = JSON.parse(data);
    }

    console.log("Message received:", parsedData);

    if (parsedData.type === "join_room") {
      const user = users.find(x => x.ws === ws);
      if (user && !user.rooms.includes(parsedData.roomId)) {
        user.rooms.push(parsedData.roomId);
        console.log(`User ${userId} joined room ${parsedData.roomId}`);
        
        // Broadcast updated user count
        broadcastUserCount(parsedData.roomId);
      }
    }

    if (parsedData.type === "leave_room") {
      const user = users.find(x => x.ws === ws);
      if (user) {
        const roomId = parsedData.roomId;
        user.rooms = user.rooms.filter(x => x !== roomId);
        console.log(`User ${userId} left room ${roomId}`);
        
        // Broadcast updated user count
        broadcastUserCount(roomId);
      }
    }

    if (parsedData.type === "drawing") {
      const roomId = parsedData.roomId;
      // Broadcast drawing data to all users in the room except sender
      users.forEach(user => {
        if (user.rooms.includes(roomId) && user.ws !== ws && user.ws.readyState === WebSocket.OPEN) {
          user.ws.send(JSON.stringify({
            type: "drawing",
            roomId,
            data: parsedData.data,
            userId: userId
          }));
        }
      });
    }

    if (parsedData.type === "chat") {
      const roomId = parsedData.roomId;
      const message = parsedData.message;

      try {
        await prismaClient.chat.create({
          data: {
            roomId: Number(roomId),
            message,
            userId
          }
        });

        users.forEach(user => {
          if (user.rooms.includes(roomId) && user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify({
              type: "chat",
              message: message,
              roomId,
              userId
            }));
          }
        });
      } catch (error) {
        console.error("Error saving chat message:", error);
      }
    }
  });

  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    const userIndex = users.findIndex(u => u.ws === ws);
    if (userIndex !== -1) {
      const disconnectedUser = users[userIndex];
      if (disconnectedUser) {
        // Broadcast updated user count for all rooms the user was in
        disconnectedUser.rooms.forEach(roomId => {
          setTimeout(() => broadcastUserCount(roomId), 100); // Small delay to ensure cleanup
        });
      }
      users.splice(userIndex, 1);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);
  });
});

// Periodic cleanup of disconnected users
setInterval(cleanupDisconnectedUsers, 30000); // Every 30 seconds

