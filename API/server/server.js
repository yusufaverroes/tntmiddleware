import express from 'express';
import routesv1 from './masterRoutes.js';

const app = express();
const port = 3000; // TODO put on env

// Middleware to parse JSON bodies
app.use(express.json());

// Define API routes
routesv1(app);

// Start the server
export default function startHTTPServer() {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
