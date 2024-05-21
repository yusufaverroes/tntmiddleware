import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();


  export async function postDataToAPI(route, data) {
  try {
    const response = await axios.post('http://api-station.seratonic-rnd.local/'+route, data, 
    {
      headers: {
      'X-AUTH-BASIC': 'Basic c2VyYXRvbmljOjUzcjR0MG4xYw=='
    }
  })
    console.log('API response:', response.data);
  } catch (error) {
    console.error('[API Call] Error post data to API:', error.message);
  }
}

export async function putDataToAPI(route, data) {
  try {
    const response = await axios.put('http://api-station.seratonic-rnd.local/'+route, data, 
    {
      headers: {
      'X-AUTH-BASIC': 'Basic c2VyYXRvbmljOjUzcjR0MG4xYw=='
    }
  })
    console.log('API response:', response.data);
  } catch (error) {
    console.error('[API Call] Error put data to API:', error.message);
  }
}


//Todo : you know lah
// export default {sendDataToAPI, sendDataToAPI1}


