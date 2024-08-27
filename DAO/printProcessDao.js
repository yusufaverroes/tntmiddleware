
import fs from 'fs';
const pipePath = '/tmp/middleware-failsafe-pipe'

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
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}
import Queue from '../utils/queue.js';
import printerTemplate from '../utils/printerTemplates.js';
import {postDataToAPI, putDataToAPI} from '../API/APICall/apiCall.js';
import { masterConfig } from '../index.js';
import { clearInterval } from 'timers';
import { clear, time } from 'console';
import { needToReInit } from '../utils/globalEventEmitter.js';
export default class printProcess {
    constructor(printer, mongoDB, sensor) {
        this.printer = printer;
        this.fileNames = [];
        this.mongoDB=mongoDB
        this.db=this.mongoDB.db
        this.sensor= sensor;
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
        this.sensorTriggered=false;
        this.expectedBufferCount=0;

    }
    async getCodeDetails(db) {
        try {
            if (this.mongoDB.healthCheckInterval){
                clearInterval(this.mongoDB.healthCheckInterval)
                this.mongoDB.normalOperationFlag=true;
            }
            let timeout= setTimeout(()=>{
                throw new Error("time out occurred")
            },1000)
            const work_order = await db.collection('work_order').findOne({ external_id: this.work_order_id });
            clearTimeout(timeout)
            if (!work_order) {
                throw new Error(`Work order ${this.work_order_id} not found`);
            }
    
            const product = await db.collection('product').findOne({ external_id: work_order.product_id });
            if (!product) {
                throw new Error(`Product ID ${this.product_id} not found `);
            }

            console.log(JSON.stringify(work_order))
            this.mongoDB.setHealthCheck();
            return {
                NIE: product.nie,
                BN: work_order.batch_no,
                MD: formatDate(work_order.manufacture_date), 
                ED: formatDate(work_order.expiry_date),
                HET: product.het.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
                UNIT:work_order.unit_per_box
            };
        } catch (err) {
            console.error('Error getting code details:', err);
            
            return err;
        }
    }
    
    async getDataBySmallestId(db) {
        try {
            if (this.mongoDB.healthCheckInterval){
                clearInterval(this.mongoDB.healthCheckInterval)
                this.mongoDB.normalOperationFlag=true;
            }
            const timout = setTimeout(()=>{ 
                
                throw new Error("timed out on retrieving data from mongoDB")
                
            }, 1000)   
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
                  clearTimeout(timout);
                  this.mongoDB.setHealthCheck();
   
                if (result.length==1){
                    return {id:result[0]._id,full_code:result[0].full_code,SN:result[0].code}
                } else {
                    return false //no code found
                }
               

        } catch (error) {
            console.log("[Print Process] error on getting data by smallest id : ", error)
            this.dbManualHealthCheck()

        }
        
    }
    async dbManualHealthCheck() {
        try {
            let timeout = setTimeout(()=>{
                console.log("[Print Process] timed out occured while trying to do health check manually")
                needToReInit.emit("pleaseReInit","MongoDB")
                this.printer.isOccupied=false;
            }, 1000)
            const serverStatus =  await this.client.db('admin').command({ serverStatus: 1 }); // only for health check, checking if the collection is exist
            clearTimeout(timeout);
            
        } catch (error) {
            console.log("[Print Process] Error out occured while trying to do health check manually ",error)
        }
        
    }
    // async getSmallestId(db) {
    //     const result = await db.collection('serialization').findOne(
    //         {
    //             status: "PRINTING", //this.sampling?"SAMPLING":
    //             work_order_id:this.work_order_id,
    //             assignment_id:this.assignment_id
    //         },
    //         {
    //             sort: { _id: 1 },
    //             projection: { _id: 1 }
    //         }
    //     );
       
    //     if (result) {
    //         console.log(result)
    //         return result._id;
    //     } else {
    //         console.log(`[Printer Process] No (or no more) document found matching the criteria of the working order id :${this.work_order_id} and assignment id :${this.assignment_id} `);
    //         return null;
    //     }
    // }
 
   
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
            this.expectedBufferCount=0;
            this.full_code_queue.clear();
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
                this.expectedBufferCount++;
                let updateTimeOut = setTimeout(()=>{
                    this.dbManualHealthCheck()
                },1000)
                
                await this.db.collection('serialization')
        
