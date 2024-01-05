import mongoose from "mongoose";
import bcrypt from "bcrypt";
import  jwt  from "jsonwebtoken";

const userModel = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        index:true,
        trim :true
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        lowercase:true,
        unique:true,
        trim:true
    },
    avatar:{
        type:String, //cloudinary url
        required:true,
    },
    coverImage:{
        type:String, //cloudinary url
    },
    watchHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Videos"
    }],
    password:{
        type:String,
        required:true,
    },
    refreshToken:{
        type:String,
    }

},{timestamps:true})
userModel.pre("save", async function (next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10);
    next();
})

userModel.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);
}

userModel.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userModel.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id :this._id,
            username : this.username,
            email:this.email,
            fullName:this.fullName
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userModel);