import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import {
  User,
  Movie,
  Theatre,
  Screen,
  Show,
  ShowSeat,
  Coupon,
  Setting,
  Booking,
  Payment,
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUS,
  MOVIE_STATUS,
  CERTIFICATES,
  FORMATS,
  SEAT_CATEGORIES,
  SEAT_STATUS,
  CELL_KIND,
  COUPON_TYPE,
  SHOW_STATUS,
} from '../src/constants/enums.js';
import { createISTInstant, formatISTDateOnly } from '../src/utils/ist-date.js';

// Helper to generate screen layout cells
function generateScreenLayout(numRows, numCols, aisleCols = [4, 9], blockedSeats = ['C1', 'C12']) {
  const rowLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.slice(0, numRows);
  const cells = [];
  let seatCount = 0;

  for (let r = 0; r < numRows; r++) {
    const rowChar = rowLetters[r];
    // Assign category based on row depth: first section REGULAR, second PREMIUM, last RECLINER
    let category = SEAT_CATEGORIES.REGULAR;
    if (r < 2) {
      category = SEAT_CATEGORIES.REGULAR; // first section: regular (closest to screen)
    } else if (r < Math.ceil(numRows * 0.6)) {
      category = SEAT_CATEGORIES.PREMIUM; // second section: premium
    } else {
      category = SEAT_CATEGORIES.RECLINER; // last section: recliner (back of hall)
    }

    for (let c = 1; c <= numCols; c++) {
      if (aisleCols.includes(c)) {
        // Aisle cell
        cells.push({
          row: r + 1,
          col: c,
          label: '',
          category: 'NONE',
          kind: CELL_KIND.AISLE,
        });
      } else {
        const label = `${rowChar}${c}`;
        const isBlocked = blockedSeats.includes(label);
        cells.push({
          row: r + 1,
          col: c,
          label,
          category: isBlocked ? 'NONE' : category,
          kind: isBlocked ? CELL_KIND.BLOCKED : CELL_KIND.SEAT,
        });
        if (!isBlocked) seatCount++;
      }
    }
  }

  return { cells, totalSeats: seatCount };
}

