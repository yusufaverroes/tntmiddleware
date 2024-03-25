
const delay = 5000; // Set your delay value here

export default class testProcess {
    constructor() {
        this.loopLenght = 10
        this.running = false
        this.count =0
    }

    setLength(lenght) {
        this.loopLenght=lenght
    }
    async startLoop() {
        this.running=true
        let currentLen = this.loopLenght
        while (this.running && currentLen >0) {
            console.log(currentLen);
            currentLen = currentLen - 1;
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait for the specified delay
            this.count=this.count+1
        }
        this.running = false
        this.count=0
    }
    stopLoop() {
        this.running=false
        this.count=0
        this.loopLenght = 10
    }
}

