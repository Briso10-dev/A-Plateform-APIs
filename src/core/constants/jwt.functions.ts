import jwt from "jsonwebtoken";
import { envs } from "../config/env";
import { readFileSync } from "fs";

const openFile = (file: string) => {
  return readFileSync(file, "utf-8");
};

const TokenOps = {
  generateAccessToken: (user: any) => {
    return jwt.sign(user, openFile(envs.JWT_ACCESS_TOKEN_PRIV), {
      algorithm: "RS256",
      expiresIn: "5m"
    });
  },
  generateRefreshToken: (user: any) => {
    return jwt.sign(user, openFile(envs.JWT_REFRESH_TOKEN_PRIV), {
      algorithm: "RS256",
      expiresIn: "30d"
    });
  },
  verifyAccessToken: (token: string) => {
    return jwt.verify(token, openFile(envs.JWT_ACCESS_TOKEN_PUB));
  },
  verifyRefreshToken: (token: string) => {
    return jwt.verify(token, openFile(envs.JWT_REFRESH_TOKEN_PUB));
  },
  decodeAccessToken: (token: string) => {
    return jwt.decode(token);
  },
  decodeRefreshToken: (token: string) => {
    return jwt.decode(token);
  }
};

export default TokenOps;
