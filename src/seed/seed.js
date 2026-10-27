const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Disaster = require('../models/Disaster');
const { resolveLocation } = require('../services/locationResolver');
const seedData = require('./seedData.json');

const seed = async () => {
  console.log('[Seed] Starting database population...');
  await connectDB();

  try {
    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await Resource.deleteMany({});
    await Disaster.deleteMany({});

    // Ensure 2dsphere indexes are generated
    await Resource.init();
    await Disaster.init();

    // Seed Users
    console.log(`[Seed] Creating ${seedData.users.length} users...`);
    const createdUsers = {};
    for (const u of seedData.users) {
      const user = await User.create(u);
      createdUsers[user.email] = user;
    }

    // Seed Resources
    console.log(`[Seed] Creating ${seedData.resources.length} resources...`);
    await Resource.insertMany(seedData.resources);

    // Seed Disasters
    console.log(`[Seed] Creating ${seedData.disasters.length} disasters...`);
    for (const d of seedData.disasters) {
      const creator = createdUsers[d.creatorEmail];
      const resolvedLoc = resolveLocation(d.locationName, d.description);

      await Disaster.create({
        title: d.title,
        description: d.description,
        location: resolvedLoc,
        tags: d.tags,
        status: d.status,
        created_by: creator ? creator._id : Object.values(createdUsers)[0]._id,
      });
    }

    console.log('\n[Seed Success] Database successfully populated!');
    console.log('----------------------------------------------------');
    console.log('Available Seed Accounts:');
    seedData.users.forEach((u) => {
      console.log(` - Role: ${u.role.toUpperCase().padEnd(12)} Email: ${u.email.padEnd(25)} Password: ${u.password}`);
    });
    console.log('----------------------------------------------------');
    console.log(`Total Resources Seeded: ${seedData.resources.length}`);
    console.log(`Total Disasters Seeded: ${seedData.disasters.length}`);
    console.log('----------------------------------------------------\n');
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('[Seed] Connection closed.');
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;