async function seed() {
  console.log('\x1b[34m[SEED]\x1b[0m Starting clean database seed with real movies and exact posters...');

  if (!env.MONGODB_URI) {
    console.error('\x1b[31m[FATAL] MONGODB_URI is not set. Aborting seed.\x1b[0m');
    process.exit(1);
  }

  // Connect
  await mongoose.connect(env.MONGODB_URI);
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;

  console.log(
    `\x1b[32m[DB CONNECTED]\x1b[0m Host: \x1b[36m${host}\x1b[0m | Database: \x1b[35m${dbName}\x1b[0m | Environment: \x1b[33m${env.NODE_ENV}\x1b[0m`
  );

  // Guard against accidental production seed
  if (/prod/i.test(dbName) || env.NODE_ENV === 'production') {
    console.error('\x1b[31m[FATAL] Refusing to run seed script against a production database!\x1b[0m');
    process.exit(1);
  }

  // 0. Remove old dummy movies, shows, seats, bookings
  await Booking.deleteMany({});
  await Payment.deleteMany({});
  await ShowSeat.deleteMany({});
  await Show.deleteMany({});
  await Movie.deleteMany({});
  console.log('✓ Cleared old dummy movies, shows, and booking records');

  // 1. Seed Global Settings
  await Setting.getSettings();
  console.log('✓ Global settings initialized');

  // 2. Seed Admin & Demo Users
  const adminPasswordHash = await User.hashPassword('Admin@123');
  const userPasswordHash = await User.hashPassword('User@123');

  const usersData = [
    {
      name: 'Prathul Anand',
      email: 'prathulanand1@gmail.com',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      phone: '9999999997',
    },
    {
      name: 'Satyam Gupta',
      email: 'satyamgupta93455@gmail.com',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      phone: '9999999998',
    },
    {
      name: 'System Administrator',
      email: 'admin@imovies.com',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      phone: '9999999999',
    },
    {
      name: 'Prolemda Admin',
      email: 'prolemda@gmail.com',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      phone: '9893989398',
    },
    {
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      passwordHash: userPasswordHash,
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      phone: '9876543210',
    },
    {
      name: 'Priya Patel',
      email: 'priya@example.com',
      passwordHash: userPasswordHash,
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      phone: '9876543211',
    },
    {
      name: 'Amit Verma',
      email: 'amit@example.com',
      passwordHash: userPasswordHash,
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      phone: '9876543212',
    },
  ];

  for (const u of usersData) {
    await User.findOneAndUpdate(
      { email: u.email },
      { $set: u },
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`✓ ${usersData.length} users seeded (Admin + Demo accounts)`);

  // 3. Seed Theatres
  const theatresData = [
    {
      name: 'IMovies PVR Icon',
      city: 'Mumbai',
      address: 'High Street Phoenix, Senapati Bapat Marg, Lower Parel, Mumbai - 400013',
      contact: '+91 22 4333 4444',
      coordinates: { lat: 18.9953, lng: 72.8242 },
    },
    {
      name: 'IMovies INOX Megaplex',
      city: 'Bengaluru',
      address: 'Phoenix Marketcity, Whitefield Main Rd, Mahadevapura, Bengaluru - 560048',
      contact: '+91 80 6726 6666',
      coordinates: { lat: 12.9972, lng: 77.6974 },
    },
  ];

  const seededTheatres = [];
  for (const t of theatresData) {
    const theatre = await Theatre.findOneAndUpdate(
      { name: t.name, city: t.city },
      { $set: t },
      { upsert: true, new: true, runValidators: true }
    );
    seededTheatres.push(theatre);
  }
  console.log(`✓ ${seededTheatres.length} theatres seeded`);

  // 4. Seed Screens with Layouts
  const screen1Layout = generateScreenLayout(8, 12, [4, 9], ['C1', 'C12']); // 80 seats
  const screen2Layout = generateScreenLayout(6, 10, [4, 8], ['B1']);       // 47 seats
  const screen3Layout = generateScreenLayout(7, 10, [3, 8], ['D10']);      // 55 seats

  const screensData = [
    {
      theatreId: seededTheatres[0]._id,
      name: 'Audi 1 — IMAX Laser',
      totalSeats: screen1Layout.totalSeats,
      layout: { rows: 8, cols: 12, cells: screen1Layout.cells },
      categoryConfig: [
        { category: SEAT_CATEGORIES.RECLINER, defaultPricePaise: 45000 },
        { category: SEAT_CATEGORIES.PREMIUM, defaultPricePaise: 32000 },
        { category: SEAT_CATEGORIES.REGULAR, defaultPricePaise: 22000 },
      ],
    },
    {
      theatreId: seededTheatres[0]._id,
      name: 'Audi 2 — Dolby Atmos',
      totalSeats: screen2Layout.totalSeats,
      layout: { rows: 6, cols: 10, cells: screen2Layout.cells },
      categoryConfig: [
        { category: SEAT_CATEGORIES.RECLINER, defaultPricePaise: 40000 },
        { category: SEAT_CATEGORIES.PREMIUM, defaultPricePaise: 29000 },
        { category: SEAT_CATEGORIES.REGULAR, defaultPricePaise: 19000 },
      ],
    },
    {
      theatreId: seededTheatres[1]._id,
      name: 'Screen 1 — BigPix 4K',
      totalSeats: screen3Layout.totalSeats,
      layout: { rows: 7, cols: 10, cells: screen3Layout.cells },
      categoryConfig: [
        { category: SEAT_CATEGORIES.RECLINER, defaultPricePaise: 42000 },
        { category: SEAT_CATEGORIES.PREMIUM, defaultPricePaise: 30000 },
        { category: SEAT_CATEGORIES.REGULAR, defaultPricePaise: 20000 },
      ],
    },
  ];

  const seededScreens = [];
  for (const s of screensData) {
    const screen = await Screen.findOneAndUpdate(
      { theatreId: s.theatreId, name: s.name },
      { $set: s },
      { upsert: true, new: true, runValidators: true }
    );
    seededScreens.push(screen);
  }
  console.log(`✓ ${seededScreens.length} screens with rich layout grids seeded`);

  // 5. Seed Real Movies with Exact TMDB Posters & Widescreen Backdrops
  const moviesData = [
    {
      title: 'Deadpool & Wolverine',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/cOoVcVQ3i1m5b2xtqKBtoTSbxC1.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=73_1biulkYk',
      synopsis: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit up again with an even more reluctant Wolverine.',
      cast: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin', 'Matthew Macfadyen'],
      director: 'Shawn Levy',
      durationMinutes: 128,
      genres: ['Action', 'Comedy', 'Sci-Fi'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.A,
      releaseDate: new Date('2024-07-26'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Dune: Part Two',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/uhUO7vQQKvCTfQWubOt5MAKokbL.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
      cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem', 'Austin Butler'],
      director: 'Denis Villeneuve',
      durationMinutes: 166,
      genres: ['Action', 'Adventure', 'Sci-Fi'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.UA,
      releaseDate: new Date('2024-03-01'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Oppenheimer',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
      synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II, unearthing the paradox of the man who must risk destroying the world in order to save it.',
      cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
      director: 'Christopher Nolan',
      durationMinutes: 180,
      genres: ['Biography', 'Drama', 'History'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.A,
      releaseDate: new Date('2023-07-21'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'The Batman',
      posterUrl: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=mqqft2x_Aa4',
      synopsis: 'In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a sadistic serial killer known as the Riddler.',
      cast: ['Robert Pattinson', 'Zoë Kravitz', 'Paul Dano', 'Jeffrey Wright', 'Colin Farrell'],
      director: 'Matt Reeves',
      durationMinutes: 176,
      genres: ['Action', 'Crime', 'Drama'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.UA,
      releaseDate: new Date('2022-03-04'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Spider-Man: Across the Spider-Verse',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=cqGjhVJWtEg',
      synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.',
      cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac', 'Daniel Kaluuya', 'Jake Johnson'],
      director: 'Joaquim Dos Santos, Kemp Powers',
      durationMinutes: 140,
      genres: ['Action', 'Adventure', 'Sci-Fi'],
      languages: ['English', 'Hindi', 'Tamil', 'Telugu'],
      certificate: CERTIFICATES.U,
      releaseDate: new Date('2023-06-02'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Interstellar',
      posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers through a wormhole to find a new home for mankind.',
      cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
      director: 'Christopher Nolan',
      durationMinutes: 169,
      genres: ['Sci-Fi', 'Drama', 'Adventure'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.UA,
      releaseDate: new Date('2014-11-07'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Gladiator II',
      posterUrl: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/euYIwmwkmz95mnXvufEmbL6ovhZ.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=4rgYUipGJNo',
      synopsis: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome.',
      cast: ['Paul Mescal', 'Pedro Pascal', 'Denzel Washington', 'Connie Nielsen', 'Joseph Quinn'],
      director: 'Ridley Scott',
      durationMinutes: 148,
      genres: ['Action', 'Adventure', 'Drama'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.A,
      releaseDate: new Date('2024-11-15'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Avatar: The Way of Water',
      posterUrl: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/ovM06PdF3M8wvKb06i4sjW3xoww.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=d9MyW72ELq0',
      synopsis: 'Set more than a decade after the events of the first film, Jake Sully and Neytiri have formed a family and are doing everything to stay together. However, they must leave their home and explore the oceanic regions of Pandora.',
      cast: ['Sam Worthington', 'Zoe Saldana', 'Sigourney Weaver', 'Stephen Lang', 'Kate Winslet'],
      director: 'James Cameron',
      durationMinutes: 192,
      genres: ['Action', 'Adventure', 'Sci-Fi'],
      languages: ['English', 'Hindi', 'Tamil', 'Telugu'],
      certificate: CERTIFICATES.UA,
      releaseDate: new Date('2022-12-16'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'The Dark Knight',
      posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/dqK9Hag1054tghRQSqLSfrkvQnA.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
      synopsis: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. But they soon find themselves prey to a reign of chaos unleashed by the Joker.',
      cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Maggie Gyllenhaal'],
      director: 'Christopher Nolan',
      durationMinutes: 152,
      genres: ['Action', 'Crime', 'Drama'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.UA,
      releaseDate: new Date('2008-07-18'),
      status: MOVIE_STATUS.NOW_SHOWING,
    },
    {
      title: 'Joker: Folie à Deux',
      posterUrl: 'https://image.tmdb.org/t/p/w500/if8QiqCI7WAGImKcJCfzp6VTyKA.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/aciP8Km0waTLXEYf5ybFK5CSUxl.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=_OKAwz2NiOI',
      synopsis: 'Failed comedian Arthur Fleck meets the love of his life, Harley Quinn, while incarcerated at Arkham State Hospital. Upon his release, the two embark on a doomed romantic misadventure through the twisted streets of Gotham.',
      cast: ['Joaquin Phoenix', 'Lady Gaga', 'Brendan Gleeson', 'Catherine Keener', 'Zazie Beetz'],
      director: 'Todd Phillips',
      durationMinutes: 138,
      genres: ['Drama', 'Crime', 'Thriller'],
      languages: ['English', 'Hindi'],
      certificate: CERTIFICATES.A,
      releaseDate: new Date('2024-10-04'),
      status: MOVIE_STATUS.UPCOMING,
    },
  ];

  const seededMovies = [];
  for (const m of moviesData) {
    const movie = await Movie.create(m);
    seededMovies.push(movie);
  }
  console.log(`✓ ${seededMovies.length} movies seeded with verified TMDB official posters & backdrops`);

  // 6. Seed Shows across the next 7 days in IST
  const nowShowingMovies = seededMovies.filter((m) => m.status === MOVIE_STATUS.NOW_SHOWING);
  const showTimes = ['10:00', '13:45', '17:30', '21:15']; // 4 IST showtimes per day
  let showCount = 0;
  let seatInventoryCount = 0;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateStr = formatISTDateOnly(targetDate);

    // Distribute across screens
    for (let sIdx = 0; sIdx < seededScreens.length; sIdx++) {
      const screen = seededScreens[sIdx];
      const theatre = seededTheatres.find((t) => t._id.equals(screen.theatreId));

      const timesForThisScreen = showTimes;

      for (let tIdx = 0; tIdx < timesForThisScreen.length; tIdx++) {
        const timeStr = timesForThisScreen[tIdx];
        const movieIndex = (dayOffset * 4 + sIdx * 4 + tIdx) % nowShowingMovies.length;
        const movie = nowShowingMovies[movieIndex];

        const startInstant = createISTInstant(dateStr, timeStr);
        const endInstant = new Date(startInstant.getTime() + (movie.durationMinutes + 20) * 60 * 1000);

        // Fetch pricing from screen category config
        const pricing = {
          RECLINER: screen.categoryConfig.find((c) => c.category === SEAT_CATEGORIES.RECLINER)?.defaultPricePaise || 45000,
          PREMIUM: screen.categoryConfig.find((c) => c.category === SEAT_CATEGORIES.PREMIUM)?.defaultPricePaise || 32000,
          REGULAR: screen.categoryConfig.find((c) => c.category === SEAT_CATEGORIES.REGULAR)?.defaultPricePaise || 22000,
        };

        const show = await Show.create({
          movieId: movie._id,
          screenId: screen._id,
          theatreId: theatre._id,
          startTime: startInstant,
          endTime: endInstant,
          language: movie.languages[0],
          format: screen.name.includes('IMAX') ? FORMATS.IMAX : FORMATS.TWO_D,
          pricing,
          status: SHOW_STATUS.SCHEDULED,
        });
        showCount++;

        // Pre-populate ShowSeat inventory for this show from Screen layout
        const seatDocs = [];
        for (const cell of screen.layout.cells) {
          if (cell.kind === CELL_KIND.SEAT && cell.label) {
            const price = pricing[cell.category] || pricing.REGULAR;
            seatDocs.push({
              showId: show._id,
              seatLabel: cell.label,
              category: cell.category,
              price,
              status: SEAT_STATUS.AVAILABLE,
            });
          }
        }

        if (seatDocs.length > 0) {
          await ShowSeat.insertMany(seatDocs, { ordered: false });
        }
        seatInventoryCount += seatDocs.length;
      }
    }
  }

  console.log(`✓ ${showCount} shows seeded across the next 7 days in IST`);
  console.log(`✓ ${seatInventoryCount} ShowSeat inventory records created with compound indexes`);

  // 7. Seed Demo Coupons
  const couponsData = [
    {
      code: 'WELCOME50',
      discountType: COUPON_TYPE.PERCENT,
      discountValue: 50, // 50%
      maxDiscount: 15000, // max ₹150 in paise
      minAmount: 20000, // min ₹200 in paise
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 5000,
      perUserLimit: 2,
      isActive: true,
    },
    {
      code: 'FLAT100',
      discountType: COUPON_TYPE.FLAT,
      discountValue: 10000, // ₹100 flat in paise
      maxDiscount: 10000,
      minAmount: 0, // no minimum amount required
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 2000,
      perUserLimit: 10,
      isActive: true,
    },
    {
      code: 'IMOVIES20',
      discountType: COUPON_TYPE.PERCENT,
      discountValue: 20, // 20%
      maxDiscount: 20000, // max ₹200 in paise
      minAmount: 25000, // min ₹250 in paise
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 10000,
      perUserLimit: 3,
      isActive: true,
    },
  ];

  for (const c of couponsData) {
    await Coupon.findOneAndUpdate(
      { code: c.code },
      { $set: c },
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`✓ ${couponsData.length} promotional coupons seeded`);

  console.log('\n\x1b[32m[SEED SUCCESS]\x1b[0m All models and seed fixtures successfully created!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\x1b[31m[SEED FAILED]\x1b[0m Error seeding database:', err);
  process.exit(1);
});
