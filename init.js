import weighingScaleDao from "./DAO/weighingScaleDao.js";
import { getDataToAPI } from "./API/APICall/apiCall.js";
import { HttpStatusCode } from "axios";

export default class Initialization {
  constructor(DB,aggCamWsData,aggCamWsStatus, aggCam, printer, serCam, rejector, yellowLed, greenLed, yellowButton, greenButton ){
    this.MongoDB = DB
    this.aggCamWsData = aggCamWsData,
    this.aggCamWsStatus = aggCamWsStatus,
    this.aggCam = aggCam,
    this.printer = printer,
    this.serCam = serCam,
    this.rejector = rejector,
    this.yellowLed = yellowLed,
    this.greenLed = greenLed,
    this.yellowButton = yellowButton,
    this.greenButton = greenButton,
    this.state = {
      connectingToDB:true,
      connectingToWS:false,
      connectingToAggCam:false,
      connectingToPrinter:false,
      connectingToSerCam:false,
      weighingScaleCheck:false,
      rejectorCheck:false
    }
  }

  async run(){
    let end = false
    let retryDelay =0;
    function sleep(s) {
      return new Promise(resolve => setTimeout(resolve, s*1000));
    }
    this.yellowLed.setState('blinkSlow')
    this.greenLed.setState('blinkSlow')
    while (!end){
      if (this.state.connectingToDB){
        try{
          await sleep(5)
          if (!this.MongoDB.isConnected){
            await this.MongoDB.connect();
          }
          let res = await getDataToAPI("health-check");
          if(res==null || res.status!=HttpStatusCode.Ok){
            throw new Error("Server is not ready")
          }
          
          this.state.connectingToDB=false;
          this.state.connectingToWS=true;
          if (retryDelay>0){
            retryDelay = 0;
            this.yellowLed.setState('blinkSlow')
            this.greenLed.setState('blinkSlow')
          }
          
        }catch(err){
          this.yellowLed.setState('blinkFast')
          this.greenLed.setState('blinkFast')
          console.log('[Init] error occurred: ',err)
          retryDelay=10;
        }

      }else if(this.state.connectingToWS){
        try{
          if (this.aggCamWsData.status==='disconnected'){
            console.log("[Init] connecting to Websocket For data...")
            await this.aggCamWsData.connect()
            console.log("[Init] connected to Websocket for data.")
          }
          if (this.aggCamWsStatus.status==='disconnected'){
            console.log("[Init] connecting to Websocket For status...")
            await this.aggCamWsStatus.connect()
            console.log("[Init] connected to Websocket for status.")  
          }
          this.state.connectingToWS=false
          this.state.connectingToAggCam=true;
          if (retryDelay>0){
            retryDelay = 0;
            this.yellowLed.setState('blinkSlow')
            this.greenLed.setState('blinkSlow')
          }
        }catch(err){
          this.yellowLed.setState('blinkFast')
          this.greenLed.setState('off')
          console.log('[Init] error occurred: ',err)
          retryDelay=10;
        }

      }else if(this.state.connectingToAggCam){
        try{
            console.log("[Init] connecting to aggregation camera...")
            if (await this.aggCam.getStatus()==='ok'){
              console.log("[Init] connected aggregation camera") 
            }
            
            this.state.connectingToAggCam = false;
            this.state.connectingToPrinter = true
          if (retryDelay>0){
              retryDelay = 0;
              this.yellowLed.blinkingTimes = Infinity;
              this.yellowLed.setState('blinkSlow')
              this.greenLed.setState('blinkSlow')

            }
          }catch(err){
            this.yellowLed.setState('blinkFast',2);
            this.greenLed.setState('off');
            console.log('[Init] error occurred: ',err);
            retryDelay=10;
          }
            
      }else if(this.state.connectingToPrinter){
        try{
            if (!this.printer.running){
              console.log("[Init] connecting to printer...")
              await this.printer.connect();
              console.log("[Init] connected to printer")
            }
            this.state.connectingToPrinter = false;
            this.state.connectingToSerCam = true;
            if (retryDelay>0){
                retryDelay = 0;
                this.yellowLed.blinkingTimes = Infinity;
                this.yellowLed.setState('blinkSlow')
                this.greenLed.setState('blinkSlow')

            }
          }catch(err){
            this.yellowLed.setState('blinkFast', 3);
            this.greenLed.setState('off');
            console.log('[Init] error occurred: ',err);
            retryDelay=10;
          }
      }else if(this.state.connectingToSerCam){
        try{
          if(!this.serCam.running){
            console.log("[Init] connecting to serialization camera...")
            await this.serCam.connect();
            console.log("[Init] connected to serialization camera")
          }
          
          this.state.connectingToSerCam = false;
          this.state.weighingScaleCheck = true;
            if (retryDelay>0){
                retryDelay = 0;
                this.yellowLed.blinkingTimes = Infinity;
                this.yellowLed.setState('blinkSlow')
                this.greenLed.setState('blinkSlow')

            }
        }catch(err){
          this.yellowLed.setState('blinkFast', 4);
          this.greenLed.setState('off');
          console.log('[Init] error occurred: ',err);
          retryDelay=10;
        }        
      }else if(this.state.weighingScaleCheck){
        try{
          console.log("[Init] connecting to weighing scale...")
          await weighingScaleDao.readWeight();
          console.log("[Init] connected to weighing scale")
          this.state.weighingScaleCheck = false;
          this.state.rejectorCheck = true;
            if (retryDelay>0){
                retryDelay = 0;
                this.yellowLed.blinkingTimes = Infinity;
                this.yellowLed.setState('blinkSlow')
                this.greenLed.setState('blinkSlow')

            }
        }catch(err){
          this.yellowLed.setState('blinkFast', 5);
          this.greenLed.setState('off');
          console.log('[Init] error occurred: ',err);
          retryDelay=10;
        }                
      }else if (this.state.rejectorCheck){
        this.yellowLed.setState('on');
        this.greenLed.setState('on');
        let greenButtonPressed=false
        this.greenButton.setShortPressCallback(() => {
          console.log('Green short press detected.');
          greenButtonPressed=true
        });
        this.yellowButton.setShortPressCallback(async () => {
          console.log('Yellow short press detected.');
          await this.rejector.test();
        });
        await this.rejector.test();
        while (!greenButtonPressed){
          await sleep(1/10)
        }
        this.state.rejectorCheck=false;
        greenButtonPressed=false
        // final checks
        
        try {
          console.log("final checks")
          if (this.MongoDB.isConnected ){
            console.log("[Init] MongoDB connection is finalized")
            
          }else{throw new Error("MonggoDB")}
          if (this.aggCamWsData.status==='connected'){
            console.log("[Init] Aggregation cam. websocoket for data connection is finalized")
          }else{throw new Error("Aggregation WS for data")}
          if(this.aggCamWsStatus.status==='connected'){
            console.log("[Init] Aggregation cam. websocoket for status connection is finalized")
          }else{throw new Error("Aggregation WS for status")} 
          if (await this.aggCam.getStatus()==='Ok'){
            console.log("[Init] Aggregation cam. connection is finalized")
          }else{throw new Error("Aggregation Camera")}
          if (this.printer.running){
            console.log("[Init] Printer connection is finalized")
          }else{throw new Error("Printer")}
          if(this.serCam.running){
            console.log("[Init] Serialization camera connection is finalized")
          }else{throw new Error("Serialization Camera")}
                
                await weighingScaleDao.readWeight();
                let res = await getDataToAPI("health-check");
                console.log(res.status)
                if(res==null || res.status!=HttpStatusCode.Ok){
                  throw new Error("Server is not ready")
                }
                this.yellowLed.setState('blinkFast', 3)
                this.greenLed.setState('blinkFast', 3)
                this.state.rejectorCheck=false;
                this.aggCam.runAggregateButton();
                weighingScaleDao.readPrinterButton(this.greenButton);
                
                end=true;  
              
            
        } catch (error) {
            this.state.connectingToDB=true;
            end=false;
          console.log("[Init] need to re initialize", error)
        }
        
        
      }
      await sleep(retryDelay)
      
    }
    console.log("[Initialisazion] inisialization has been completed")
  }

}
