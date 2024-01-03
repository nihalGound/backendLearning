import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videosModel = new mongoose.Schema({
    video:{
        type:String, //cloudinary url
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    thumbnail:{
        type:String, //cloudinary url
        required:true,
    },
    duration:{
        type:Number, //cloudinary
        required:true,
    },
    views:{
        type:Number,
        default:0
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    isPublished:{
        type:Boolean,
        default:true,
    }

},
{timestamps:true})

videosModel.plugin(mongooseAggregatePaginate)

export const Videos = mongoose.model("Videos",videosModel);