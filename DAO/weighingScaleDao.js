
import { postDataToAPI } from '../API/APICall/apiCall.js';
import { SerialPort, ReadlineParser } from 'serialport';

const readWeight = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const ports = await SerialPort.list();
            let MYport = null;

            ports.forEach(port => {
                if (port.vendorId === '067b' && port.productId === '23a3') {
                    console.log('Found It');
                    MYport = port.path;
                    console.log(MYport);
                }
            });

            if (MYport) {
                const port = new SerialPort({
                    path: MYport,
                    baudRate: 9600,  // Set baudRate as needed
                    autoOpen: false
                });

                const parser = new ReadlineParser({ delimiter: '\n' });
                port.pipe(parser);

                port.open(err => {
                    if (err) {
                        reject ('Error opening port: ', err);
                    }

                    // Write data to the port
                    port.write('main screen turn on\n');
                    console.log('Port opened and data written');
                });

                let readings = [];
                const maxReadings = 5;
                let idx =0;

                // Continuously read data from the port
                parser.on('data', data => {
                    const weight = parseFloat(data.trim());
                    console.log('Data:', weight);

                    if (!isNaN(weight)) {
                        readings.push(weight);
                        idx++;
                    }
                    if (readings.length>0 && Math.abs(readings[idx]-readings[idx-1]) >0.0005){
                        resolve('unstable') 
                    } 


                    if (readings.length >= maxReadings) {
                        const average = readings.reduce((sum, value) => sum + value, 0) / readings.length;
                        console.log('Average weight:', average);

                        // Close the port after reading 5 data points
                        port.close(err => {
                            if (err) {
                                console.log('Error closing port: ', err.message);
                                return reject(err);
                            }
                            console.log('Port closed successfully');
                            resolve(average);
                        });
                    }
                });

                // Handle errors
                port.on('error', err => {
                    console.log('Error: ', err.message);
                    reject(err);
                });

                // Handle port close event
                port.on('close', () => {
                    console.log('Port closed');
                });

            } else {
                console.log('No matching port found');
                reject(new Error('No matching port found'));
            }
        } catch (err) {
            console.error('Error listing ports: ', err);
            reject(err);
        }
    });
};

const readPrinterButton = async (button)=>{
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      let lastExecutionTime=0;
      let debounceTime=200;
      console.log("[Label Printer] button is ready")
      while (true) {
        let buttonValue = button.getValue();
        // console.log(buttonValue)
        let currentTime = Date.now();
  
        if (buttonValue === 1 && (currentTime - lastExecutionTime) >= debounceTime) {
            try{
                console.log("[Lable Printer] Label Printer button is pressed.")
                // const weight = readWeight();
                // console.log("weight is ", weight)
                // //send to API

                await postDataToAPI('v1/work-order/active-job/trigger/weighing',{ 
                }) 
                lastExecutionTime = currentTime;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }catch(err){
                console.log("[Lable Printer Button] error on : ", err)
            }
        }
  
        await sleep(50);  // Small delay to prevent tight loop
      }
}

export default {readWeight, readPrinterButton};


