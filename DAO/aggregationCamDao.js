import { postDataToAPI } from "../API/APICall/apiCall.js";
import { EventEmitter } from 'events';
class AggregationCam {
    constructor(webSocketClient) {
      this.webSocketClient = webSocketClient;
      this.receivedMessages = [];
      this.handleMessage = this.handleMessage.bind(this);
      // this.handleMessage_APICall = this.handleMessage_APICall.bind(this);
      this.webSocketClient.receiveMessage(this.handleMessage);
      this.responseEvent = new EventEmitter();
    }
  
    getStatus() {
      return new Promise((resolve, reject) => {
        this.webSocketClient.sendMessage('get_status');
        this.webSocketClient.receiveMessage((message) => {
          resolve(message);
        });
      }).catch((err) =>{
        throw new Error(`[Agg Cam] Error on getting camera status: ${err}`)
      });
    }
  
    getData() {
      return new Promise((resolve, reject) => {
      this.receivedMessages = [];
      this.webSocketClient.sendMessage('get_data');

      let timeout = setTimeout(() => {
        reject(`[Agg. Cam]Timeout occurred. No response from websocket`); // Reject with error message directly
    }, 2000);
    this.responseEvent.once('responseReceived', () => {
      clearTimeout(timeout);
      // console.log("Response received:", this.responseBuffer); // Add this line for debugging
      const result = this.mergeResponses(this.receivedMessages);
      const codes= result.scans.map((value) => {
        return value.code
      })
      resolve({serialization_codes:codes});
  });

      })
    }

    async handleMessage(message) {
      console.log(`[AggCam] incoming message`) // add this line for debugging
      this.receivedMessages.push(message);
      if (this.receivedMessages.length === 3) {
        const result = this.mergeResponses(this.receivedMessages);
        const codes= result.scans.map((value) => {
          return value.code
        })
        await postDataToAPI(`v1/work-order/active-job/aggregation`,{ 
          serialization_codes:codes
          
      }) 
      }
    };
    async handleMessage_APICall(message) {
      // console.log(`[AggCam] incoming message: ${message}`) // add this line for debugging
      this.receivedMessages.push(message);
      if (this.receivedMessages.length === 3) {
        this.responseEvent.emit('responseReceived');
 
      }
    };
    // TODO: test the outcome for which accuracy is eliminated on duplicated code between messages(Done)
    mergeResponses(messages) {
      // console.log(messages)// uncommment for debugging only
     

      let combinedData = {};
      
      messages.forEach((message) => {
        const messageStr = message.toString(); // Convert Buffer to string
        const pairs = messageStr.split(';');
        pairs.forEach((pair) => {
          if (pair) {
            const [code, accuracy] = pair.split(':');
            combinedData[code] = parseInt(accuracy, 10);
          }
        });
      });

      this.receivedMessages = [];
  
      const result = {
        scans: Object.entries(combinedData).map(([code, accuracy]) => ({ code, accuracy })) //TODO take the largest accuracy
      };
    
  
      return result;
    }

  }
  
  export default AggregationCam;
  