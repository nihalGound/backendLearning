import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin:process.env.CORS_URL,
    credentials:true
}))



app.use(cookieParser());
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"));

import router from "./routes/user.route.js";
 app.use('/api/v1/user',router);

 //http::localhost:8000/api/v1/user/register


export {app}