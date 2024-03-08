import axios from 'axios';

export default async function sendDataToAPI(data) {
  try {
    const response = await axios.post('http://localhost:3000/sendData', data);
    console.log('API response:', response.data);
  } catch (error) {
    console.error('Error sending data to API:', error.message);
  }
}


