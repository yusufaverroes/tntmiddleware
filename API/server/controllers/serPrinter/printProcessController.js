// get process IDs (TODO later)
// start process with printer id + csv +
// end process
// get process details such as printing progress


import  {printingProcess, printer} from '../../../../index.js';
import printerTemplate from '../../../../utils/printerTemplates.js';



const stopPrinting = async (req, res) => {
    printingProcess.isOccupied=false;
    await printer.send(12)
    await printer.send(21)
    console.log("printer is successfully stopped by the BE")
    res.status(200).send({message:"printer is successfully stopped"})
}

const startPrinting = async (req, res) => {
    let missingBody=""
    
    if(req.body.work_order_id){
        printingProcess.work_order_id = req.body.work_order_id
    }else{missingBody="work_order_id"}
    if(req.body.assignment_id){
        printingProcess.assignment_id = req.body.assignment_id
    }else{missingBody=missingBody+" and assignment_id"}

    if (missingBody!=""){
        return res.status(400).send({message: `Missing mandatory payload in request body. (${missingBody})`})
    }

    if((req.body.templateName) && req.body.templateName  in printerTemplate){
        return res.status(404).send({message: `The template Name=${req.body.templateName} does not exist`})
    }
    if (printer.isOccupied===true){
        return res.status(409).send({message: `This printer is occupied for workOrderId=${printingProcess.work_order_id} and assignmentId =${printingProcess.assignment_id}`})
    }

    if (printer.running===false){
        return res.status(500).send({message: "Cannot connect to the printer" })
    }
    try {
        if (await printingProcess.printSetupChecks()==="success"){
            res.status(200).send({message:`Printing Process with assignment Id = ${printingProcess.assignment_id}, work order Id =${printingProcess.work_order_id}, and template Id = ${printingProcess.templateId} started`})
            printingProcess.print().then(() =>{console.log("now printer is running")})
        }else{
            return res.status(500).send({message:"unknown issue, printer is not started"})
        }
    }catch(err){
        console.log(err)
        res.status(500).send({error:err})
    }
    
}



export default {startPrinting, stopPrinting}