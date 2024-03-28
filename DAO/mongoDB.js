// db.js

export default class MongoDB {
    constructor(uri){
        this.client = new MongoClient(uri);
        this.db =  this.client.db('trackNtrace'); // default
    }
    async  connect() {
        try {
            await client.connect();
            console.log('Connected to the database');
            
        } catch (err) {
            console.error('Error connecting to the database:', err);
            throw err;
        }
    }
    
    async  close() {
        try {
            await client.close();
            console.log('Connection to the database closed');
        } catch (err) {
            console.error('Error closing the database connection:', err);
        }
    }
    
    async edit(dbName,collectionName,id, field, newItem) {
        try {
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            
            const result = await collection.updateOne({ _id: id }, { $set: { [field]: newItem } });
            
            if (result.modifiedCount === 0) {
                throw new Error('Document not found or field not modified');
            }
            
            console.log(`Field '${field}' updated successfully for document with id '${id}'`);
        } catch (err) {
            console.error('Error updating document:', err);
            throw err;
        }
    }
}
