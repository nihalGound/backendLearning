import { Router } from "express";
import { changeAvatar, changeCover, changePassword, getCurrUser, refreshAccessToken, updateFullname, updateUserName, userLogin, userLogout, userRegister } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

const fileUpload = upload.fields([
    {
        name:'avatar',
        maxCount:1
    },
    {
        name:'coverImage',
        maxCount:1
    }
]);


router.post('/register',fileUpload,userRegister);

router.post('/login',userLogin);

//secure routes
router.post('/logout',auth,userLogout);

router.post('/refresh-token',refreshAccessToken);

router.post('/update-username',auth,updateUserName);

router.post('/update-fullname',auth,updateFullname);

router.post('/update-avatar',auth,upload.single('avatar'),changeAvatar);

router.post('/update-coverImage',auth,upload.single('coverImage'),changeCover);

router.post('/update-password',auth,changePassword);

router.get('/curr-user',auth,getCurrUser);

// router.route("/register").post(
//     upload.fields([
//         {
//             name: "avatar",
//             maxCount: 1
//         }, 
//         {
//             name: "coverImage",
//             maxCount: 1
//         }
//     ]),
//     userRegister
//     )

export default router;