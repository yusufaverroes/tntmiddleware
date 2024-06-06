import weighingScaleDao from "../../../../DAO/weighingScaleDao.js";

const getWeight = async (req,res) =>{
    try{
        const weight = await weighingScaleDao.readWeight();
        res.status(200).send({weight:weight})
    }catch(err){
        console.log(err)
        res.status(500).send({error:err})
    }
}

export default {getWeight}