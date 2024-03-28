// db.js

export default class MongoDB {
    constructor(uri){
        this.client = new MongoClient(uri)
    }
    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to the database');
            return client.db('trackNtrace');
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
    
    async  edit(id, field, newItem) {
        try {
            const db = client.db('trackNtrace');
            const collection = db.collection('yourCollectionName'); // Replace 'yourCollectionName' with your actual collection name
            const objectId = new ObjectID(id);
            
            const result = await collection.updateOne({ _id: objectId }, { $set: { [field]: newItem } });
            
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