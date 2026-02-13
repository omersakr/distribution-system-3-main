const { MongoClient } = require('mongodb');

const uri = "mongodb://omersaqr20001_db_user:mNjcvUNcU308zR27@ac-4bhywpi-shard-00-00.uip35p4.mongodb.net:27017/distribution_system?authSource=admin&tls=true";

console.log('Testing direct connection to primary...');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  directConnection: true,
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB!');
    
    const db = client.db('distribution_system');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

run();
