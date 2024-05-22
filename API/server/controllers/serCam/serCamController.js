import { serialCamera } from "../../../../index";
// TODO: delete and tell BE to use master-config instead
const setAccuracyThreshold = (req, res) =>{
    try{

        if (!serialCamera.running){
            return res.status(500).send({message: "Serialization camera not detected"})
        }
        serialCamera.accuracyThreshold=req.body.accuracy
        res.status(200).send({message:`accuracy is changed to ${req.body.accuracy} successfully`})
    }
    catch(err){
        console.log(err)
        res.send(err)

    }
    

}
export default setAccuracyThreshold