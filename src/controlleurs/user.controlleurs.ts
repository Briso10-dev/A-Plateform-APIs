import { Request, Response } from "express";
import { HttpCode } from "../core/constants";
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt'
import sendError from "../core/constants/errors";
import chalk from "chalk"
import sendMail from "../sentmail/send.mail";
import { otpGenerate } from "../core/config/otp_generator";
import tokenOps from "../core/config/jwt.function";
import { validationResult } from 'express-validator'
import EmailTemplate from "../core/template";
import TokenOps from "../core/constants/jwt.functions";

const prisma = new PrismaClient()

// creation of objects of functions
const Contolleurs = {
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
    verifyOTP: async (req: Request, res: Response) => {
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
                return res.status(HttpCode.NOT_FOUND).json({ msg: `${password} not correct` })
            // jwt token generation
            user.password = "" //rendering the password null not to create token from it
            const accessToken = TokenOps.generateAccessToken(user)
            const refreshToken = TokenOps.generateRefreshToken(user)
            user.password = " "
            res.cookie(`${user.name}-cookie`, refreshToken, {
                httpOnly: true,
                secure: true,
                maxAge: 30 * 24 * 60 * 1000
            }) //refresh token stored in cookie
            console.log(accessToken)
            res.json({ msg: "User successfully logged in" }).status(HttpCode.OK)
        } catch (error) {
            sendError(res, error)
        }
    },
    refreshToken: async (req: Request, res: Response) => {
        try {
            // const cookies = req.cookies....
            // if(!cookie){
            //     res.status().json()
            // }
            // const decodedPayload = tokenOps.decodeAccessToken(ca doit etre refreshToken)
            // if(decodedPayload!==null){
            //const {user_id} = verify
            //...creer un user grace a prisma(en fonction du user_id) puis retirez le password si password est vide,creer un access token et faire un res.json a la fin
            //}
        } catch (error) {
            sendError(res, error)
        }
    },
    // function that directly load a user in plateform
    registerUser: async (res: Response) => {
        try {
            res.json({ msg: "welcome to worketyamo's plateform" }).status(HttpCode.OK)
            chalk.blueBright(console.log("A user has connecter"))
        } catch (error) {
            console.error(chalk.red(error))
        }
    }
}

export default Contolleurs;