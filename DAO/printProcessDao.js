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
        try {
            console.log(this.work_order_id)
            const work_order = await db.collection('work_order').findOne({ _id: this.work_order_id });
            if (!work_order) {
                throw new Error('Work order not found');
            }
    
            const product = await db.collection('product').findOne({ _id: work_order.product_id });
            if (!product) {
                throw new Error('Product not found');
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
            
            return null;
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
    async checkNGetCode(db) {
        const result = await db.collection('serialization').aggregate( 
            [
                {
                  '$sort': {
                    '_id': 1
                  }
                }, {
                  '$match': {
                    'status': this.sampling?"SAMPLING":'PRINTING', 
                    'work_order_id': this.work_order_id, 
                    'assignment_id': this.assignment_id
                  }
                }, {
                  '$limit': 1
                }
              ]).toArray();
            if (result.length==1){
                return {full_code:result[0].full_code,SN:result[0].code}
            }else {
                return false
            }
    }
    callback(){
        
        this.db.collection('serialization')
        .updateOne( { _id: (this.printer.printCount+this.lowest_id - 1)}, 
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
    async printPrepairChecks() {
        
    }

    async print() {
        this.db = await connect() // TODO: use mongoDB.js
        this.details = await this.getCodeDetails(this.db)
       // console.log(this.details)
        this.printer.isOccupied = true;
        this.printer.printCallback = ()=> {
            this.callback()
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.printer.send("11") // start print
        //await this.printer.send("1E055152303031")
        this.fileNames = ["QR001", "QR002", "QR003", "QR004", "QR005", "QR006", "QR007", "QR008", "QR009", "QR010"]; //TODO: get from printer
        const div = Math.floor(this.fileNames.length / 2);
        this.lowest_id = await this.getSmallestId(this.db)
        
        for (let idx = 0; idx < this.fileNames.length; idx++) { // first step: filling all msg files
            let QRcode = await this.checkNGetCode(this.db, this.lowest_id+idx+this.printer.printCount)
            if (QRcode) {
                const QRtext = this.printer.createModuleText(QRcode.full_code, false);
                const QR = this.printer.createModuleQR(QRtext);
                const BPOM = this.printer.createModuleText("BPOM RI", true, 25, 4, 0, 24, 0, "Arial")
                const BN = this.printer.createModuleText(`BN  ${this.details.BN}`,true, 164, 0, 0, 20, 0, "Arial"); //const BNS = this.printer.createModuleText(this.details.BN,true, 217, 0, 0, 20, 0, "Arial")
                const MD = this.printer.createModuleText(`MD  ${this.details.MD}`,true, 164, 33, 0, 20, 0, "Arial"); //const MDS = this.printer.createModuleText(this.details.MD,true, 217, 33, 0, 20, 0, "Arial")
                const ED = this.printer.createModuleText(`ED  ${this.details.ED}`,true, 164, 66, 0, 20, 0, "Arial"); //const EDS = this.printer.createModuleText(this.details.ED,true, 217, 66, 0, 20, 0, "Arial")
                const HET = this.printer.createModuleText(`HET ${this.details.HET}`,true, 164,99, 0, 20, 0, "Arial"); //const HETS = this.printer.createModuleText(this.details.HET,true, 217, 99, 0, 20, 0, "Arial")
                const SN = this.printer.createModuleText(`SN  ${QRcode.SN}`,true, 164, 129, 0, 20, 0, "Arial"); //const SNS = this.printer.createModuleText(QRcode.SN,true, 217, 129, 0, 20, 0, "Arial")
                const modules= [SN,QR,BPOM,BN,MD,ED,HET]//,SNS]
                //const modules= [QR,SN,SNS]
                const msg = this.printer.createMsg(modules, this.fileNames[idx]);
                //await new Promise(resolve => setTimeout(resolve, 1000));
                //const msg = "1C0152805515230303101040011002112130a000001013a283930294b4d5a5741593837414141414141414128313029545042303838353128313729323633313031283231294c505933503650425a5850380100190004000005001805417269616c0742504f4d2052490100a40000000005001405417269616c02424e0100d90000000005001405417269616c0854504230383835310100a40021000005001405417269616c024d440100d90021000005001405417269616c093034204a414e2032320100a40042000005001405417269616c0245440100d90042000005001405417269616c093331204a414e2032360100a40063000005001405417269616c034845540100d90063000005001405417269616c0b5270c2a0342e3030302c30300100a40081000005001405417269616c02534e0100d90081000005001405417269616c0c4c505933503650425a585038"
                console.log(`sending QR${this.lowest_id+idx + this.printer.printCount} to msg buffer ${this.fileNames[idx]}`);
                await this.printer.send(msg); // TODO : handle failed sending
                this.printPCtarget=this.printPCtarget+1
                //await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log(`idx = ${idx}, name len = ${this.fileNames.length}`)
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
                        const QRtext = this.printer.createModuleText(QRcode.full_code, false);
                        const QR = this.printer.createModuleQR(QRtext);
                        const BPOM = this.printer.createModuleText("BPOM RI", true, 25, 4, 0, 24, 0, "Arial")
                        const BN = this.printer.createModuleText("BN",true, 164, 0, 0, 20, 0, "Arial"); const BNS = this.printer.createModuleText(this.details.BN,true, 217, 0, 0, 20, 0, "Arial")
                        const MD = this.printer.createModuleText("MD",true, 164, 33, 0, 20, 0, "Arial"); const MDS = this.printer.createModuleText(this.details.MD,true, 217, 33, 0, 20, 0, "Arial")
                        const ED = this.printer.createModuleText("ED",true, 164, 66, 0, 20, 0, "Arial"); const EDS = this.printer.createModuleText(this.details.ED,true, 217, 66, 0, 20, 0, "Arial")
                        const HET = this.printer.createModuleText("HET",true, 164,99, 0, 20, 0, "Arial"); const HETS = this.printer.createModuleText(this.details.HET,true, 217, 99, 0, 20, 0, "Arial")
                        const SN = this.printer.createModuleText("SN",true, 164, 129, 0, 20, 0, "Arial"); const SNS = this.printer.createModuleText(QRcode.SN,true, 217, 129, 0, 20, 0, "Arial")
                        const modules= [QR,BPOM,BN,BNS,MD,MDS,ED,EDS,HET,HETS,SN,SNS]
                        const msg = this.printer.createMsg(modules, this.fileNames[idx]);
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
                    const QRtext = this.printer.createModuleText(QRcode.full_code, false);
                    const QR = this.printer.createModuleQR(QRtext);
                    const BPOM = this.printer.createModuleText("BPOM RI", true, 25, 4, 0, 24, 0, "Arial")
                    const BN = this.printer.createModuleText("BN",true, 164, 0, 0, 20, 0, "Arial"); const BNS = this.printer.createModuleText(this.details.BN,true, 217, 0, 0, 20, 0, "Arial")
                    const MD = this.printer.createModuleText("MD",true, 164, 33, 0, 20, 0, "Arial"); const MDS = this.printer.createModuleText(this.details.MD,true, 217, 33, 0, 20, 0, "Arial")
                    const ED = this.printer.createModuleText("ED",true, 164, 66, 0, 20, 0, "Arial"); const EDS = this.printer.createModuleText(this.details.ED,true, 217, 66, 0, 20, 0, "Arial")
                    const HET = this.printer.createModuleText("HET",true, 164,99, 0, 20, 0, "Arial"); const HETS = this.printer.createModuleText(this.details.HET,true, 217, 99, 0, 20, 0, "Arial")
                    const SN = this.printer.createModuleText("SN",true, 164, 129, 0, 20, 0, "Arial"); const SNS = this.printer.createModuleText(QRcode.SN,true, 217, 129, 0, 20, 0, "Arial")
                    const modules= [QR,BPOM,BN,BNS,MD,MDS,ED,EDS,HET,HETS,SN,SNS]
                    const msg = this.printer.createMsg(modules, this.fileNames[idx]);
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


 