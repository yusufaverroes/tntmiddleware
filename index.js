// import startMQTTListener  from './MQTT/mqttListener.js';
// import startHTTPServer  from './API/server/server.js';
// import { startMQTTBroker } from './MQTT/mqttBroker.js'
// import TIJPrinter from './DAO/TiJPrinterDao.js';
// import printProcess from './DAO/printProcessDao.js';
// import testProcess from './DAO/testProcess.js'
// const test = new testProcess()
// const server = new startHTTPServer()
// const printer = new TIJPrinter("192.168.132.20", 8010, "14")
// console.log("helloo")
// printer.connect()
// // printer.send("14")
// //   .then(response => {
// //     // Handle successful response
// //     console.log("Response received:", response);
// //   })
// //   .catch(error => {
// //     // Handle error
// //     console.error("Error sending data:", error.message); // Print error message
// //     // Additional error handling code if needed
// //   });
// const process = new printProcess(printer)
// Start the MQTT broker
//startMQTTBroker();
// Start the MQTT listener
//startMQTTListener();

// Start the HTTP server
//startHTTPServer();


// async function main() {
//     // Start the HTTP server
//     await startHTTPServer();
    
//     const test = new testProcess()
//     return test;
// }
// export default main().catch(error => {
//     console.error("An error occurred:", error);
//   });


import startHTTPServer  from './API/server/server.js';
import printProcess from './DAO/printProcessDao.js';
import TIJPrinter from './DAO/TiJPrinterDao.js';
import testProcess from './DAO/testProcess.js'
import serCam from './DAO/serCamDao.js';
import Queue from './utils/queue.js';

const serQueue = new Queue();
import  pkg from 'node-libgpiod';
const { version, Chip, Line } = pkg;
import Rejector from './DAO/rejectorDao.js'
global.chip = new Chip(4)
global.output = new Line(chip, 17); output.requestOutputMode();
global.input = new Line(chip, 27); input.requestInputMode();
output.setValue(1)
const rejector = new Rejector(input,output, serQueue)
rejector.start()

const serialCamera =  new serCam('192.168.132.30',9004,1,serQueue, 100, 0.5, 5);
serialCamera.connect()

const printer = new TIJPrinter("192.168.132.20", 8010, "14","1")
// const printer = new TIJPrinter("127.0.0.1", 3001, "14")
printer.connect()
await new Promise(resolve => setTimeout(resolve, 200));
await printer.send("0B")
await printer.send("0C")
const printingProcess = new printProcess(printer)
const testInstance = new testProcess()
export  {printingProcess, testInstance,printer, serialCamera, serQueue}
startHTTPServer()
