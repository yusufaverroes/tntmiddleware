
export default class HealthChecks{
    constructor(printer, serCam, aggCam, webSocketClient ){
        this.printer = printer
        this.serCam = serCam
        this.aggCam = aggCam
        this.webSocketClient = webSocketClient
        this.handleMessageData = this.handleMessageData.bind(this);
        this.webSocketClient.receiveMessage(this.handleMessageData);
        this.checkInterval = 5000 //five secs
    }
      async getStatus(peripheral) {
        let status = null;
        // let ip = null;
        // let template_id = null;
        let nozzle_list = [];
        let message = null;
    
        switch (peripheral) {
        case 'PRINTER':
            if (this.printer.running) {
                status = this.printer.isOccupied ? "OCCUPIED" : "IDLING";
            } else {
                status = "DISCONNECTED";
            }
            // ip = this.printer.ip;
            template_id = this.printer.templateName;
            try {
                const ink_level_percentages = await this.printer.requestInkRemains();
                let idx=0;
                ink_level_percentages.array.forEach(element => {
                  nozzle_list.push({
                    nozzle_id:idx,
                    ink_level:element
                  })
                  idx++;
                });
            } catch (err) {
                message = err;
            }
            break;
          case 'SER_CAM':
            status= this.serCam.running?"CONNECTED":"DISCONNECTED";
            // ip = this.aggCam.ip;
            break;
    
          case 'AGG_CAM':
            try{
                status = await this.aggCam.getStatus()
            }catch(err){
                message = err;
            }
            // ip = this.aggCam.webSocketClient.ip
            break;
    
          default:
            throw new Error(`[Health Checks] Unknown peripheral: ${peripheral}`);
        }
    
        return {
          status,
          // ip,
          // template_id,
          ink_level_percentage,
          message
        };
      }
      // async sendToKafka(peripheral) {
      //   const status = await this.getStatus(peripheral);
        
      //   const payload = {
      //     peripherals: peripheral,
      //     status: status.status,
      //     ip: status.ip,
      //     template_id: status.template_id,
      //     ink_level_percentage: status.ink_level_percentage,
      //     timestamp: new Date().toISOString(),
      //     message: status.message
      //   };
      //   console.log(payload)
      //   const message = JSON.stringify(payload);
    
      //   try {
      //     await this.kafkaProducer.sendMessage('health_checks', message);
      //   } catch (error) {
      //     console.error('[Health Checks] Error sending to Kafka:', error);
      //   }
      // }

      async sendToWS() {
        const printer = await this.getStatus("PRINTER");
        const serCam = await this.getStatus("SER_CAM");
        const aggCam = await this.getStatus("AGG_CAM");
        const payload = {
          case : "HEALTH_CHECK",
          action: "HEALTH_CHECKING",
          message_code: "INFO_MIDDLEWARE_HEALTHCHECK",
          message_type: 1,
          message:"success",
          data : {
              printer:{
                status : printer.status,
                nozzle_list :[
                  {
                    nozzle_id: int,
                    ink_level: number
                  }
                
                ]
              },
              aggregation_cam : {
                status: aggCam.status
              },
              serialization_cam : {
                status: serCam.status	
              }
              
            }
              
          
          }
        console.log(payload)
        const message = JSON.stringify(payload);
    
        try {
          await this.webSocketClient.sendMessage( message);
        } catch (error) {
          console.error('[Health Checks] Error sending to wesbsocket:', error);
        }
      }
    
      // run() {
      //   console.log("[Health Check] health check is running...")
      //   setInterval(() => this.sendToKafka('PRINTER'), this.checkInterval);
      //   setInterval(() => this.sendToKafka('SER_CAM'), this.checkInterval);
      //   setInterval(() => this.sendToKafka('AGG_CAM'), this.checkInterval);
      // }
      run() {
        console.log("[Health Check] health check is running...")
        setInterval(() => this.sendToWS(), this.checkInterval);
        // setInterval(() => this.sendToWS('SER_CAM'), this.checkInterval);
        // setInterval(() => this.sendToWS('AGG_CAM'), this.checkInterval);
      }
    }
    
 
