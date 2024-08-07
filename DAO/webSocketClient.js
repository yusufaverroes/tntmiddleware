import WebSocket from 'ws';

class WebSocketClient {
  constructor(ip, port, clientId) {
    this.ip = ip;
    this.port = port;
    this.clientId = clientId;
    this.status = 'disconnected';
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        if(this.ws){
          this.we.removeAllListeners();
          this.ws.close();
        }
        const url = this.port===null?this.ip:`ws://${this.ip}:${this.port}`;
        console.log("[websocket] url :", url)
        const headers = {
          'Client-ID': this.clientId
        };
  
        this.ws = new WebSocket(url, { headers });
  
        this.ws.once('open', () => {
          this.status = 'connected';
          resolve();
        });
  
        this.ws.once('error', (error) => {
          console.log("[Websocket] disconnected")
          this.status = 'disconnected';
          
          reject(error);
        });
  
        this.ws.once('close', () => {
          console.log("[Websocket] disconnected")
          this.status = 'disconnected';
        }); 
      } catch (error) {
        reject(error)
      }
    });
  }

  sendMessage(message) {
    if (this.ws && this.status === 'connected') {
      this.ws.send(message);
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  receiveMessage(callback) {
    if (this.ws) {
      this.ws.on('message', callback);
    } else {
      console.error('WebSocket is not initialized.');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.status = 'disconnected';
    } else {
      console.error('WebSocket is not initialized.');
    }
  }
}

export default WebSocketClient;
