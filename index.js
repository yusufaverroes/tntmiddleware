import dotenv from 'dotenv';
dotenv.config();
import lowDB from './DAO/masterConfigDao.js';
import startHTTPServer  from './API/server/server.js';
import printProcess from './DAO/printProcessDao.js';
import TIJPrinter from './DAO/TiJPrinterDao.js';
import serCam from './DAO/serCamDao.js';
import Queue from './utils/queue.js';
import pkg from 'node-libgpiod';
import Rejector from './DAO/rejectorDao.js'
import MongoDB from './DAO/mongoDB.js';
import WebSocketClient from './DAO/webSocketClient.js'
import AggregationCam from './DAO/aggregationCamDao.js'; 
import KafkaProducer from './DAO/kafka.js';
import HealthChecks from './DAO/healthCheck.js';
import weighingScaleDao from './DAO/weighingScaleDao.js'

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Handle the error gracefully or log it
});

// const masterConfig = new lowDB('../utils/master-config.json')
// await masterConfig.init()
// console.log(`masterConfigs: ${masterConfig.getAllConfig()}`)
const kafkaProdHC = new KafkaProducer("middleWare",process.env.KAFKA_BROKER_ENDPOINT)


const masterConfig = new lowDB('../utils/master-config.json');


(async () => {
  try {
    // Wait for initialization to complete
    await masterConfig.init();

    // Get all configuration values and convert to a JSON string
    //const allConfig = masterConfig.getAllConfig();
    console.log(`regex: ${JSON.stringify(masterConfig.getConfig('rejector').REGEX_PATTERNS, null, 2)}`);
  } catch (error) {
    console.error('Error in index.js:', error);
  }
})();
const mongoDB = new MongoDB(process.env.MONGODB_URI, process.env.DATABASE_NAME) // settiing up mongodb connection
await mongoDB.connect()

const { version, Chip, Line } = pkg; //setting up GPIOs
global.chip = new Chip(4)
global.rejectorActuator = new Line(chip, process.env.REJECTOR_OUTPUT_PIN); rejectorActuator.requestOutputMode();
global.rejectorSensor = new Line(chip, process.env.REJECTOR_INPUT_PIN); rejectorSensor.requestInputMode();
global.aggregateButton = new Line(chip, process.env.AGGREGATE_BUTTON_INPUT_PIN); aggregateButton.requestInputMode();
global.lablePrinterButton = new Line(chip, process.env.LABEL_PRINTER_INPUT_PIN); lablePrinterButton.requestInputMode();
rejectorActuator.setValue(1)

const serQueue = new Queue(); // instancing queue class for serialization
const rejector = new Rejector(rejectorSensor,rejectorActuator, serQueue) //instancing Rejector class
rejector.start() 

const serialCamera =  new serCam(process.env.SERIALIZATION_CAM_IP,process.env.SERIALIZATION_CAM_PORT,"1",serQueue); //instancing serCam class for serialization Camera
serialCamera.connect()
// console.log(`regexnya : ${JSON.stringify(serialCamera.patterns)}`)

const printer = new TIJPrinter(process.env.TiJPrinter_IP, process.env.TiJPrinter_PORT,process.env.TiJPrinter_SLAVE_ADDRESS,"1")//instancing printer class 
printer.connect()
await new Promise(resolve => setTimeout(resolve, 500));

const printingProcess = new printProcess(printer, mongoDB.db) // instancing printing process class with printer and mongoDB instances as the constructor
console.log(`test master : ${printingProcess.templateName}`)
const wsAggregation = new WebSocketClient(process.env.WS_IP, process.env.WS_PORT,"client2") // instancing websocket client class for aggregation
try{await wsAggregation.connect()}catch(err){console.log(err)}
console.log(`[Websocket] status: ${wsAggregation.status}`) 

const aggCam = new AggregationCam(wsAggregation, aggregateButton)// instancing aggregation cam class using wsAggregation instance
aggCam.runAggregateButton();
// await kafkaProdHC.connect();
// const HC = new HealthChecks(printer, serialCamera,aggCam,kafkaProdHC)
// HC.run()
// console.log("lewat")
weighingScaleDao.readPrinterButton(lablePrinterButton);
export  {printingProcess,printer, serialCamera, serQueue, rejector, masterConfig}  
startHTTPServer(process.env.SERVER_PORT)


await new Promise(resolve => setTimeout(resolve, 1000));


