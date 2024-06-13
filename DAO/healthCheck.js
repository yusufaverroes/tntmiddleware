
export default class HealthChecks{
    constructor(printer, serCam, aggCam, kafka ){
        this.printer = printer
        this.serCam = serCam
        this.aggCam = aggCam
        this.kafkaProducer = kafka
        this.checkInterval = 5000 //five secs
    }
      async getStatus(peripheral) { //TODO : to fix if error occurred should return the value
        let status = null;
        let ip = null;
        let template_id = null;
        let ink_level_percentage = null;
        let message = null;
    
        switch (peripheral) {
        case 'PRINTER':
            if (this.printer.running) {
                status = this.printer.isOccupied ? "OCCUPIED" : "IDLING";
            } else {
                status = "DISCONNECTED";
            }
            ip = this.printer.ip;
            template_id = this.printer.templateName;
            try {
                ink_level_percentage = await this.printer.requestInkRemains();
            } catch (err) {
                message = err;
            }
            break;
          case 'SER_CAM':
            status= this.serCam.running?"CONNECTED":"DISCONNECTED";
            ip = this.aggCam.ip;
            break;
    
          case 'AGG_CAM':
            try{
                status = await this.aggCam.getStatus()
            }catch(err){
                message = err;
            }
            ip = this.aggCam.webSocketClient.ip
            break;
    
          default:
            throw new Error(`[Health Checks] Unknown peripheral: ${peripheral}`);
        }
    
        return {
          status,
          ip,
          template_id,
          ink_level_percentage,
          message
        };
      }
      async sendToKafka(peripheral) {
        const status = await this.getStatus(peripheral);
        
        const payload = {
          peripherals: peripheral,
          status: status.status,
          ip: status.ip,
          template_id: status.template_id,
          ink_level_percentage: status.ink_level_percentage,
          timestamp: new Date().toISOString(),
          message: status.message
        };
        console.log(payload)
        const message = JSON.stringify(payload);
    
        try {
          await this.kafkaProducer.sendMessage('health_checks', message);
        } catch (error) {
          console.error('[Health Checks] Error sending to Kafka:', error);
        }
      }
    
      run() {
        console.log("[Health Check] health check is running...")
        setInterval(() => this.sendToKafka('PRINTER'), this.checkInterval);
        setInterval(() => this.sendToKafka('SER_CAM'), this.checkInterval);
        setInterval(() => this.sendToKafka('AGG_CAM'), this.checkInterval);
      }
    }
    
 
