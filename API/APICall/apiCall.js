import axios from 'axios';

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
//TODO to make .env works in this file (Done)
  export async function postDataToAPI(route, data) {
  try {
    const response = await axios.post(process.env.API_URL+route, data, 
    {
      headers: {
      'X-AUTH-BASIC': 'Basic c2VyYXRvbmljOjUzcjR0MG4xYw=='
    }
  })
    console.log('[API Call] Req POST Body : ', data)
    console.log(`[API Call] Req ID : ${response.headers['x-request-id']}, POST response:`, response.data);
    
  } catch (error) {
    console.error(`[API Call] Error on POST data to API : `, error.message);
   
  }
}

export async function putDataToAPI(route, data) {
  try {
    const response = await axios.put(process.env.API_URL+route, data, 
    {
      headers: {
      'X-AUTH-BASIC': 'Basic c2VyYXRvbmljOjUzcjR0MG4xYw=='
    }
  })
    console.log('[API Call] Req PUT Body : ', data)
    console.log(`[API Call] Req ID : ${response}, PUT response:`, response.data);
  } catch (error) {
    console.error(`[API Call] Error on PUT data to API : `, error.message);
    
  }
}



