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
function removeSpacesAndNewlines(inputString) {
    return inputString.replace(/\s+/g, '');
}
function formatCurrencyIDR(amount, locale = 'id-ID') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'IDR'
    }).format(amount);
}
import printerTemplate from '../utils/printerTemplates.js';
import { connect, close } from './db.js';
export default class printProcess {
    constructor(printer) {
        this.printer = printer;
        this.fileNames = [];
        this.db=null
        this.work_order_id=9
        this.assignment_id=6
        this.printPCtarget=0
        this.lowest_id=null
        this.details=null
        this.fileNamesIdx=0
        this.sampling = false
        this.workstationId="1"
        this.templateId=0
        this.waitPrint=false

    }
    async getCodeDetails(db) {
        try {
            console.log(this.work_order_id)
            const work_order = await db.collection('work_order').findOne({ _id: this.work_order_id });
            if (!work_order) {
                throw new Error(`Work order ${this.work_order_id} not found`);
            }
    
            const product = await db.collection('product').findOne({ _id: work_order.product_id });
            if (!product) {
                throw new Error('Product not found'); // todo detail
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
    
        
    async getSmallestId(db) {
        const result = await db.collection('serialization').findOne(
            {
                status: this.sampling?"SAMPLING":"PRINTING",
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
            console.log("No document found matching the criteria");
            return null;
        }
    }
    async checkNGetCode(db, lastId) {
        const result = await db.collection('serialization').aggregate( 
            [
                {
                  '$sort': {
                    '_id': 1
                  }
                }, {
                  '$match': {
                    "_id": {
                        "$gt": lastId
                    },
                    'status': this.sampling?"SAMPLING":'PRINTING', 
                    'work_order_id': this.work_order_id, 
                    'assignment_id': this.assignment_id
                  }
                }, {
                  '$limit': 1
                }
              ]).toArray();
            if (result.length==1){
                return {id:result[0]._id,full_code:result[0].full_code,SN:result[0].code}
            }else {
                return false //no code found
            }
    }
    async checkNGetCode2(db) {
        const result = await db.collection('serialization').aggregate( 
            [
                {
                  '$sort': {
                    '_id': 1
                  }
                }, {
                  '$match': {
                    'status': this.sampling?"SAMPLE_SENT_TO_PRINTER":'SENT_TO_PRINTER', 
                    'work_order_id': this.work_order_id, 
                    'assignment_id': this.assignment_id
                  }
                }, {
                  '$limit': 1
                }
              ]).toArray();
            if (result.length==1){
                console.log(result[0]._id)
                return {id:result[0]._id,full_code:result[0].full_code,SN:result[0].code}
            }else {
                return false //no code found
            }
    }
    async callback(){
        this.waitPrint=true;
        const id = await this.checkNGetCode2(this.db)
        await this.db.collection('serialization')
        
        .updateOne( { _id: id.id}, //TODO change to aggregate to find the earliest printing
                    { $set: { status : this.sampling?"SAMPLE_PRINTED":"PRINTED"} } // update the status of the printed code upon printing 
                    )
        if(this.fileNamesIdx===this.fileNames.length-1){
            this.fileNamesIdx=0
        }else{
            this.fileNamesIdx++
        }
        // this.printer.send(`1E${this.convertToHex(this.fileNames[this.fileNamesIdx])}`)
    }
     convertToHex(str) {
        // Get the length of the string in hexadecimal
        const lengthHex = str.length.toString(16).padStart(2, '0');
    
        // Convert the string to hexadecimal
        const hexString = Array.from(str, c => c.charCodeAt(0).toString(16)).join('');
    
        // Concatenate the length and the hexadecimal string
        return lengthHex + hexString;
    }
    async printSetupChecks (){
        this.db = await connect() // TODO: use mongoDB.js
        this.details = null
        this.details = await this.getCodeDetails(this.db)
        this.printer.isOccupied = true;
        this.printer.printCallback = async ()=> {
            await this.callback()
        }
        await this.printer.send("11") // start print
        this.fileNames = ["QR001", "QR002", "QR003", "QR004", "QR005", "QR006", "QR007", "QR008", "QR009", "QR010"]; //TODO: get from printer,move to printer class
        const div = Math.floor(this.fileNames.length / 2);
        this.lowest_id = await this.getSmallestId(this.db)
        let lastId = 0
        for (let idx = 0; idx < this.fileNames.length; idx++) { // first step: filling all msg files
            let QRcode = await this.checkNGetCode(this.db, lastId) //TODO : must ensure the code is never goes to printer
            lastId = QRcode.id
            
            if (QRcode) {
                const msg =printerTemplate[this.templateId](QRcode,this.details,this.fileNames[idx])
                console.log(`sending QR${this.lowest_id+idx + this.printer.printCount} to msg buffer ${this.fileNames[idx]}`);
                await this.printer.send(msg);// todo error
                //await this.db.collection('serialization').updateOne({_id:QRcode.id},{$set:{status:"SENT_TO_PRINTER"}})
                this.printPCtarget=this.printPCtarget+1
            } else {
                console.log(`id = ${QRcode.id}, name len = ${this.fileNames.length}`)
                break;
            }
        }
        console.log("you can start print, the print count is", this.printer.printCount);        
        res.status(200).send({message:`Printing Process with assignment Id = ${this.assignment_id}, work order Id =${this.work_order_id}, and template Id = ${this.templateId} started`})
    }


    async print(res) {
        try{

            
            
            
            let QRloop = await this.checkNGetCode(this.db)
            console.log(this.lowest_id+this.printer.printCount)
            while (QRloop) {
                console.log("waiting first half to be printed");
                let tempPC = this.printer.printCount;
                
                while (this.printer.printCount <= tempPC + div && this.printer.printCount<this.printPCtarget) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
    
                console.log("sending first half, print count is:", this.printer.printCount); //Second Step
                tempPC = this.printer.printCount;
                let sendingCompleted = false;
                if (!sendingCompleted) {
                    let lastId =0
                    for (let idx = 0; idx < div; idx++) {
                        let QRcode = await this.checkNGetCode(this.db, lastId)
                        lastId = QRcode.id
                        if (QRcode) {
                            const msg = printerTemplate[this.templateId](QRcode,this.details,this.fileNames[idx])
                            console.log(`sending QR${QRcode.id} to msg buffer ${this.fileNames[idx]}`);
                            await this.printer.send(msg); 
                            await this.db.collection('serialization').updateOne({_id:QRcode.id},{$set:{status:"SENT_TO_PRINTER"}})
                            this.printPCtarget=this.printPCtarget+1
                        } else {
                            break;
                        }
                    }
                    sendingCompleted = true;
                    console.log("sending completed");
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                console.log("waiting second half to be printed");
                tempPC = this.printer.printCount;
                while (this.printer.printCount < tempPC + this.fileNames.slice(div).length && this.printer.printCount<this.printPCtarget) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
    
                console.log("sending second half, print count is:", this.printer.printCount); // Third Step
                tempPC = this.printer.printCount;
                let lastId=0
                for (let idx = 0; idx < this.fileNames.slice(div).length; idx++) {
                    let QRcode = await this.checkNGetCode(this.db, lastId)
                    lastId = QRcode.id
                    if (QRcode) {
                        const msg = printerTemplate[this.templateId](QRcode,this.details,this.fileNames[idx])
                        console.log(`sending QR${QRcode.id} to msg buffer ${this.fileNames[idx]}`);
                        await this.printer.send(msg);
                        await this.db.collection('serialization').updateOne({_id:QRcode.id},{$set:{status:"SENT_TO_PRINTER"}}) 
                        this.printPCtarget=this.printPCtarget+1
                    } else {
                        break;
                    }
                }
                QRloop = await this.checkNGetCode(this.db,this.lowest_id+this.printer.printCount+1)
            }
            console.log(`waiting printing to be finished ${this.printPCtarget} vs ${this.printer.printCount}`)
            while (this.printer.printCount<this.printPCtarget){
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await this.printer.send("12") // stop printing//TODO: make commands as readable objects instead of hex code
            this.printer.printCount = 0; 
            this.printer.isOccupied = false;
            console.log("ends");
        }catch (err){

        }

    }
}


 