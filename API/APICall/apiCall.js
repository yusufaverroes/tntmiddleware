import axios from 'axios';

export default async function sendDataToAPI(route, data) {
  try {
    const response = await axios.post(route, data);
    console.log('API response:', response.data);
  } catch (error) {
    console.error('Error sending data to API:', error.message);
  }
}


