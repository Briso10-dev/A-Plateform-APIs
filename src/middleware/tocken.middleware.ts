import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { HttpCode } from "../core/constants";
import TokenOps from "../core/constants/jwt.functions";
import sendError from "../core/constants/errors";

const prisma = new PrismaClient();

const userMid = {
    // verification of user's role
    roleUser: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params

            const user = await prisma.user.findUnique({
                where: {
                    user_id: id
                }
            })
            if (user && user.role === "SUPERADMIN") next()
            else res.json({ "msg": "Action not authorised" }).status(HttpCode.FORBIDDEN)
        } catch (error) {
            sendError(res, error)
        }
    },
    verifyTokens : async (req:Request,res:Response,next:NextFunction)=>{
        try {
            const { email} = req.body
                
            const user = await prisma.user.findUnique({
                select: {
                    email:true,
                    name: true
                },
                where: {
                    email
                }
            })
            if(!user) return res.status(HttpCode.NOT_FOUND).json({msg:"user not found"})
            const accessToken = req.headers.authorization
            const refreshToken = req.cookies[`${user.name}-cookie`]
            // verifying if token exists
            if (!accessToken || !refreshToken)
                return res.status(HttpCode.UNAUTHORIZED).json({ message: `Unauthorized:${user.name} not actually connected` });
            const decodedUser = TokenOps.verifyAccessToken(accessToken);
            if (!decodedUser)
                return res.status(HttpCode.UNPROCESSABLE_ENTITY).json({ msg: "Invalid or expired token" })
            next()
        } catch (error) {
            sendError(res,error)
        }
    }
}

export default userMid