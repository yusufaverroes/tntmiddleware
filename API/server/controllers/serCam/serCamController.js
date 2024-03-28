import { serialCamera } from "../../../../index";

const setAccuracyThreshold = (req, res) =>{
    try{
        serialCamera.accuracyThreshold=req.body.accuracy
        res.status(200).send({message:"accuracy threshold is changed"})
    }
    catch(err){
        console.log(err)
        res.send(err)

    }
    

}
export default setAccuracyThreshold