import mongoose from "mongoose";
import {DB_NAME} from '../constants.js'

const dbConnect = async ()=>{
    try{
        const resp = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log("Database conneced : ");
    }
    catch(error){
        console.error("Error in database connection : ",error);
        process.exit(1);
        throw error;
    }
}

export default dbConnect;