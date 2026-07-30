import { MongoClient } from 'mongodb';
const uri = 'mongodb+srv://tusharpamnani55_db_user:HXxgjBAj06WjXKIy@cluster0.jfzbpa9.mongodb.net/hush_backend';
const client = new MongoClient(uri);
await client.connect();
const db = client.db('hush_backend');
const cols = await db.listCollections().toArray();
for (const c of cols) await db.collection(c.name).deleteMany({});
console.log(`Cleared ${cols.length} collections: ${cols.map(c => c.name).join(', ')}`);
await client.close();
