import dotenv from "dotenv";
import dbConnect from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})

dbConnect();

app.listen(process.env.PORT,(req,res)=>{
    console.log(`server is started on port ${process.env.PORT}`)
})
