import { postDataToAPI } from "../API/APICall/apiCall.js";
import { EventEmitter } from 'events';

class AggregationCam {
  constructor(webSocketClient, aggButton) {
    this.webSocketClient = webSocketClient;
    this.receivedMessages = [];
    this.handleMessage = this.handleMessage.bind(this);
    this.aggButton = aggButton;
    this.webSocketClient.receiveMessage(this.handleMessage);
    this.responseEvent = new EventEmitter();
  }

  async getStatus() {
    return new Promise((resolve, reject) => {
      this.webSocketClient.sendMessage('get_status');

      let timeout = setTimeout(() => {
        reject(`[Agg. Cam] Timeout occurred. No response from websocket`);
      }, 2000);

      this.webSocketClient.receiveMessage((message) => {
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
      this.webSocketClient.sendMessage('get_data');

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

  async handleMessage(message) {
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
      this.webSocketClient.sendMessage('get_data');
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
  }
}

export default AggregationCam;
