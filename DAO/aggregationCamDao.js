import { postDataToAPI } from "../API/APICall/apiCall.js";
import { EventEmitter } from 'events';
import { needToReInit } from "../utils/globalEventEmitter.js";

class AggregationCam {
  constructor(wscForData,wscForStatus, aggButton) {
    this.init=null
    this.wscForData = wscForData;
    this.wscForStatus= wscForStatus;
    
    this.aggButton = aggButton;

    this.handleMessageData = this.handleMessageData.bind(this);
    this.wscForData.receiveMessage(this.handleMessageData);
    this.receivedMessages = [];

    this.handleMessageStatus = this.handleMessageStatus.bind(this);
    this.wscForStatus.receiveMessage(this.handleMessageStatus);
    this.status=null;

    this.responseEvent1 = new EventEmitter();
    this.responseEvent = new EventEmitter();
    this.timeout=null
    
    this.hcInterval=null;
    this.hcIntervalTime= 10000;
    this.hcIntervalTolerance=100;
    this.normalProcessFlag=false;
    
  }
  async setHCIinterval(){
    
      this.hcInterval=setInterval(async ()=>{
        try{
        console.log("checking aggcam")
        const status = await this.getStatus()
        if (status!='Ok'){
          needToReInit.emit("pleaseReInit", "AggCam")
          clearTimeout(this.hcInterval)
        }else{
          // console.log("agg cam is ok")
        }}
       catch (error) {
        needToReInit.emit("pleaseReInit", "AggCamWS")
        console.log("agg cam is not ok",error)
        clearTimeout(this.hcInterval)
        this.normalOperationFlag=false;
      }

      },this.normalOperationFlag?this.hcIntervalTime+this.hcTimeTolerance:this.hcIntervalTime)

  }
  async setCallBack(){
    
    this.handleMessageData = await this.handleMessageData.bind(this);
   await this.wscForData.receiveMessage(this.handleMessageData);
    this.receivedMessages = [];

    this.handleMessageStatus = await this.handleMessageStatus.bind(this);
    await this.wscForStatus.receiveMessage(this.handleMessageStatus);
    this.status=null;
  }
  async getStatus() {
    return new Promise(async (resolve, reject) => {
      await this.wscForStatus.sendMessage('get_status');
      
      let timeout = setTimeout(() => {
        console.log("reject bang")
        reject(`[Agg. Cam] Timeout occurred. No response from websocket`);
        
        // this.init?.reRun();
      }, 2000);
      this.responseEvent1.once('responseReceived', () => {
        // console.log("event received")
        clearTimeout(timeout); 
        // console.log(this.status)
        if(this.status!='Ok'){
          // this.init?.reRun();
        }
        resolve(this.status);
      })
      })
    .catch((err) => {
      throw new Error(`[Agg. Cam] Error on getting camera status: ${err}`);
    });
  }

  async getData() {
    clearInterval(this.hcInterval)
    return new Promise(async (resolve, reject) => {
      this.receivedMessages = [];
      await this.wscForData.sendMessage('get_data');

      let timeout1 = setTimeout(() => {
        this.normalOperationFlag=true;
        this.setHCIinterval()
        reject(`[Agg. Cam] Timeout occurred. No response from websocket`);
      }, 2000);
      
      this.responseEvent.once('responseReceived', () => {
        clearTimeout(timeout1);
        this.normalOperationFlag=true;
        this.setHCIinterval()
        resolve();
        // const result = this.mergeResponses(this.receivedMessages);
        // this.receivedMessages = [];
        // resolve(async (result) => {
        //   try {
        //     console.log(result);
        //   } catch (err) {
        //     // Handle error
        //   }
        // });
      });
    });
  }

  async handleMessageData(message) {
    console.log(`[AggCam] incoming message`);
    this.receivedMessages.push(message);
    if (this.receivedMessages.length === 3) {
      this.responseEvent.emit('responseReceived')
      const result = this.mergeResponses(this.receivedMessages);
      console.log(`[AggCam] got 3 messages`);
      await postDataToAPI(`v1/work-order/active-job/aggregation`, {
        serialization_codes: result.scans
      });
      this.receivedMessages = [];
    }
  }
  async handleMessageStatus(message) {
    // console.log("Status received")
    this.responseEvent1.emit('responseReceived')
    this.status=message.toString();

  }

  mergeResponses(messages) {
    let combinedData = {};

    messages.forEach((message) => {
      const messageStr = message.toString(); // Convert Buffer to string
      const pairs = messageStr.split(';');
      pairs.forEach((pair) => {
        if (pair) {
          const [code, accuracy, x, y] = pair.split(':');

          if (combinedData[code]) {
            if (combinedData[code].accuracy < accuracy) {
              combinedData[code] = { accuracy: parseInt(accuracy, 10), x: parseInt(x, 10), y: parseInt(y, 10) };
            }
          } else {
            combinedData[code] = { accuracy: parseInt(accuracy, 10), x: parseInt(x, 10), y: parseInt(y, 10) };
          }
        }
      });
    });

    const result = {
      scans: Object.entries(combinedData).map((code) => {
        return {
          "code": code[0],
          "accuracy": code[1].accuracy,
          "x": code[1].x,
          "y": code[1].y
        };
      })
    };

    return result;
  }

  runAggregateButton() {
    clearInterval(this.hcInterval)
    this.setHCIinterval();
    this.aggButton.setShortPressCallback(async () => {
      console.log('[AggCam] Yellow short press detected.');
      this.receivedMessages = [];
      try {
      await this.getData()
      // await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("[AggCam] error : ",error)
      }
      
    });
  }
}

export default AggregationCam;
