import { postDataToAPI } from "../API/APICall/apiCall.js";
class AggregationCam {
    constructor(webSocketClient) {
      this.webSocketClient = webSocketClient;
      this.receivedMessages = [];
      this.handleMessage = this.handleMessage.bind(this);
      this.webSocketClient.receiveMessage(this.handleMessage)
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
      this.webSocketClient.sendMessage('get_data');
    }

    async handleMessage(message) {
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
    // TODO: test the outcome for which accuracy is eliminated on duplicated code between messages
    mergeResponses(messages) {
      // console.log(messages) uncommment for debugging only
     

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
        scans: Object.entries(combinedData).map(([code, accuracy]) => ({ code, accuracy }))
      };
    
  
      return result;
    }

  }
  
  export default AggregationCam;
  