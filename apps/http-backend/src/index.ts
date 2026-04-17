import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const BCRYPT_SALT_ROUNDS = 10;

app.post("/signup", async (req, res) => {
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({
            message: "Incorrect inputs"
        });
        return;
    }
    try {
        const hashedPassword = await bcrypt.hash(parsedData.data.password, BCRYPT_SALT_ROUNDS);
        const user = await prismaClient.user.create({
            data: {
                email: parsedData.data.username,
                password: hashedPassword,
                name: parsedData.data.name
            }
        });
        res.json({
            userId: user.id
        });
    } catch (e) {
        res.status(411).json({
            message: "User already exists with this username"
        });
    }
});

app.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({
            message: "Incorrect inputs"
        });
        return;
    }

    const user = await prismaClient.user.findFirst({
        where: {
            email: parsedData.data.username
        }
    });

    if (!user) {
        res.status(403).json({
            message: "Not authorized"
        });
        return;
    }

    const passwordMatches = await bcrypt.compare(parsedData.data.password, user.password);
    if (!passwordMatches) {
        res.status(403).json({
            message: "Not authorized"
        });
        return;
    }

    const token = jwt.sign({
        userId: user.id
    }, JWT_SECRET);

    res.json({
        token
    });
});

app.post("/room", middleware, async (req, res) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({
            message: "Incorrect inputs"
        });
        return;
    }
    // @ts-ignore: set by middleware
    const userId = req.userId;

    try {
        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: userId
            }
        });

        res.json({
            roomId: room.id
        });
    } catch (e) {
        res.status(411).json({
            message: "Room already exists with this name"
        });
    }
});

app.get("/chats/:roomId", async (req, res) => {
    try {
        const roomIdNum = Number(req.params.roomId);
        if (Number.isNaN(roomIdNum)) {
            res.status(400).json({ message: "Invalid room id", messages: [] });
            return;
        }
        const messages = await prismaClient.chat.findMany({
            where: { roomId: roomIdNum },
            orderBy: { id: "desc" },
            take: 1000
        });

        res.json({ messages });
    } catch (e) {
        console.log(e);
        res.status(500).json({ messages: [] });
    }
});

app.get("/room/:slug", async (req, res) => {
    const slug = req.params.slug;
    const room = await prismaClient.room.findFirst({
        where: { slug }
    });

    res.json({ room });
});

app.get("/room/id/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ message: "Invalid room id" });
            return;
        }
        const room = await prismaClient.room.findFirst({
            where: { id }
        });
        if (!room) {
            res.status(404).json({ message: "Room not found" });
            return;
        }
        res.json({ room });
    } catch (e) {
        res.status(500).json({ message: "Something went wrong" });
    }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
    console.log(`HTTP backend running on port ${PORT}`);
});
