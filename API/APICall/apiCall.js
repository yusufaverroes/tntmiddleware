import axios from 'axios';

export default async function sendDataToAPI(url, data) {
  try {
    const response = await axios.post(url, data);
    console.log('API response:', response.data);
  } catch (error) {
    console.error('Error sending data to API:', error.message);
  }
}


