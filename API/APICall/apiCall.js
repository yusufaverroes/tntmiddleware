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
    const response = await axios.post(process.env.API_URL+route, data, // Cannot read from env
    {
      headers: {
      'X-AUTH-BASIC': 'Basic c2VyYXRvbmljOjUzcjR0MG4xYw=='
    }
  })
    console.log('[API Call] post response::', response.data);
  } catch (error) {
    console.error('[API Call] Error post data to API:', error.message);
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
    console.log('[API Call] put response:', response.data);
  } catch (error) {
    console.error('[API Call] Error put data to API:', error.message);
  }
}



