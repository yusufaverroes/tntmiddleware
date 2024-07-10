function dateToYYMMDD (originalDate){
        console.log(originalDate)
        var year = originalDate.getFullYear().toString().slice(2); // Get last two digits of the year
        var month = (originalDate.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based, so add 1
        var day = originalDate.getDate().toString().padStart(2, '0');

        // Form the YYDDMM formatted string
        var formattedDateString = year + day + month;
        return formattedDateString
}
function formatDate(date) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);

    return `${day} ${month} ${year}`;
}
// function removeSpacesAndNewlines(inputString) { //Incase needed
//     return inputString.replace(/\s+/g, '');
// }
function formatCurrencyIDR(amount, locale = 'id-ID') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'IDR'
    }).format(amount);
}
import Queue from '../utils/queue.js';
import printerTemplate from '../utils/printerTemplates.js';
import {postDataToAPI, putDataToAPI} from '../API/APICall/apiCall.js';
import { masterConfig } from '../index.js';
export default class printProcess {
    constructor(printer, db) {
        this.printer = printer;
        this.fileNames = [];
        this.db=db
        // console.log(db)
        this.work_order_id=null
        this.assignment_id=null
        this.printPCtarget=0
        this.lowest_id=null
        this.details=null
        this.fileNamesIdx=0
        this.sampling = false
        this.templateName=masterConfig.getConfig('printerProcess').TEMPLATE_NAME;
        this.waitPrint=false
        this.full_code_queue = new Queue()

    }
    async getCodeDetails(db) {
        try {
            const work_order = await db.collection('work_order').findOne({ external_id: this.work_order_id });
            if (!work_order) {
                throw new Error(`Work order ${this.work_order_id} not found`);
            }
    
            const product = await db.collection('product').findOne({ external_id: work_order.product_id });
            if (!product) {
                throw new Error(`Product ID ${this.product_id} not found `);
            }
    
            return {
                NIE: product.nie,
                BN: work_order.batch_no,
                MD: formatDate(work_order.manufacture_date), 
                ED: formatDate(work_order.expiry_date),
                HET: formatCurrencyIDR(product.het)
            };
        } catch (err) {
            console.error('Error getting code details:', err);
            
            return err;
        }
    }
    
    async getDataBySmallestId(db) {
        const result = await db.collection('serialization').aggregate(
            [
                {
                  '$sort': {
                    '_id': 1
                  }
                }, {
                  '$match': {
                    'status':'SENT_TO_PRINTER', // this.sampling?"SAMPLE_SENT_TO_PRINTER":
                    'work_order_id': this.work_order_id, 
                    'assignment_id': this.assignment_id
                  }
                }, {
                  '$limit': 1
                }
              ]).toArray();
            if (result.length==1){
                return {id:result[0]._id,full_code:result[0].full_code,SN:result[0].code}
            } else {
                return false //no code found
            }
    }
  
    async getSmallestId(db) {
        const result = await db.collection('serialization').findOne(
            {
                status: "PRINTING", //this.sampling?"SAMPLING":
                work_order_id:this.work_order_id,
                assignment_id:this.assignment_id
            },
            {
                sort: { _id: 1 },
                projection: { _id: 1 }
            }
        );
       
        if (result) {
            console.log(result)
            return result._id;
        } else {
            console.log(`[Printer Process] No (or no more) document found matching the criteria of the working order id :${this.work_order_id} and assignment id :${this.assignment_id} `);
            return null;
        }
    }
 
   
     convertToHex(str) {
        // Get the length of the string in hexadecimal
        const lengthHex = str.length.toString(16).padStart(2, '0');
    
        // Convert the string to hexadecimal
        const hexString = Array.from(str, c => c.charCodeAt(0).toString(16)).join('');
    
        // Concatenate the length and the hexadecimal string
        return lengthHex + hexString;
    }
    async printSetupChecks() {
        try {
            this.details = null
            this.details = await this.getCodeDetails(this.db)
            if (this.details===null){
                throw new Error(`no details with assignment Id = ${this.assignment_id}, work order Id =${this.work_order_id} found`)
            }

            let serialization = await this.getDataBySmallestId(this.db)
            if(serialization == false) {
                throw new Error(`No printing data can be found in serialization table  with assignment Id = ${this.assignment_id}, work order Id =${this.work_order_id}`);
            }
            let P_status ="no errors"

            await this.printer.clearBuffers() // clear buffer before start printing
            await new Promise(resolve => setTimeout(resolve, 1000));

            const msg =printerTemplate[this.templateName](this.details,"QR003") 
            console.log("template name : ", this.templateName)
            
            await this.printer.send(msg)
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.printer.startPrint()// start print
            await new Promise(resolve => setTimeout(resolve, 1000));

            


            const ress = await this.printer.send("1E055152303033")
            console.log("response from sending 1E", ress)
            await new Promise(resolve => setTimeout(resolve, 1000));

            const ress1 = await this.printer.send("01") 
            console.log("response from sending 01", ress1)
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("[Printing Process] filling up the first 10 buffers...")
            while (serialization && (P_status === "no errors" || P_status=== "still full")){ // filling up the buffer first
                
                P_status = await this.printer.sendRemoteFieldData([`SN ${serialization.SN}`, serialization.full_code]) // goes to printer buffer
                await this.db.collection('serialization')
        
                .updateOne( { _id: serialization.id}, 
                            { $set: { status : this.sampling?"SAMPLING":"PRINTING", update_at: Date.now()} } // update the status of the printed code upon pusing to buffer 
                            )
                this.full_code_queue.enqueue(serialization.full_code)
                serialization = await this.getDataBySmallestId(this.db)
                if (P_status === "now full"){

                    break;
                }
            }
            console.log("BUF NUM : ",await this.printer.getBufNum())
            this.printer.isOccupied = true;
            return "success"
        }catch(err){
            console.log(err)
            return err
        }
    }

