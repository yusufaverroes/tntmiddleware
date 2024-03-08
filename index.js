import startMQTTListener  from './MQTT/mqttListener.js';
//import { startHTTPServer } from './API/server.js';
import { startMQTTBroker } from './MQTT/mqttBroker.js'
import TIJPrinter from './DAO/TiJPrinterDao.js';
import printProcess from './DAO/printProcessDAO.js';

const printer = new TIJPrinter("192.168.2.20", 8010, "14")
printer.connect()
//const process = new printProcess(printer)
// Start the MQTT broker
//startMQTTBroker();
// Start the MQTT listener
//startMQTTListener();

// Start the HTTP server
//startHTTPServer();
export {printer} ;