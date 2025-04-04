import { Request, Response } from "express";
import { HttpCode } from "../core/constants";
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt'
import sendError from "../core/constants/errors";
import chalk from "chalk"
import sendMail from "../sentmail/send.mail";
import { otpGenerate } from "../core/config/otp_generator";
import { validationResult } from 'express-validator'
import EmailTemplate from "../core/template";
import TokenOps from "../core/constants/jwt.functions";

const prisma = new PrismaClient()

// creation of objects of functions
const userControllers = {
    getallUsers: async (req: Request, res: Response) => {
        try {
            const users = await prisma.user.findMany()
            res.send(users).status(HttpCode.OK)
        } catch (error) {
            sendError(res, error)
        }
    },
    createUser: async (req: Request, res: Response) => {
        try {
                const errors = validationResult(req)
                if (!errors.isEmpty()) 
                    return res.status(HttpCode.UNPROCESSABLE_ENTITY).json({ errors: errors.array() });
            
            const { name, email, password } = req.body
            // hashing the password
            const passHash = await bcrypt.hash(password, 12)

            const code_otp = otpGenerate()
            const expiredAt = new Date(Date.now() + 10 * 60 * 1000)
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: passHash,
                    otp: {
                        code: code_otp,
                        expiredAt
                    }

                },
            })
            if (!user) 
                res.status(HttpCode.BAD_REQUEST).json({ msg: "could not create user" })
            if(!user.otp?.code)
                return res.status(HttpCode.UNAUTHORIZED).json({msg:"We could not"});

            const message = "Reservation succeed"
            const emailContent = await EmailTemplate.OPTcodeSender(
                user.name,
                message,
                user.otp?.code
            );
            console.log('Email Content:', emailContent);
            await sendMail(user.email, "This is an anonymous connection!", emailContent)
            res.status(HttpCode.CREATED).json({msg:"User successfully created" }).status(HttpCode.OK)

        } catch (error) {
            sendError(res, error)
        }
    },
    modifyUser: async (req: Request, res: Response) => {
        try {
            const { id } = req.params //obtaining a user's id
            const { name, email, password,role } = req.body //obtaining modified users's info

            const passHash = await bcrypt.hash(password, 10)

            const updateUser = await prisma.user.update({
                select: {
                    name: true,
                    email: true,
                    password: true
                },
                where: {
                    user_id: id
                },
                data: {
                    name,
                    email,
                    password: passHash,
                    role
                }
            })
            if (!updateUser) return res.status(HttpCode.BAD_REQUEST).json({ msg: "enterd correct infos" })
            return res.status(HttpCode.OK).json(updateUser)
        } catch (error) {
            sendError(res, error)
        }
    },
    deleteoneUser: async (req: Request, res: Response) => {
        try {
            const { id } = req.params

            const deleteUser = await prisma.user.delete({
                where: {
                    user_id: id
                },
            })
            if (!deleteUser)
                return res.status(HttpCode.NOT_FOUND).json({ msg: "user  not found" })
            res.status(HttpCode.OK).json({ msg: "user successfully deleted" })
        } catch (error) {
            sendError(res, error)
        }
    },
    deleteUsers: async (req: Request, res: Response) => {
        try {
            const deleteUsers = await prisma.user.deleteMany()
            if (!deleteUsers)
                return res.status(HttpCode.NOT_FOUND).json({ msg: "user  not found" })
            res.status(HttpCode.OK).json({ msg: "user successfully deleted" })
        } catch (error) {
            console.error(chalk.red(error))
        }
    },
    signUp: async (req: Request, res: Response) => {
        const { code_otp, email } = req.body

        try {
            const user = await prisma.user.findFirst({
                where: {
                    email
                },
            })
            if(!user) return  res.status(HttpCode.NO_CONTENT).json({ msg: 'Email not valid' })
            const actual_time = new Date(Date.now())
            if (user?.otp != null) {
                    if (user.otp.code != code_otp || user.otp.expiredAt > actual_time) {
                        const userUpdate = await prisma.user.update({
                            where: {
                                email: user.email
                            },
                            data: {
                                otp: null
                            }
                        });
                        return res.status(HttpCode.NO_CONTENT).json({ msg: 'Incorrect otp code_entered or already expired otp_code' })
                    }
             
            } else 
                return res.json({ msg: "Successful signding here!" }).status(HttpCode.NO_CONTENT)
            
        } catch (error) {
            sendError(res, error)
        }
    },
    loginUser: async (req: Request, res: Response) => {
        const { email, password } = req.body

        try {
            const user = await prisma.user.findFirst({
                select: {
                    name: true,
                    email: true,
                    password: true
                },
                where: {
                    email
                },
            })
            if (!user)
                return res.status(HttpCode.NOT_FOUND).json({ msg: `${email} not found` })

            const testPass = await bcrypt.compare(password, user.password)
            if (!testPass)
                return res.status(HttpCode.NOT_FOUND).json({ msg: `${password} Invalid credentials` })
            // Remove password before token generation
            const { password: _, ...userWithoutPassword } = user;
            // Generate tokens
            const accessToken = TokenOps.generateAccessToken(userWithoutPassword);
            const refreshToken = TokenOps.generateRefreshToken(userWithoutPassword);

            // Store refresh token in cookie
            res.cookie(`${user.name}-cookie`, refreshToken, {
                httpOnly: true,
                secure: true,
                maxAge: 30 * 24 * 60 * 1000
            }) //refresh token stored in cookie
            console.log("Access Token:", accessToken);
            res.json({ msg: "User successfully logged in" }).status(HttpCode.OK)
        } catch (error) {
            sendError(res, error)
        }
    },
    logoutUser: async (req: Request, res: Response) => {
        try {

            const { email } = req.body
            //confirming first by email if user exists 
            const user = await prisma.user.findFirst({
                select: {
                    name: true,
                    email: true
                },
                where: {
                    email
                }
            })
            if (!user)
                return res.status(HttpCode.NOT_FOUND).json({ msg: `${email} not found` })
            // obtaiining user's token
            res.clearCookie('${user.name}-cookie`')
            return res.status(HttpCode.OK).json({ msg: "User succesffully logout" })

        } catch (error) {
            sendError(res, error)
        }
    },
    //Here the idea is a coming to sign in after a long period of inactivity
    refreshToken: async (req: Request, res: Response) => {
        try {
            const { email} = req.body
                
            const user = await prisma.user.findUnique({
                select: {
                    name : true,
                    email : true,
                    password:true
                },
                where: {
                    email
                }
            })

            if(!user) 
                return res.status(HttpCode.NOT_FOUND).json({msg:"user not found"})

            const accessToken = req.headers.authorization
            const refreshToken = req.cookies[`${user.name}-cookie`]

            if(!accessToken && !refreshToken ) //for more checking, checking also that the access token does not exists
                return res.status(HttpCode.UNAUTHORIZED).json({ msg: `${user.name} You never actually sign in here,please sign-up` })
            //Now if he succesfully the first step
            const decodedPayload = TokenOps.verifyRefreshToken(refreshToken)
            if(!decodedPayload) //Here if does not ave the refresh token it defaults means no access token
                return res.status(HttpCode.UNAUTHORIZED).json({ msg: `${user.name} Bro your duration here had expired please sign-in again` })
            
            // Remove password before token generation
            const { password: _, ...userWithoutPassword } = user;
            //genearting a new access token
            const newAccessToken = TokenOps.generateAccessToken(userWithoutPassword)
            console.log("Access Token:", newAccessToken);

            return res.status(HttpCode.OK).json({ msg: `${user.name} Welcome back` })
            
        } catch (error) {
            sendError(res, error)
        }
    },
}

export default userControllers;