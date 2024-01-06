import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


const generateAccesssAndRefreshToken = async(user_id)=>{
    try {
        const user = await User.findById(user_id);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        if(!accessToken || !refreshToken){
            throw new apiError(500,"something went wrong white generating access and refresh token","cannot generated token");
        }
        user.refreshToken = refreshToken;
        user.save({validationBeforeSave:false});
        return {accessToken,refreshToken};
    } catch (error) {
        throw new apiError(500,"something went wrong in generating token",error);
    }
}

const userRegister = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for avatar image, upload it to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const { fullName, username, email, password } = req.body;

    if ([fullName, username, email, password].some((field) => field.trim() === "")) {
        throw new apiError(407, "all fields are necessary");
    }

    const existUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existUser) {
        throw new apiError(409, "user with username or email already exists");
    }

    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length >0){
        avatarLocalPath = req.files.avatar[0].path;
    }
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new apiError(400, "avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImg = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apiError(500, "server error couldn't upload file");
    }

    const user = await User.create({
        fullName,
        username,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImg?.url || ''
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new apiError(500, "something went wrong can't create user");
    }

    return res.status(200).json(
        new apiResponse(200, createdUser, "user registered successfully")
    );
});

const userLogin = asyncHandler(async(req,res)=>{
    //get data ->req.body
    //validate data ->check empty or required data
    //check user exist
    //verify password
    //generate access token and refresh token
    //save refresh token in database 
    //send reponse to user access token and refresh token


    const {email,username,password} = req.body;

    if(!(email || username)){
        throw new apiError(400,"email or username required","invalid credential")
    }

    if(!password){
        throw new apiError(400,"password is required","invalid credential")
    }

    const user =  await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new apiError(400,"no user exist with this email or password","no such user exist");
    }

    const validPassword = await user.isPasswordCorrect(password);

    if(!validPassword){
        throw new apiError(400,"incorrect password","invalid credential");
    }

    const {accessToken,refreshToken} = await generateAccesssAndRefreshToken(user._id);

    const loggedUser = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        HttpOnly:true,
        secure:true,
    }

   res.status(200)
   .cookie("accessToken",accessToken,option)
   .cookie("refreshToken",refreshToken,option)
   .json(
        new apiResponse(
            200,
            {
                user:loggedUser,accessToken,refreshToken
            },
            "user logged in successfuly"
        )
   );
})

const userLogout = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined,
            }
        },
        {
            new:true
        }
    )

    const option = {
        HttpOnly:true,
        secure:true
    }

    res.status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(
        new apiResponse(
            200,
            {},
            "user logged out"
        )
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingToken = req.body?.refreshToken || req.cookies?.refreshToken;
    
    if(!incomingToken){
        throw new apiError(401,"unauthorized reques");
    }

    try {
        const decodedToken = jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id);

        if(!user){
            throw new apiError(401,"invalid refresh token");
        }

        const {accessToken,newRefreshToken} = await generateAccesssAndRefreshToken(user._id);

        const option={
            HttpOnly:true,
            secure:true
        }

        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newRefreshToken,option)
        .json(
            new apiResponse(200,
                {accessToken,refreshToken: newRefreshToken},
                "new access token created")
        )

    } catch (error) {
        throw new apiError(401,error?.message || "Invalid refresh Token");
    }
})

export { userRegister, userLogin , userLogout , refreshAccessToken };
