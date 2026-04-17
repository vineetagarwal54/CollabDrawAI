import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

export function middleware(req: Request, res: Response, next: NextFunction) {
    const token = (req.headers["authorization"] ?? "").toString();

    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === "string" || !decoded || !(decoded as JwtPayload).userId) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
        // @ts-ignore: attach for downstream handlers
        req.userId = (decoded as JwtPayload).userId;
        next();
    } catch (e) {
        res.status(403).json({ message: "Invalid or expired token" });
    }
}
