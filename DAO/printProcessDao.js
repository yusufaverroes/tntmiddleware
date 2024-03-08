// controller to read the csv file, and pass the data to printer

class printProcess {
    constructor(printer) {
        this.printer = printer;
        this.processId = "print1"
        this.QRcsvFilePath = null;
        this.QRcodeList = [];
        this.fileNames = [];
    }

    readCSVToStringList(filePath) {
        if (this.QRcsvFilePath === null){
            return false
        }
        const data = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).map(row => row.trim());
        return data;
    }

    async print() {
        this.printer.occuppied = true;
        this.QRcodeList = this.readCSVToStringList(this.QRcsvFilePath);
        if (!this.QRcodeList) {
            return false
        }
        this.fileNames = ["QR001", "QR002", "QR003", "QR004", "QR005", "QR006", "QR007", "QR008", "QR009", "QR010"];
        const div = Math.floor(this.fileNames.length / 2);

        for (let idx = 0; idx < this.fileNames.length; idx++) {
            if (this.printer.printCount < this.QRcodeList.length) {
                const text = this.printer.createModule.Text(this.QRcodeList[idx + this.printer.printCount], false);
                const QR = this.printer.createModule.QR(text);
                const msg = this.printer.createMSG(QR, this.fileNames[idx]);
                await this.printer.send(msg); // TODO : handle failed sending
                console.log(`sending QR${idx + this.printer.printCount}`);
            } else {
                break;
            }
        }

        console.log("you can start print, the print count is", this.printer.printCount);

        while (this.printer.printCount < this.QRcodeList.length) {
            console.log("waiting first half to be printed");
            const tempPC = this.printer.printCount;
            while (this.printer.printCount <= tempPC + div) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            console.log("sending first half, print count is:", this.printer.printCount);
            const sendingCompleted = false;
            if (!sendingCompleted) {
                for (let idx = 0; idx < div; idx++) {
                    if (this.printer.printCount < this.QRcodeList.length) {
                        const text = this.printer.createModule.Text(this.QRcodeList[idx + tempPC - 1], false);
                        const QR = this.printer.createModule.QR(text);
                        const msg = this.printer.createMSG(QR, this.fileNames[idx]);
                        await this.printer.send(msg);
                        console.log(`sending QR${idx + tempPC - 1} on msg ${this.fileNames[idx]}`);
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
            while (this.printer.printCount < tempPC + this.fileNames.slice(div).length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            console.log("sending second half, print count is:", this.printer.printCount);
            const tempPC2 = this.printer.printCount;
            for (let idx = 0; idx < this.fileNames.slice(div).length; idx++) {
                if (this.printer.printCount < this.QRcodeList.length) {
                    const text = this.printer.createModule.Text(this.QRcodeList[idx + tempPC2 - 1], false);
                    const QR = this.printer.createModule.QR(text);
                    const msg = this.printer.createMSG(QR, this.fileNames[div + idx]);
                    await this.printer.send(msg);
                    console.log(`sending QR${idx + tempPC2 - 1} on msg ${this.fileNames[div + idx]}`);
                } else {
                    break;
                }
            }
        }

        this.printer.printCount = 0;
        console.log("ends");
    }
}

export default printProcess;

 