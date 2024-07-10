import { postDataToAPI } from "../API/APICall/apiCall.js";
import { EventEmitter } from 'events';

class AggregationCam {
  constructor(wscForData,wscForStatus, aggButton) {
    this.wscForData = wscForData;
    this.wscForStatus= wscForStatus;
    this.receivedMessages = [];
    this.aggButton = aggButton;

    this.handleMessageData = this.handleMessageData.bind(this);
    this.wscForData.receiveMessage(this.handleMessageData);

    // this.handleMessageStatus = this.handleMessageStatus.bind(this);
    // this.wscForData.receiveMessage(this.handleMessageStatus);

    this.responseEvent = new EventEmitter();

  }

  async getStatus() {
    return new Promise((resolve, reject) => {
      this.wscForData.sendMessage('get_status');

      let timeout = setTimeout(() => {
        reject(`[Agg. Cam] Timeout occurred. No response from websocket`);
      }, 2000);

      this.wscForStatus.receiveMessage((message) => {
        clearTimeout(timeout);
        resolve(message.toString());
      });
    }).catch((err) => {
      throw new Error(`[Agg Cam] Error on getting camera status: ${err}`);
    });
  }

  async getData() {
    return new Promise((resolve, reject) => {
      this.receivedMessages = [];
      this.wscForData.sendMessage('get_data');

      let timeout = setTimeout(() => {
        reject(`[Agg. Cam] Timeout occurred. No response from websocket`);
      }, 2000);

      this.responseEvent.once('responseReceived', () => {
        clearTimeout(timeout);
        const result = this.mergeResponses(this.receivedMessages);
        this.receivedMessages = [];
        resolve(async (result) => {
          try {
            console.log(result);
          } catch (err) {
            // Handle error
          }
        });
      });
    });
  }

  async handleMessageData(message) {
    console.log(`[AggCam] incoming message`);
    this.receivedMessages.push(message);
    if (this.receivedMessages.length === 3) {
      const result = this.mergeResponses(this.receivedMessages);
      console.log(`[AggCam] got 3 messages`);
      await postDataToAPI(`v1/work-order/active-job/aggregation`, {
        serialization_codes: result.scans
      });
      this.receivedMessages = [];
    }
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
    this.aggButton.setShortPressCallback(async () => {
      console.log('[AggCam] Yellow short press detected.');
      this.receivedMessages = [];
      try {
      await getData()
      // await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log("[AggCam] error : ",error)
      }
      
    });
  }
}

export default AggregationCam;
