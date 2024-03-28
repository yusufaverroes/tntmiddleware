import net from 'net';


export default class serCam {
    constructor(ip, port, workstationId, queue, scanCounts, accumulativeErrorThreshold, repeatErrorThreshold) {
        this.ip = ip;
        this.port = port;
        this.workstationId = workstationId
        this.running = false;
        this.socket = null;
        this.listenerThread = null;

        this.scanCounts = scanCounts;
        this.accumulativeErrorThreshold = accumulativeErrorThreshold;
        this.repeatErrorThreshold = repeatErrorThreshold;
        this.window = [];
        this.errorCount = 0;
        this.repeatErrorCount = 0;
        this.accuracyThreshold =0.0
        this.queue=queue
    }
    connect() {
        this.socket = new net.Socket();
        this.socket.connect(this.port, this.ip, () => {
            this.running = true;
            this.listenerThread = this.listenForResponses();
            console.log("serCam Socket established");
        });

        this.socket.on('error', (err) => {
            console.error("Connection error:", err);
            this.running = false;
        });
    }
    disconnect() {
        this.running = false;
        this.socket.destroy();
        console.log("Disconnected");
    }
    separateStringToObject(input) {
        // Split the input string by ":"
        const parts = input.split(":");
        
        // Extract the code part
        const code = parts[0];
        
        // Extract the accuracy part and parse it as an integer
        const accuracy = parseInt(parts[1]);
    
        // Create and return the resulting object
        return {
            code: code,
            accuracy: accuracy
        };
    }
    listenForResponses() {
        this.socket.on('data', (response) => {
            if (response) {
                
                const data = this.receiveData(this.separateStringToObject(response.toString('utf8')))
            }
        });

        this.socket.on('error', (err) => {
            console.error("Error listening for responses:", err);
        });

        this.socket.on('close', () => {
            console.log("Listening stopped");
        });
    }

    checkFormat(data) { //TODO : change reject status into more detail reasons
        const identifikasi_pattern = /^\(90\)[A-Za-z0-9]{1,16}\(91\)\d{1,10}$/;
        const otentifikasi_pattern1 = /^\(90\)[A-Za-z0-9]{1,16}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)\d{1,20}$/;
        const otentifikasi_pattern2 = /^\(01\)[A-Za-z0-9]{14}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)\d{1,20}$/;
        let status=false
        console.log(typeof(data.code))
        console.log(identifikasi_pattern.test(data.code) || otentifikasi_pattern1.test(data.code) || otentifikasi_pattern2.test(data.code))
        if (identifikasi_pattern.test(data.code) || otentifikasi_pattern1.test(data.code) || otentifikasi_pattern2.test(data.code)) {
            console.log("Data is in correct format:", data.code);
            console.log(data.accuracy)
            if (this.accuracyThreshold<=data.accuracy){
                status = true
                
            }
            
        } else {
            console.log("Data is in bad format:", data.code);
            console.log(data.accuracy)
            this.errorCount++;
            if (this.errorCount >= this.accumulativeErrorThreshold * this.scanCounts) {
                console.log(`Accumulative error threshold reached: ${this.errorCount}`);
            }
            if (this.errorCount >= this.repeatErrorThreshold) {
                this.repeatErrorCount++;
                if (this.repeatErrorCount === 1) {
                    console.log(`Repeat error threshold reached: ${this.repeatErrorCount}`);
                }
            }
            
        }

        // Update window and counts
        this.window.push(data);
        if (this.window.length > this.scanCounts) {
            const removedData = this.window.shift();
            if (!identifikasi_pattern.test(removedData) && !otentifikasi_pattern1.test(removedData) && !otentifikasi_pattern2.test(removedData)) {
                this.errorCount--;
            }
        }
        return status
    }

    receiveData(data) {
     this.queue.enqueue(this.checkFormat(data)) 
    }
        
    
}

// Example usage
// const serializer = new Serialization(100, 0.5, 5);
// serializer.receiveData("(90)ABC(91)123456");
// serializer.receiveData("(90)DEF(10)GHI(17)789(21)123456");
// serializer.receiveData("(01)JKLMNOPQRST(10)UVWXYZ12345(17)6789(21)987654");
// serializer.receiveData("(02)XXXXX(11)YYYYYY");
