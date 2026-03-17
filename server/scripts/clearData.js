const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Bounty = require('../models/Bounty');
const Submission = require('../models/Submission');
const Earnings = require('../models/Earnings');
const Notification = require('../models/Notification');

async function clearData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Clearing Users...');
    await User.deleteMany({});
    
    console.log('Clearing Bounties...');
    await Bounty.deleteMany({});
    
    console.log('Clearing Submissions...');
    await Submission.deleteMany({});
    
    console.log('Clearing Earnings...');
    await Earnings.deleteMany({});
    
    console.log('Clearing Notifications...');
    await Notification.deleteMany({});

    console.log('All data cleared successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing data:', error);
    process.exit(1);
  }
}

clearData();
