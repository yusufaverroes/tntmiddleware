function dateToYYMMDD (originalDate){
        var year = originalDate.getFullYear().toString().slice(2); // Get last two digits of the year
        var month = (originalDate.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based, so add 1
        var day = originalDate.getDate().toString().padStart(2, '0');

        // Form the YYDDMM formatted string
        var formattedDateString = year + day + month;
        return formattedDateString
}

import { connect, close } from './db.js';
export default class printProcess {
    constructor(printer) {
        this.printer = printer;
        this.processId = "1"
        this.fileNames = [];
        this.db=null
        this.work_order_id=9
        this.assignment_id=6
        this.printPCtarget=0
        this.lowest_id=null
        this.details=null
        this.fileNamesIdx=0
        this.sampling = false

    }
    async getCodeDetails(db) {
        try{
        const work_order = await db.collection('work_order').findOne({work_order_id:this.work_order_id})
        const product = await db.collection('product').findOne({product_id : work_order.product_id})

        return {
            NIE:product.nie,
            BN:work_order.batch_no,
            MD:dateToYYMMDD(work_order.expire_date), // TODO: change to manufacture_date when availabe
            ED:dateToYYMMDD(work_order.expire_date), 
            HET:product.het
        }
        
        }catch(err){
            console.log(err)
        }
    }
        
    async getSmallestId(db) {
        const result = await db.collection('serialization').findOne(
            {
                status: this.sampling?"printing":"sampling",
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
    async checkNGetCode(db,id ) {
        const result = await db.collection('serialization').findOne( 
            {
                _id:id,
                status: this.sampling?"printing":"sampling",
                work_order_id: this.work_order_id,
                assignment_id: this.assignment_id
                
            });
            if (result){
                return result.full_code
            }else {
                return false
            }
    }
    callback(){
        this.db.collection('serialization')
        .updateOne( { _id: (this.printer.printCount+this.lowest_id - 1)}, 
                    { $set: { status : this.sampling?"printed":"sampled"} } // update the status of the printed code upon printing 
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
    async printPrepairChecks() {
        
    }

    async print() {
        this.db = await connect() // TODO: use mongoDB.js
        this.details = this.getCodeDetails(this.db)
        this.printer.isOccupied = true;
        this.printer.printCallback = this.callback
        
        await this.printer.send("11") // start print
        //await this.printer.send("1E055152303031")
        this.fileNames = ["QR001", "QR002", "QR003", "QR004", "QR005", "QR006", "QR007", "QR008", "QR009", "QR010"]; //TODO: get from printer
        const div = Math.floor(this.fileNames.length / 2);
        this.lowest_id = await this.getSmallestId(this.db)
        
        for (let idx = 0; idx < this.fileNames.length; idx++) { // first step: filling all msg files
            let QRcode = await this.checkNGetCode(this.db, this.lowest_id+idx+this.printer.printCount)
            if (QRcode) {
                const text = this.printer.createModuleText(QRcode, false);
                const QR = this.printer.createModuleQR(text);
                const msg = this.printer.createMsg(QR, this.fileNames[idx]);
                await this.printer.send(msg); // TODO : handle failed sending
                console.log(`sending QR${this.lowest_id+idx + this.printer.printCount} to msg buffer ${this.fileNames[idx]}`);
                this.printPCtarget=this.printPCtarget+1
            } else {
                break;
            }
        }

        console.log("you can start print, the print count is", this.printer.printCount);


        let QRloop = await this.checkNGetCode(this.db,this.lowest_id+this.printer.printCount)
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
                for (let idx = 0; idx < div; idx++) {
                    let QRcode = await this.checkNGetCode(this.db,this.lowest_id+idx + tempPC - 1+div)
                    if (QRcode) {
                        const text = this.printer.createModuleText(QRcode, false);
                        const QR = this.printer.createModuleQR(text);
                        const msg = this.printer.createMsg(QR, this.fileNames[idx]);
                        await this.printer.send(msg);
                        console.log(`sending _id${this.lowest_id+idx + tempPC - 1+div} on msg ${this.fileNames[idx]}`);
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
            for (let idx = 0; idx < this.fileNames.slice(div).length; idx++) {
                let QRcode = await this.checkNGetCode(this.db,this.lowest_id+idx + tempPC - 1+this.fileNames.slice(div).length)
                if (QRcode) {
                    const text = this.printer.createModuleText(QRcode, false);
                    const QR = this.printer.createModuleQR(text);
                    const msg = this.printer.createMsg(QR, this.fileNames[div + idx]);
                    await this.printer.send(msg);
                    console.log(`sending _id${this.lowest_id+idx + tempPC - 1+this.fileNames.slice(div).length} on msg ${this.fileNames[div + idx]}`);
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
    }
}


 