    async print(){ // TODO: stoping logic after completing job (Done)
        let delayTime=2500; // initial delay time
        let fistPrintedFlag=false; //flag for telling that a first object has been printed
        let filledBufNum=0;
        let P_status="no errors"
        let waitingForCompletion=false;
        let oldvalue=null; // rey
        let rey_flag=false; //rey
        let flag_escape=0;
        console.log("[Printer Process] waiting object to be printed")
        while (this.printer.isOccupied){
            
            while(true){ // filling up the buffer
                let serialization = await this.getDataBySmallestId(this.db);
                // rey start here (check buffer before sending FOR YUSUF LATER)
                if (oldvalue != null && oldvalue.id == serialization.id)
                    {
                        console.log("rey flag entered QR has not changed");
                        console.log(oldvalue.id,serialization.id,P_status);
                        rey_flag=true;
                        flag_escape++;
                        if (flag_escape > 3) // exit infinite while loop
                            {
                                await this.db.collection('serialization')
                                .updateOne( { _id: serialization.id}, 
                                { $set: { status : "PRINTING"} } // update the status of the printed code upon pusing to buffer 
                                )
                                this.full_code_queue.enqueue(serialization.full_code)
                                const printed = this.full_code_queue.dequeue();
                                await putDataToAPI(`v1/work-order/${this.work_order_id}/assignment/${this.assignment_id}/serialization/printed`,{ 
                                full_code:printed,
                                })
                                flag_escape=0;
                            }
                    }
                    else
                    {
                        console.log("rey flag false entered QR has changed")
                        oldvalue=serialization;
                        rey_flag=false;
                        flag_escape=0;
                    }
                // rey end here REYNOLD
                if (!serialization){ // no more data on database
                    waitingForCompletion=true;
                    console.log("[Printing Process] no more data on database is found, entering completion phase")
                    break;
                }
                try {
                    // rey code
                    if (P_status=== "still full")
                        {
                            P_status="full attempt to send";
                            flag_escape=0;
                        }
                    else if (P_status=== "full attempt to send")
                    {
                        P_status="failed to update to DB";                        
                    }
                    if (!rey_flag || P_status === "full attempt to send")
                        {
                            P_status = await this.printer.sendRemoteFieldData([`SN ${serialization.SN}`, serialization.full_code]) 
                        }
                        else
                        {
                            rey_flag=false;
                        }
                } catch (err) {
                    console.log("[Printer Process] - Failed sending buffer to printer, ", err);
                    await this.db.collection('serialization')
                     .updateOne( { _id: serialization.id}, 
                    { $set: { status : "ErrorOccured"} } // update the status of the printed code upon pusing to buffer 
                    )
                }       
                if (P_status === "no errors" || P_status ==="now full" || P_status==="full attempt to send" || P_status==="failed to updated to DB") {
                    await this.db.collection('serialization')
                     .updateOne( { _id: serialization.id}, 
                    { $set: { status : "PRINTING"} } // update the status of the printed code upon pusing to buffer 
                    )
                    this.full_code_queue.enqueue(serialization.full_code) // yusuf: this will be called twice if failed to upddate db 
                    const printed = this.full_code_queue.dequeue();
                    await putDataToAPI(`v1/work-order/${this.work_order_id}/assignment/${this.assignment_id}/serialization/printed`,{ 
                        full_code:printed,
                    }) 
                    filledBufNum++;
                    fistPrintedFlag=true
                } else if (P_status === "still full") {
                    break;
                }
            }
            if (fistPrintedFlag){ //apply dynamic delay time logic
                const delTtemp = delayTime;
                if (filledBufNum>0){delayTime = (delayTime-(filledBufNum-1)*100) }// targeting 9 items on buffer, if less than 9 substract by x*100 ms
                filledBufNum=0;
                if (delayTime<delTtemp){
                    console.log(`[Printing Process] delay time has reduced to ${delayTime}`);
                }
            }
            if (waitingForCompletion){
                let bufferCount = await this.printer.getBufNum()
                while(!this.full_code_queue.isEmpty() && this.printer.isOccupied){ // this while loop is useful if no printing happening while waiting for completion
                    while(this.full_code_queue.size()>bufferCount){ // keep dequeuing until it matches the number of buffer left
                        console.log(`[Printing Process] buffer count :${bufferCount} vs que size: ${this.full_code_queue.size()}`)
                        const printed = this.full_code_queue.dequeue();
                        await putDataToAPI(`v1/work-order/${this.work_order_id}/assignment/${this.assignment_id}/serialization/printed`,{ 
                            full_code:printed,
                        })
                        
                    }
                    bufferCount = await this.printer.getBufNum() // update the bufferCount number
                    await new Promise(resolve => setTimeout(resolve, delayTime))
                }
                
                
                await this.printer.clearBuffers()
                this.printer.isOccupied=false
                console.log(`[Printing Process] printing process with assignment Id = ${this.assignment_id}, work order Id =${this.work_order_id} is completed! $`)
                await postDataToAPI('v1/work-order/active-job/complete-print',{})
            }
            if (P_status==="still full" || P_status==="now full")
                {
                    delayTime=10000;
                }
                else if (rey_flag || P_status === "full attempt to send")
                    {
                        delayTime=5000;
                    }
                else if (P_status === "no errors") 
                {
                    delayTime=2500;
                }
                else {
                    delayTime=5000;
                }
            await new Promise(resolve => setTimeout(resolve, delayTime)) // The delay


        }
       
    }
    

}


 