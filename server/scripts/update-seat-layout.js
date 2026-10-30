import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Screen } from '../src/models/Screen.js';
import { Show } from '../src/models/Show.js';
import { ShowSeat } from '../src/models/ShowSeat.js';
import { SEAT_CATEGORIES } from '../src/constants/enums.js';

async function migrateDatabase(dbName) {
  const baseUri = env.MONGODB_URI;
  // Replace current database name in URI with target dbName
  const targetUri = baseUri.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);

  console.log(`\n\x1b[34m====================================================\x1b[0m`);
  console.log(`\x1b[34m[MIGRATION]\x1b[0m Connecting to database: \x1b[33m${dbName}\x1b[0m`);
  await mongoose.connect(targetUri);
  console.log(`\x1b[32m[CONNECTED]\x1b[0m Connected to: ${mongoose.connection.name}`);

  // 1. Update all Screens in this DB
  const screens = await Screen.find();
  console.log(`Found ${screens.length} screens in ${dbName}.`);

  for (const screen of screens) {
    const totalRows = screen.layout?.rows || 8;
    if (!screen.layout || !screen.layout.cells) continue;

    for (const cell of screen.layout.cells) {
      if (cell.kind === 'SEAT') {
        if (cell.row <= 2) {
          cell.category = SEAT_CATEGORIES.REGULAR; // First section: REGULAR (Rows A, B)
        } else if (cell.row <= Math.ceil(totalRows * 0.6)) {
          cell.category = SEAT_CATEGORIES.PREMIUM; // Second section: PREMIUM (Rows C, D, E)
        } else {
          cell.category = SEAT_CATEGORIES.RECLINER; // Last section: RECLINER (Rows F, G, H)
        }
      }
    }

    screen.categoryConfig = [
      { category: SEAT_CATEGORIES.REGULAR, defaultPricePaise: 20000 },
      { category: SEAT_CATEGORIES.PREMIUM, defaultPricePaise: 30000 },
      { category: SEAT_CATEGORIES.RECLINER, defaultPricePaise: 40000 },
    ];
    await screen.save();
    console.log(`  ✓ Updated Screen: "${screen.name}"`);
  }

  // 2. Parallel batch update for all Shows & ShowSeats
  const shows = await Show.find().select('_id pricing');
  console.log(`Found ${shows.length} shows in ${dbName}. Executing batch seat updates...`);

  await Promise.all(
    shows.map(async (show) => {
      const regPrice = show.pricing?.REGULAR || 20000;
      const premPrice = show.pricing?.PREMIUM || 30000;
      const recPrice = show.pricing?.RECLINER || 40000;

      return Promise.all([
        // Rows A and B -> REGULAR
        ShowSeat.updateMany(
          { showId: show._id, seatLabel: { $regex: '^[ABab]' } },
          { $set: { category: SEAT_CATEGORIES.REGULAR, price: regPrice } }
        ),
        // Rows C, D, and E -> PREMIUM
        ShowSeat.updateMany(
          { showId: show._id, seatLabel: { $regex: '^[CDEcde]' } },
          { $set: { category: SEAT_CATEGORIES.PREMIUM, price: premPrice } }
        ),
        // Rows F and beyond -> RECLINER
        ShowSeat.updateMany(
          { showId: show._id, seatLabel: { $regex: '^[^ABCDEabcde]' } },
          { $set: { category: SEAT_CATEGORIES.RECLINER, price: recPrice } }
        ),
      ]);
    })
  );

  console.log(`\x1b[32m[SUCCESS]\x1b[0m Successfully updated ${dbName}!`);
  await mongoose.disconnect();
}

async function runAll() {
  // Update both the production database ('imovies') and development database ('imovies_dev')
  const databases = ['imovies', 'imovies_dev'];
  for (const db of databases) {
    await migrateDatabase(db);
  }
  console.log('\n\x1b[32m[ALL COMPLETED]\x1b[0m Both live production and dev databases are updated!\n');
  process.exit(0);
}

runAll().catch((err) => {
  console.error('\x1b[31m[ERROR]\x1b[0m Migration failed:', err);
  process.exit(1);
});
