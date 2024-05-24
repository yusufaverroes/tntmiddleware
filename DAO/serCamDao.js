import net from 'net';
import {postDataToAPI} from '../API/APICall/apiCall.js'
import { printingProcess } from '../index.js';
import { masterConfig } from '../index.js';

function removeSpacesAndNewlines(inputString) {
    return inputString.replace(/\s+/g, '');
}

export default class serCam {
    constructor(ip, port, workstationId, queue) {
        this.ip = ip;
        this.port = port;
        this.workstationId = workstationId
        this.running = false;
        this.socket = null;
        this.listenerThread = null;
        this.accuracyThreshold =0.0 // need discussion
        this.queue=queue
        this.patterns = masterConfig.rejector.REGEX_PATTERNS.map(patternStr => new RegExp(patternStr));
    }
    connect() {
        this.socket = new net.Socket();
        this.socket.connect(this.port, this.ip, () => {
            this.running = true;
            this.listenerThread = this.listenForResponses();
            console.log("[Ser Cam] Socket established");
        });

        this.socket.on('error', (err) => {
            console.error("[Ser Cam] Connection error:", err);
            this.running = false;
        });
    }
    disconnect() {
        this.running = false;
        this.socket.destroy();
        console.log("[Ser Cam] Disconnected");
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
            code: removeSpacesAndNewlines(code),
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
            console.error("[Ser Cam] Error listening for responses:", err);
        });

        this.socket.on('close', () => {
            console.log("[Ser Cam] Listening stopped");
            this.running = false;
        });
    }

    checkFormat(data) { //TODO : pattern should be parameterized (Done)
        let result=false
        let reason=null
        let code = data.code
        for (const pattern of this.patterns) {
            if (pattern.test(code)) {
                console.log("[Ser Cam] Data is in a correct format:", code);
                console.log(data.accuracy);
                if (this.accuracyThreshold <= data.accuracy) {
                    result = true;
                } else {
                    result = false;
                    reason = "LOW_ACCURACY";
                }
                return { result, reason, code };
            }
        }
    
        if (code === "ERROR" || code === null) {
            data.code = null;
            reason = "QR_NOT_FOUND";
        } else {
            reason = "PATTERN_MISMATCH";
        }
        console.log(`[Ser Cam] Data is in bad format or ERROR: ${reason} on scanned code: ${code}`);
    
        return { result, reason, code };
    }

    async receiveData(data) {
        
        const check = this.checkFormat(data)
        this.queue.enqueue(check.result)
        await new Promise(resolve => setTimeout(resolve, 300)); // TODO to check if necessary by testing
        await postDataToAPI(`v1/work-order/${printingProcess.work_order_id}/serialization/validate`,{ 
            accuracy:data.accuracy,
            status:check.result?"pass":"rejected",
            code:data.code,
            reason:check.reason
            
        }) 
        
    }
        
}

