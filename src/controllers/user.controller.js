import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/User.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
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

const updateUserName = asyncHandler(async(req,res)=>{
    const {oldUsername, newUsername} = req.body;

    if(!oldUsername || !newUsername){
        throw new apiError(401,"oldUsername and newUsername both required","oldUsername and newusername required")
    }

    if(oldUsername!==req.user.username){
        throw new apiError(401,"oldusername is not correct","invalid oldusername");
    }

    if(oldUsername===newUsername){
        throw new apiError(401,"new user should not match with old user name","invalid new username");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                username:newUsername,
            }
        },
        {new:true}
    ).select("-password -refreshToken");

    if(!updatedUser){
        throw new apiError(500,"something went wrong while updating username","error while updating username")
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updatedUser,
            "username changed successfully"
        )
    );
})

const updateFullname = asyncHandler(async(req,res)=>{
    const {oldFullname, newFullname}=req.body;

    if(!oldFullname || !newFullname){
        throw new apiError(401,"both oldFullname and newFullname required","fullname and newFullname both required")
    }

    if(oldFullname!==req.user.fullName){
        throw new apiError(401,"invalid old fullname","invalid old fullname")
    }

    if(oldFullname===newFullname){
        throw new apiError(401,"new full name should not match old fullname","new full name is same as oldfullname")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName:newFullname,
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    if(!updatedUser){
        throw new apiError(500,"error in updating fullname","cannot update full name")
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updatedUser,
            "fullname changed successfully"
        )
    )
});

const changeAvatar = asyncHandler(async(req,res)=>{
    if(!req.file){
        throw new apiError(401,"no avatar file provide","no avatar file provided");
    }
    const avatarLocalPath = req.file.path;
    if(!avatarLocalPath){
        throw new apiError(401,"invalid avatar file path","invalid avatar file path")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){
        throw new apiError(500,"cannot upload avatar on cloudinary","error in uploading avatar in cloudinary")
    }

    const oldAvatarPublicId = req.user.avatar.split('/').pop().split('.')[0];
    const result = await deleteFromCloudinary(oldAvatarPublicId);
    if(result?.result!=='ok' || !result){
        throw new apiError(500,"cannot delete file from cloudinary");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar?.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(
        200,
        updatedUser,
        "avatar changed successfully"
    ))
});

const changeCover = asyncHandler(async(req,res)=>{
    if(!req.file){
        throw new apiError(401,"no cover image file provide","no cover image file provided");
    }
    const coverImageLocalPath = req.file.path;
    if(!coverImageLocalPath){
        throw new apiError(401,"invalid cover image file path","invalid avatar file path")
    }

    const coverImg = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImg){
        throw new apiError(500,"cannot upload cover image on cloudinary","error in uploading cover image in cloudinary")
    }

    const oldCoverImgPublicId = req.user.coverImage.split('/').pop().split('.')[0];
    const result = await deleteFromCloudinary(oldCoverImgPublicId);
    if(result?.result!=='ok' || !result){
        throw new apiError(500,"cannot delete file from cloudinary");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImg?.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(
        200,
        updatedUser,
        "cover image changed successfully"
    ))
});

const changePassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;
    if(!oldPassword || !newPassword){
        throw new apiError(401,"both old passwor and new password required","both old password and new password required")
    }
    if(oldPassword===newPassword){
        throw new apiError(401,"new password should not match old password","new password same as old password")
    }

    const user = await User.findById(req.user._id);

    const validUser = await user.isPasswordCorrect(oldPassword);
    if(!validUser){
        throw new apiError(401,"invalid old password","invalid old password");
    }

    user.password = newPassword;
    await user.save({validationBeforeSave:true})

    return res
    .status(200)
    .json(new apiResponse(
        200,
        {},
        "password changed successfully"
    ))
})

const getCurrUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json({user: req.user, message:"user fetched successfully"});
})

export {
    userRegister , 
    userLogin , 
    userLogout , 
    refreshAccessToken ,
    updateUserName ,
    updateFullname ,
    changeAvatar ,
    changeCover ,
    changePassword ,
    getCurrUser
};
