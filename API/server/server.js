import express from 'express';

const app = express();
const port = 3000; // TODO put on env


// Define API routes
import routesv1 from './masterRoutes.js';
routesv1(app);

// Start the server
export function startHTTPServer (){
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

}

//startHTTPServer();