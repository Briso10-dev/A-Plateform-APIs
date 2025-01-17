import { Router } from "express";
import userControllers from "../controlleurs/user.controlleurs";
import middleware from "../middleware/tocken.middleware";
import { loginValidator } from "../middleware/validator.middleware";

const routerUser = Router()

// CRUD Operations:

// GET method 1
routerUser.get("/admin/:id", middleware.roleUser, userControllers.getallUsers) //geting all users if superadmin
routerUser.get("/refresh/:id", userControllers.refreshToken) //refresh a token
// CREATE method
routerUser.post("/", loginValidator,userControllers.createUser) //creation of users
routerUser.post("/otp-verification", userControllers.signUp) //verification through otp
routerUser.post("/login", userControllers.loginUser) //login of users
// user deconnexion
routerUser.post("/logout/:id",middleware.verifyTokens,userControllers.logoutUser)
routerUser.post("/loginInact", middleware.verifyTokens, userControllers.refreshToken) //welcome of a user if has accesstoken
// UPDATE method
routerUser.put("/:id", userControllers.modifyUser)
// DELETE method 1
routerUser.delete("/:id", userControllers.deleteoneUser) //deleting one user
routerUser.delete("/", middleware.roleUser, userControllers.deleteUsers) //deleting many users if superadmin

export default routerUser