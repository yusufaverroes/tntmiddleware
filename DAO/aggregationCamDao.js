import { postDataToAPI } from "../API/APICall/apiCall.js";
import { EventEmitter } from 'events';
class AggregationCam {
  constructor(webSocketClient, aggButton) {
    this.webSocketClient = webSocketClient;
    this.receivedMessages = [];
    // this.handleMessage = this.handleMessage.bind(this);
    this.aggButton = aggButton;
    this.handleMessage_APICall = this.handleMessage_APICall.bind(this);
    this.webSocketClient.receiveMessage(this.handleMessage_APICall);
    this.responseEvent = new EventEmitter();
  }

  async getStatus() {
    return new Promise((resolve, reject) => {
      this.webSocketClient.sendMessage('get_status');
      this.webSocketClient.receiveMessage((message) => {
        resolve(message);
      });
    }).catch((err) => {
      throw new Error(`[Agg Cam] Error on getting camera status: ${err}`)
    });
  }

  asyncgetData() {
    return new Promise((resolve, reject) => {
      this.receivedMessages = [];
      this.webSocketClient.sendMessage('get_data');

      let timeout = setTimeout(() => {
        reject(`[Agg. Cam]Timeout occurred. No response from websocket`); // Reject with error message directly
      }, 2000);
      this.responseEvent.once('responseReceived', () => { // waiting for responseEvent from handleMessage_APICall
        clearTimeout(timeout);
        // console.log("Response received:", this.responseBuffer); // Add this line for debugging
        const result = this.mergeResponses(this.receivedMessages);
        this.receivedMessages = [];
        // const codes = result.scans.map((value) => {
        //   return value.code
        // })
        resolve(async (result)=>{
          try{
            await postDataToAPI(`v1/work-order/active-job/aggregation`, {
                    result
            
                  })
          }catch(err){

          }
        });
      });

    })
  }

  // async handleMessage(message) {
  //   console.log(`[AggCam] incoming message`) // add this line for debugging
  //   this.receivedMessages.push(message);
  //   if (this.receivedMessages.length === 3) {
  //     const result = this.mergeResponses(this.receivedMessages);
  //     const codes = result.scans.map((value) => {
  //       return value.code
  //     })
  //     await postDataToAPI(`v1/work-order/active-job/aggregation`, {
  //       serialization_codes: codes

  //     })
  //   }
  // };
  async handleMessage_APICall(message) {
    console.log(`[AggCam] incoming message`)//: ${message}`) // add this line for debugging
    this.receivedMessages.push(message);
    if (this.receivedMessages.length === 3) {
      this.responseEvent.emit('responseReceived');
      const result = this.mergeResponses(this.receivedMessages);

    }
  };
  mergeResponses(messages) {
    // console.log(messages)// uncommment for debugging only
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

        }

      }

      )
    };


    return result;

  }


  async runAggregateButton() {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    let blockButton=false;
    let lastExecutionTime=0;
    let debounceTime=200;
    while (true) {
      let buttonValue = this.aggButton.getValue();
      let currentTime = Date.now();

      if (buttonValue === 1 && (currentTime - lastExecutionTime) >= debounceTime && blockButton===false) {
        await this.getData();
        this.lastExecutionTime = currentTime;
        blockButton=true;

      }

      await sleep(50);  // Small delay to prevent tight loop
    }
  }



}



export default AggregationCam;
