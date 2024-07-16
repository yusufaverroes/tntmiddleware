import net from 'net';
import {postDataToAPI} from '../API/APICall/apiCall.js'
import { printingProcess } from '../index.js';

function removeSpacesAndNewlines(inputString) {
    return inputString.replace(/\s+/g, '');
}

export default class serCam {
    constructor(ip, port, rejector) {
        this.init=null;
        this.ip = ip;
        this.port = port;
        this.running = false;
        this.socket = null;
        this.listenerThread = null;
        this.rejector= rejector;
        this.accuracyThreshold =0.0 // need discussion
        this.active=false
    }
    connect() {
        return new Promise((resolve, reject) =>{
            try {
                this.socket = new net.Socket();
                this.socket.setKeepAlive(true, 1000);
                this.socket.connect(this.port, this.ip, () => {
                    this.running = true;
                    this.listenerThread = this.listenForResponses();
                    console.log("[Ser Cam] Socket established");
                    resolve();
                });
                    
                    this.socket.on('error', (err) => {
                    this.running = false;
                    this.active=false;
                    this.init?.reRun();
                    reject(`[Ser Cam] Connection error: ${err.message}`)
                    
                });
                this.socket.on('close', (err) => {
                    this.running = false;
                    this.active=false;
                    this.init?.reRun();
                    reject(`[Ser Cam] Connection error: ${err.message}`);
                    
                });
            } catch (error) {
                reject(error)
            }

        })
        
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

    checkFormat(data) { //TODO : pattern should be parameterized
        const identifikasi_pattern = /^\(90\)[A-Za-z0-9]{1,16}\(91\)\d{1,10}$/;
        const otentifikasi_pattern1 = /^\(90\)[A-Za-z0-9]{1,16}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)[A-Za-z0-9]{1,20}$/;
        const otentifikasi_pattern2 = /^\(01\)[A-Za-z0-9]{14}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)[A-Za-z0-9]{1,20}$/;
        let result=false
        let reason="success"
        let code = data.code
        if (identifikasi_pattern.test(code) || otentifikasi_pattern1.test(code) || otentifikasi_pattern2.test(code)) {
            console.log("[Ser Cam] Data is in a correct format:", code);
            console.log(data.accuracy)
            if (this.accuracyThreshold<=data.accuracy){
                result = true
                
            }else{
                result = false
                reason = "LOW_ACCURACY"
            }
            
        } else {
            
            if (code==="ERROR" || code===null){
                data.code=null
                reason = "QR_NOT_FOUND"
            }else{
                reason = "PATTERN_MISMATCH"
            }
            console.log(`[Ser Cam] Data is in bad format or ERROR: ${reason} on scanned code: ${code}`);
            
        }

        return {result,reason,code}
    }

    async receiveData(data) {
        
        const check = this.checkFormat(data)
        if (this.active){
            if(!check.result){
                this.rejector.reject();
            }
            await postDataToAPI(`v1/work-order/${printingProcess.work_order_id}/assignment/${printingProcess.assignment_id}/serialization/validate`,{ 
                accuracy:isNaN(data.accuracy)?0:data.accuracy,
                status:check.result?"passed":"rejected",
                code:data.code,
                reason:check.reason,
                event_time:Date.now()
            }) 
    }
    }
        
}

