// get process IDs (TODO later)
// start process with printer id + csv +
// end process
// get process details such as printing progress


import  {printingProcess, printer} from '../../../../index.js';



const setPrinterFormat = (req, res) => {
    let body = req.body
    if (body.x ) {
        printer.createModule.x=body.x
    }
    if (body.y ) {
        printer.createModule.y=body.y
    }
    if (body.rotation ) {
        printer.createModule.rotation=body.rotation
    }
    if (body.fontSize ) {
        printer.createModule.fontSize=body.fontSize
    }
    if (body.space ) {
        printer.createModule.space=body.space
    }
    if (body.fontName ) {
        printer.createModule.fontName=body.fontName
    }
    res.status(200).send({
        x: printer.createModule.x,
        y: printer.createModule.y,
        rotation: printer.createModule.rotation,
        fontSize: printer.createModule.fontSize,
        space: printer.createModule.space,
        fontName: printer.createModule.fontName
    })

}
const stopPrinting = (req, res) => {
    printer.stop()
    res.status(200)
}

const startPrinting = async (req, res) => {
    
    printingProcess.work_order_id = req.body.work_order_id
    printingProcess.assignment_id = req.body.assignment_id
    res.status(200).send({message:"is printing"})
    await printingProcess.print()// put the res here
}

const printerDetails = (req, res) =>{
    const workstationId = req.params.workstationId
    if (printer.workstationId===workstationId){
        res.status(200).send({
            ipAddress:printer.ip,
            port:printer.port,
            isOccupied:printer.isOccupied,
            inkLevel:90, //TODO: get the real one
            templateId:0
        })
    }else{
        res.status(404).send({message:"no printer assigned on this workstation"})
    }
}
// const getInkStattus = (req, res) => {
//    let response = printer.send(PRINT_MASSGAE.InkStaus)
//     res.send(response)
// }
export default {startPrinting, printerDetails}