import { postDataToAPI } from "../API/APICall/apiCall.js";
import { EventEmitter } from 'events';
class AggregationCam {
  constructor(webSocketClient, aggButton) {
    this.webSocketClient = webSocketClient;
    this.receivedMessages = [];
    this.handleMessage = this.handleMessage.bind(this);
    this.aggButton = aggButton;
    this.handleMessage_APICall = this.handleMessage_APICall.bind(this);
    this.webSocketClient.receiveMessage(this.handleMessage);
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

  async getData() {
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
            // await postDataToAPI(`v1/work-order/active-job/aggregation`, {
            //         result  
            //       })
            console.log(result)
          }catch(err){

          }
        });
      });

    })
  }

  async handleMessage(message) {
    console.log(`[AggCam] incoming message`) // add this line for debugging
    this.receivedMessages.push(message);
    if (this.receivedMessages.length === 3) {
      const result = this.mergeResponses(this.receivedMessages);
      // const codes = result.scans.map((value) => {
      //   return value.code
      // })
      console.log(`[AggCam] got 3 messages`)
      await postDataToAPI(`v1/work-order/active-job/aggregation`, {
        serialization_codes: result.scans
      })
      this.receivedMessages = [];
    }
  };
  async handleMessage_APICall(message) {
    // console.log(`[AggCam] incoming message`)//: ${message}`) // add this line for debugging
    this.receivedMessages.push(message);
    if (this.receivedMessages.length === 3) {
      this.responseEvent.emit('responseReceived');
      const result = this.mergeResponses(this.receivedMessages);
      console.log(`[AggCam] got 3 messages - API`)

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
    let lastExecutionTime=0;
    let debounceTime=200;
    console.log("[AggCam] button is ready")
    while (true) {
      let buttonValue = this.aggButton.getValue();
      // console.log(buttonValue)
      let currentTime = Date.now();

      if (buttonValue === 1 && (currentTime - lastExecutionTime) >= debounceTime) {
        console.log("[AggCam] Aggregate button is pressed.")
        // this.webSocketClient.receiveMessage(this.handleMessage_APICall);
        this.receivedMessages = [];
        this.webSocketClient.sendMessage('get_data');

        this.lastExecutionTime = currentTime;
        // this.webSocketClient.receiveMessage(this.handleMessage);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await sleep(50);  // Small delay to prevent tight loop
    }
  }



}



export default AggregationCam;
