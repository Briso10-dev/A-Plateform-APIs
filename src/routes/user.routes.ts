import { Router } from "express";
import Contolleurs from "../controlleurs/user.controlleurs";
import middleware from "../middleware/tocken.middleware";
import { loginValidator } from "../middleware/validator.middleware";

const routerUser = Router()

// CRUD Operations:

// GET method 1
routerUser.get("/admin/:id", middleware.roleUser, Contolleurs.getallUsers) //geting all users if superadmin
routerUser.get("/refresh/:id", Contolleurs.refreshToken) //refresh a token
// CREATE method
routerUser.post("/", loginValidator,Contolleurs.createUser) //creation of users
routerUser.post("/otp-verification", Contolleurs.signUp) //verification through otp
routerUser.post("/login", Contolleurs.loginUser) //login of users
routerUser.post("/register", middleware.verifyToken, Contolleurs.refreshToken) //welcome of a user if has accesstoken
// UPDATE method
routerUser.put("/:id", Contolleurs.modifyUser)
// DELETE method 1
routerUser.delete("/:id", Contolleurs.deleteoneUser) //deleting one user
routerUser.delete("/", middleware.roleUser, Contolleurs.deleteUsers) //deleting many users if superadmin

export default routerUser