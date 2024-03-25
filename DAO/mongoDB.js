// db.js
import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017/?directConnection=true'; //TODO : put on .env
const client = new MongoClient(uri);

async function connect() {
    try {
        await client.connect();
        console.log('Connected to the database');
        return client.db('trackNtrace');
    } catch (err) {
        console.error('Error connecting to the database:', err);
        throw err;
    }
}

async function close() {
    try {
        await client.close();
        console.log('Connection to the database closed');
    } catch (err) {
        console.error('Error closing the database connection:', err);
    }
}

export { connect, close };
