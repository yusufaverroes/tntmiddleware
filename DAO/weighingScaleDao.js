import { postDataToAPI } from '../API/APICall/apiCall.js';
import { SerialPort, ReadlineParser } from 'serialport';
import {Mutex} from 'async-mutex';
import { needToReInit } from '../utils/globalEventEmitter.js';
// let readingLock = false;
// let readingQueue = [];
const mutex = new Mutex();
let hcInterval= null;
const hcIntervalTime=33800;
const hcIntervalTolerance = 1000;

let normalProcessFlag=false;
let errorOnReading=false;
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function setHCweightInterval(){
  hcInterval=setInterval(async ()=>{
    try {
      console.log("HC weigher")
      
      await readWeight()
    } catch (error) {

      if(errorOnReading){
        console.log("[Weighing Scale] the weighing scale is unhealthy", error);
        needToReInit.emit("pleaseReInit", "weighingScale", error)
      }
      
    }
    errorOnReading=false;
    normalProcessFlag=false;

  }
    ,normalProcessFlag?hcIntervalTime+hcIntervalTolerance:hcIntervalTime)
}
// function _processQueue() {
//   if (readingQueue.length > 0) {
//     const { resolve, reject } = readingQueue.shift();
//     readWeight().then(resolve).catch(reject);
//   }
// }

// const readWeight = async () => {
//   if (readingLock) {
//     return new Promise((resolve, reject) => {
//       readingQueue.push({ resolve, reject });
//     });
//   }
  
//   readingLock = true;
//   try {
//     const weight = await _readWeight();
//     return weight;
//   } catch (error) {
//     throw new Error('[Weighing Scale] error:', error);
//   } finally {
//     readingLock = false;
//     _processQueue();
//   }
// }
let ports= null;
let parser = null;
async function readWeight() {
  errorOnReading = false;
  const release = await mutex.acquire();

  return new Promise(async (resolve, reject) => {
    try {
      // if (ports) {
      //   ports.removeAllListeners();
      //   ports = null;
      // }
      ports = await SerialPort.list();
      let MYport = null;

      ports.forEach(port => {
        if (port.vendorId === '067b' && port.productId === '23a3') {
          console.log('Found It');
          MYport = port.path;
        }
      });

      if (MYport) {
        const port = new SerialPort({
          path: MYport,
          baudRate: 9600,
          autoOpen: false
        });
        if (parser) {
          parser.removeAllListeners();
          parser = null;
        }
        parser = new ReadlineParser({ delimiter: '\n' });
        port.pipe(parser);
        
        port.open(err => {
          if (err) {
            errorOnReading = true;
            release();
            return reject('Error opening port: ' + err.message);
          }
          console.log('[Weighing Scale] Port opened');
        });

        let readings = [];
        let retries = 0;
        const maxRetries = 3;
        const maxReadings = 5;
        let nanCount = 0;
        let timeout = setTimeout(() => {
          errorOnReading = true;
          port.close(() => {
            release();
            reject("No data readable after timeout");
          });
        }, 1000);  // Adjusted timeout

        parser.on('data', data => {
          clearTimeout(timeout);  // Reset timeout with each data chunk
          const weight = parseFloat(data.trim());

          if (!isNaN(weight)) {
            readings.push(weight);

            if (readings.length > 1 && Math.abs(readings[readings.length - 1] - readings[readings.length - 2]) > 0.005) {
              port.close(() => {
                if (retries < maxRetries) {
                  retries++;
                  console.log('Unstable reading, retrying...');
                  readWeight().then(resolve).catch(reject);  // Retry
                } else {
                  errorOnReading = true;
                  release();
                  return reject('Too many retries for unstable readings.');
                }
              });
            }

            if (readings.length >= maxReadings) {
              const average = readings.reduce((sum, value) => sum + value, 0) / readings.length;
              console.log('[Weighing Scale] Average weight:', average);

              port.close(err => {
                if (err) {
                  console.log('[Weighing Scale] Error closing port: ', err.message);
                  release();
                  return reject(err);
                }
                console.log('[Weighing Scale] Port closed successfully');
                release();
                resolve(average);
              });
            }
          } else {
            nanCount++;
            if (nanCount > 10) {
              port.close(() => {
                if (retries < maxRetries) {
                  retries++;
                  console.log('Too many NaNs, retrying...');
                  readWeight().then(resolve).catch(reject);  // Retry
                } else {
                  errorOnReading = true;
                  release();
                  return reject('Too many NaN values.');
                }
              });
            }
          }

          timeout = setTimeout(() => {
            errorOnReading = true;
            port.close(() => {
              release();
              reject("No data readable after timeout");
            });
          }, 1000);  // Restart timeout
        });

      } else {
        errorOnReading = true;
        release();
        return reject('No matching port found');
      }
    } catch (err) {
      errorOnReading = true;
      console.error('Error listing ports: ', err);
      release();
      reject(err);
    }
  });
}


const readPrinterButton = (button) => {
  clearInterval(hcInterval)
  setHCweightInterval()
  button.setShortPressCallback(async () => {
    try {
      console.log("[Label Printer] Label Printer button is pressed.");
      await postDataToAPI('v1/work-order/active-job/trigger/weighing', {});
      await sleep(1000);
    } catch (err) {
      console.log("[Label Printer] error on: ", err);
    }
  });
}

export default { readWeight, readPrinterButton, hcInterval, setHCweightInterval, normalProcessFlag};
