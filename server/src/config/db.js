import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    const host = conn.connection.host;
    const dbName = conn.connection.name;

    console.log(
      `\x1b[32m[DB CONNECTED]\x1b[0m Environment: \x1b[33m${env.NODE_ENV}\x1b[0m | Host: \x1b[36m${host}\x1b[0m | Database: \x1b[35m${dbName}\x1b[0m`
    );

    // Verify replica set status for transactions
    try {
      const adminDb = conn.connection.db.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 });
      console.log(`\x1b[32m[REPLICA SET ACTIVE]\x1b[0m Name: \x1b[36m${status.set}\x1b[0m`);
    } catch {
      console.warn(
        '\x1b[33m[WARN] MongoDB is not running as a replica set or replSetGetStatus failed. Transactions may fail.\x1b[0m'
      );
    }

    return conn;
  } catch (error) {
    console.error('\x1b[31m[DB ERROR] Failed to connect to MongoDB:\x1b[0m', error.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('\x1b[32m[DB DISCONNECTED]\x1b[0m MongoDB connection closed.');
  } catch (error) {
    console.error('\x1b[31m[DB ERROR] Error closing MongoDB connection:\x1b[0m', error.message);
  }
}
