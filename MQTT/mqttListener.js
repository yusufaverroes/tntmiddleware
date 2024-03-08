import { connect } from 'mqtt';
import Box from '../DAO/boxDao.js';


function parseMqttData(dataString) {
  const codesArray = dataString.split(';');

  const codes = codesArray.map(code => {
    const parts = code.split(',');

    const accuracy = parseInt(parts[0]);
    const coor_x = parseInt(parts[1].substring(1)); // Remove '(' and convert to integer
    const coor_y = parseInt(parts[2].substring(0, parts[2].indexOf(')'))); // Remove ')' and convert to integer
    const codeStr = parts.slice(3).join(','); // Join the remaining parts to get the code string

    return {
      accuracy,
      coor_x,
      coor_y,
      code: codeStr
    };
  });

  return codes;
}





// Create an instance of the Box class
const myBox = new Box();

// MQTT connection configuration
const mqttClient = connect('mqtt://localhost:1883');

// Function to start MQTT listener
export default function startMQTTListener() {
  // Subscribe to a topic
  mqttClient.on('connect', function() {
    mqttClient.subscribe('local/codes');
  });

  // Handle incoming messages
  mqttClient.on('message', function(topic, message) {
    // Parse message received via MQTT
    const data = JSON.parse(message);
    //const data = parseMqttData(message)
   // console.log(parseMqttData(data.strings))
    // Call the inputLayer method of the Box object
    myBox.inputLayer(parseMqttData(data.strings), "C:\\Users\\umum\\Documents\\widatech\\track and trace\\middleware\\files\\test.jpg")
      .then(layerData => {
        console.log('Layer added:', layerData);
      })
      .catch(error => {
        console.error('Error adding layer:', error);
      });
  });
}