                .updateOne( { _id: serialization.id}, 
                            { $set: { status : this.sampling?"SAMPLING":"PRINTING", update_at: Date.now()} } // update the status of the printed code upon pusing to buffer 
                            )
                this.full_code_queue.enqueue(serialization.full_code)
                clearTimeout(updateTimeOut)
                serialization = await this.getDataBySmallestId(this.db)
                if (P_status === "now full"){

                    break;
                }
            }
            console.log("BUF NUM : ",await this.printer.getBufNum())
            this.printer.isOccupied = true;
            this.sensor.setShortPressCallback(()=>{
                this.sensorTriggered=true;
                this.expectedBufferCount=this.expectedBufferCount-1
            })
            return "success"
        }catch(err){
            console.log(err)
            return err
        }
    }
    abort(){
        fs.open(pipePath, 'w', (err, fd) => {
            if (err) {
              console.error('Failed to open named pipe:', err);
              return;
            }
          
            fs.write(fd, 'off', (err) => {
              if (err) {
                console.error('Failed to write to named pipe:', err);
              } else {
                console.log('Message sent: off');
              }
          
              fs.close(fd, (err) => {
                if (err) {
                  console.error('Failed to close named pipe:', err);
                }
              });
            });
          });
    }
    async print2(){
        while (this.printer.isOccupied){
            if(this.sensorTriggered){
                this.sensorTriggered=false;
                
            
                let serialization=null
                try {
                    serialization = await this.getDataBySmallestId(this.db);

                } catch (error) {
                    try {
                        serialization = await this.getDataBySmallestId(this.db);
                        
                    } catch (error) {
                        try {
                            serialization = await this.getDataBySmallestId(this.db);
                        } catch (error) {
                            console.log("error on getting small data from db, aborting...")
                            this.abort();
                            return;
                        }
                    }
                }
                
                let P_status = null;
                try {
                    P_status = await this.printer.sendRemoteFieldData([`SN ${serialization.SN}`, serialization.full_code])
                } catch (error) {
                    try {
                        
                    } catch (error) {
                        
                    }
                }
                let updateTimeOut = setTimeout(()=>{
                    this.dbManualHealthCheck()
                },1000)
                
                await this.db.collection('serialization')
                .updateOne( { _id: serialization.id}, 
                { $set: { status : "PRINTING"} } // update the status of the printed code upon pusing to buffer 
                )
                clearTimeout(updateTimeOut)
                this.full_code_queue.enqueue(serialization.full_code)
                const printed = this.full_code_queue.dequeue();
                await putDataToAPI(`v1/work-order/${this.work_order_id}/assignment/${this.assignment_id}/serialization/printed`,{ 
                full_code:printed,
                })
            }
        }
    }

    async print(){ 
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
                                let updateTimeOut = setTimeout(()=>{
                                    this.dbManualHealthCheck()
                                },1000)
                                
                                await this.db.collection('serialization')
                                .updateOne( { _id: serialization.id}, 
                                { $set: { status : "PRINTING"} } // update the status of the printed code upon pusing to buffer 
                                )
                                clearTimeout(updateTimeOut)
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
                    let updateTimeOut = setTimeout(()=>{
                        this.dbManualHealthCheck()
                    },1000)
                    
                    await this.db.collection('serialization')
                     .updateOne( { _id: serialization.id}, 
                    { $set: { status : "ERROR_OCCURED"} } // update the status of the printed code upon pusing to buffer 
                    )
                    clearTimeout(updateTimeOut)
                    this.full_code_queue.enqueue(serialization.full_code) 
                }       
                if (P_status === "no errors" || P_status ==="now full" || P_status==="full attempt to send" || P_status==="failed to updated to DB") {
                    let updateTimeOut = setTimeout(()=>{
                        this.dbManualHealthCheck()
                    },1000)
                    await this.db.collection('serialization')
                     .updateOne( { _id: serialization.id}, 
                    { $set: { status : "PRINTING"} } // update the status of the printed code upon pusing to buffer 
                    )
                    clearTimeout(updateTimeOut)
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
                    // await new Promise(resolve => setTimeout(resolve, delayTime))
                    await new Promise(resolve => setTimeout(resolve, 600))

                }
                
                fs.open(pipePath, 'w', (err, fd) => {
                    if (err) {
                      console.error('Failed to open named pipe:', err);
                      return;
                    }
                  
                    fs.write(fd, 'off', (err) => {
                      if (err) {
                        console.error('Failed to write to named pipe:', err);
                      } else {
                        console.log('Message sent: off');
                      }
                  
                      fs.close(fd, (err) => {
                        if (err) {
                          console.error('Failed to close named pipe:', err);
                        }
                      });
                    });
                  });
                await this.printer.clearBuffers()
                this.printer.isOccupied=false
                console.log(`[Printing Process] printing process with assignment Id = ${this.assignment_id}, work order Id =${this.work_order_id} is completed! $`)
                
                await this.printer.stopPrint();
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


 