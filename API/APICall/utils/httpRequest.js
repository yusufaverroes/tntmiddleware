import Cookies from "universal-cookie";

const BASE_URL = process.env.REACT_APP_API_URL;
if(!BASE_URL) {
    console.log(process.env)
    throw new Error("REACT_APP_API_URL not configured. Please check the .env file, then re-run the npm script again.")
}
const cookies = new Cookies();

export default class httpRequest {
  static set = async (endpoint, method, body, isMultipart=false) => {
    console.log(body);
    let contentType = isMultipart ? "multipart/form-data" : "application/json";
    const headers =
      body instanceof FormData
        ? {
            Accept: contentType,
            Authorization: localStorage.token
              ? "Bearer " + localStorage.token
              : sessionStorage.token
              ? "Bearer " + sessionStorage.token
              : null,
          }
        : {
            Accept: contentType,
            "Content-Type": contentType,
            Authorization: localStorage.token
              ? "Bearer " + localStorage.token
              : sessionStorage.token
              ? "Bearer " + sessionStorage.token
              : null,
          };

    return (resolve, reject) => {
      console.log(`[${method}] ${BASE_URL}${endpoint}`);

      fetch(BASE_URL + endpoint, {
        method,
        headers,
        body,
      })
        .then((response) => {
          console.log(response);
          return response.json();
        })
        .then((data) => {
          // console.log(data);
          if (data.http_status >= 400 && data.http_status <= 500) {
            reject(data);
          } else {
            resolve(data);
          }
        })
        .catch((e) => {
          console.log(e);
          reject("Network Request Failed");
        });
    };
  };
}
