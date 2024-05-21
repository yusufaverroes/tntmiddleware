import { MongoClient } from 'mongodb';

export default class MongoDB {
    constructor(uri, databaseName){
        this.client = new MongoClient(uri)
        this.db = null
        this.databaseName = databaseName
    }
    async connect() {
        try {
            console.log("connecting to MongoDB...")
            await this.client.connect();
            console.log('Connected to the MongoDB');
            this.client.db(this.databaseName)
        } catch (err) {
            console.error('[MongoDB] Error connecting to the MonggoDB, error:', err);
            throw err;
        }
    }
    
    async  close() {
        try {
            await client.close();
            console.log('[MongoDB] Connection to the database closed');
        } catch (err) {
            console.error('[MongoDB] Error closing the database connection:', err);
        }
    }
    
    async update(collectionName, id, field, newItem) {
        try {
            const collection = db.collection(collectionName);
            
            const result = await collection.updateOne({ _id: id }, { $set: { [field]: newItem } });
            
            if (result.modifiedCount === 0) {
                throw new Error('Document not found or field not modified');
            }
            
            console.log(`Field '${field}' updated successfully for document with id '${id}'`);
        } catch (err) {
            throw new Error ('[MongoDB] Error updating document:', err);
        }
    }
   
    

}