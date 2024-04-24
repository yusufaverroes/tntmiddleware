import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


export default async function sendDataToAPI(route, data) {
  try {
    const response = await axios.post('http://api-station.seratonic-rnd.local/'+route, data, 
    {
      headers: {
      'X-AUTH-BASIC': 'Basic c2VyYXRvbmljOjUzcjR0MG4xYw=='
    }
  })
    console.log('API response:', response.data);
  } catch (error) {
    console.error('Error sending data to API:', error.message);
  }
}


