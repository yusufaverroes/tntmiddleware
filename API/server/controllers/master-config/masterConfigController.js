import { printingProcess,printer, serialCamera, serQueue, rejector } from "../../../../index.js";
const serCamParams= ["ACCURACY_THRESHOLD"]
const pProcessParams =["TEMPLATE_ID"]
const rejectorParams = ["REJECTOR_DELAY"]
const setAccuracyThreshold = (req, res) =>{
    try{
        if (!serCamParams.includes(req.params.parameter_name)){
            return res.status(404).send({status:"FAILED",message: `Config = ${eq.params.parameter_name}`})
        }
        if (!serialCamera.running){
            return res.status(500).send({message: "Serialization camera not detected"})
        }
        serialCamera.accuracyThreshold=req.body.parameter_value
        res.status(200).send({message:`accuracy is changed to ${req.body.parameter_value} successfully`})
    }
    catch(err){
        console.log(err)
        res.send(err)

    }
    

}
const setRejectorDelay = (req, res) =>{
    try{
        if (!rejectorParams.includes(req.params.parameter_name)){
            return res.status(404).send({status:"FAILED",message: `Config = ${eq.params.parameter_name}`})
        }
        rejector.delay=req.body.parameter_value
        res.status(200).send({message:`accuracy is changed to ${req.body.parameter_value} successfully`})
    }
    catch(err){
        console.log(err)
        res.send(err)

    }
}
export default {setAccuracyThreshold, setRejectorDelay}