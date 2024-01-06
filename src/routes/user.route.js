import { Router } from "express";
import { refreshAccessToken, userLogin, userLogout, userRegister } from "../controllers/user.controller.js";
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