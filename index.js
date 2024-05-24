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

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Handle the error gracefully or log it
});

// const masterConfig = new lowDB('../utils/master-config.json')
// await masterConfig.init()
// console.log(`masterConfigs: ${masterConfig.getAllConfig()}`)

const masterConfig = new lowDB('../utils/master-config.json');

(async () => {
  try {
    // Wait for initialization to complete
    await masterConfig.init();

    // Get all configuration values and convert to a JSON string
    const allConfig = masterConfig.getAllConfig();
    console.log(`masterConfigs: ${JSON.stringify(allConfig, null, 2)}`);
  } catch (error) {
    console.error('Error in index.js:', error);
  }
})();
const mongoDB = new MongoDB(process.env.MONGODB_URI, process.env.DATABASE_NAME) // settiing up mongodb connection
mongoDB.connect()

const { version, Chip, Line } = pkg; //setting up GPIOs
global.chip = new Chip(4)
global.output = new Line(chip, process.env.REJECTOR_OUTPUT_PIN); output.requestOutputMode();
global.input = new Line(chip, process.env.REJECTOR_INPUT_PIN); input.requestInputMode();
output.setValue(1)

const serQueue = new Queue(); // instancing queue class for serialization
const rejector = new Rejector(input,output, serQueue) //instancing Rejector class
rejector.start() 

const serialCamera =  new serCam(process.env.SERIALIZATION_CAM_IP,process.env.SERIALIZATION_CAM_PORT,"1",serQueue); //instancing serCam class for serialization Camera
serialCamera.connect()

const printer = new TIJPrinter(process.env.TiJPrinter_IP, process.env.TiJPrinter_PORT,process.env.TiJPrinter_SLAVE_ADDRESS,"1")//instancing printer class 
printer.connect()
await new Promise(resolve => setTimeout(resolve, 500));

const printingProcess = new printProcess(printer, mongoDB.db) // instancing printing process class with printer and mongoDB instances as the constructor

const wsAggregation = new WebSocketClient(process.env.WS_IP, process.env.WS_PORT,"client2") // instancing websocket client class for aggregation
try{await wsAggregation.connect()}catch(err){console.log(err)}
console.log(`[Websocket] status: ${wsAggregation.status}`) 

const aggCam = new AggregationCam(wsAggregation)// instancing aggregation cam class using wsAggregation instance

export  {printingProcess,printer, serialCamera, serQueue, rejector, masterConfig}  
startHTTPServer(process.env.SERVER_PORT)


await new Promise(resolve => setTimeout(resolve, 1000));


