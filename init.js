class Initialization {
  constructor(DB,websocket, aggCam, printer, serCam, rejector, yellowLed, greenLed, yellowButton, greenButton ){
    this.MongoDB = DB
    this.websocket = websocket,
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
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    this.yellowLed.setState('blinkSlow')
    this.greenLed.setState('blinkSlow')
    while (!end){
      if (this.state.connectingToDB){
        try{
          await mongoDB.connect();
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
          await wsAggregation.connect()
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
            await this.aggCam.getStatus();
            this.state.connectingToAggCam = false;
            this.state.connectingToPrinter = true
          if (retryDelay>0){
              retryDelay = 0;
              this.yellowLed.blinkingTimes = Infinity;
              this.yellowLed.setState('blinkSlow')
              this.greenLed.setState('blinkSlow')

            }
          }catch(err){
            this.yellowLed.blinkingTimes = 2;
            this.yellowLed.setState('blinkFast');
            this.greenLed.setState('off');
            console.log('[Init] error occurred: ',err);
            retryDelay=10;
          }
            
      }else if(this.state.connectingToPrinter){
        try{
            this.printer.connect();

            this.state.connectingToPrinter = false;
            this.state.connectingToSerCam = true;
            if (retryDelay>0){
                retryDelay = 0;
                this.yellowLed.blinkingTimes = Infinity;
                this.yellowLed.setState('blinkSlow')
                this.greenLed.setState('blinkSlow')

            }
          }catch(err){
            this.yellowLed.blinkingTimes = 3;
            this.yellowLed.setState('blinkFast');
            this.greenLed.setState('off');
            console.log('[Init] error occurred: ',err);
            retryDelay=10;
          }
      }else if(this.state.connectingToSerCam){
        try{
          this.serCam.connect();
          
          this.connectingToSerCam = false;
          this.rejectorCheck = true;
            if (retryDelay>0){
                retryDelay = 0;
                this.yellowLed.blinkingTimes = Infinity;
                this.yellowLed.setState('blinkSlow')
                this.greenLed.setState('blinkSlow')

            }
        }catch(err){
          this.yellowLed.blinkingTimes = 5;
          this.yellowLed.setState('blinkFast');
          this.greenLed.setState('off');
          console.log('[Init] error occurred: ',err);
          retryDelay=10;
        }        
      }else if(this.state.weighingScaleCheck){
        try{
          this.weighingScale.readWeight();
          this.state.connectingToSerCam = false;
          this.state.rejectorCheck = true;
            if (retryDelay>0){
                retryDelay = 0;
                this.yellowLed.blinkingTimes = Infinity;
                this.yellowLed.setState('blinkSlow')
                this.greenLed.setState('blinkSlow')

            }
        }catch(err){
          this.yellowLed.blinkingTimes = 6;
          this.yellowLed.setState('blinkFast');
          this.greenLed.setState('off');
          console.log('[Init] error occurred: ',err);
          retryDelay=10;
        }                
      }else if (this.state.rejectorCheck){
        this.yellowLed.setState('on');
        this.greenLed.setState('off');
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
          sleep(50)
        }
        this.yellowLed.blinkingTimes = 3;
        this.greenLed.blinkingTimes = 3;
        this.yellowLed.setState('blinkFast')
        this.greenLed.setState('blinkFast')
        this.yellowLed.blinkingTimes = Infinity;
        this.greenLed.blinkingTimes = Infinity;
        this.yellowLed.setState('off')
        this.greenLed.setState('off')
        this.state.rejectorCheck=false;
        end=true;
      }
      sleep(retryDelay)
    }
  }

}
