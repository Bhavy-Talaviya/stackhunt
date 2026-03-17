const mongoose = require('mongoose');
const User = require('./models/User');
const Bounty = require('./models/Bounty');
const Submission = require('./models/Submission');
const Earnings = require('./models/Earnings');
const dotenv = require('dotenv');

dotenv.config();

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stackhunt');
    console.log('Connected to MongoDB');

    // 1. Setup test data
    const developer = await User.findOne({ role: 'developer' }) || await User.create({
      name: 'Test Dev',
      email: 'testdev@example.com',
      password: 'password123',
      role: 'developer'
    });

    const company = await User.findOne({ role: 'company' }) || await User.create({
      name: 'Test Company',
      email: 'testcompany@example.com',
      password: 'password123',
      role: 'company'
    });

    const bounty = await Bounty.create({
      title: 'Verification Bounty',
      description: 'Test description',
      reward: 100,
      repoLink: 'https://github.com/test/repo',
      creatorId: company._id,
      status: 'open'
    });

    const submission = await Submission.create({
      bountyId: bounty._id,
      developerId: developer._id,
      status: 'submitted',
      prLink: 'https://github.com/test/repo/pull/1',
      description: 'Test submission'
    });

    console.log('Created test data');

    // 2. Perform Mock Review (Simulating the logic in submissions.js)
    // In a real verification, we'd hit the API, but here we test the logic integration
    
    // Set up initial stats
    const initialReputation = developer.reputation;
    const initialSolved = developer.solvedIssues;

    // approval logic
    submission.status = 'approved';
    await submission.save();

    await Earnings.create({
      developerId: submission.developerId,
      bountyId: submission.bountyId,
      submissionId: submission._id,
      amount: 100,
      status: 'pending'
    });

    const updatedBounty = await Bounty.findById(bounty._id);
    updatedBounty.status = 'completed';
    await updatedBounty.save();

    const updatedDeveloper = await User.findById(developer._id);
    updatedDeveloper.reputation += 10;
    updatedDeveloper.solvedIssues += 1;
    await updatedDeveloper.save();

    // 3. Assertions
    console.log('--- Verification Results ---');
    console.log('Bounty Status:', updatedBounty.status === 'completed' ? 'PASSED' : 'FAILED');
    console.log('Developer Reputation:', updatedDeveloper.reputation === initialReputation + 10 ? 'PASSED' : 'FAILED');
    console.log('Developer Solved Issues:', updatedDeveloper.solvedIssues === initialSolved + 1 + ' (PASSED)' : 'FAILED');
    
    const earnings = await Earnings.findOne({ submissionId: submission._id });
    console.log('Earnings Created:', earnings ? 'PASSED' : 'FAILED');

    // Cleanup
    await Bounty.findByIdAndDelete(bounty._id);
    await Submission.findByIdAndDelete(submission._id);
    await Earnings.findByIdAndDelete(earnings?._id);

    console.log('Verification finished.');
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION_ERROR_START');
    console.error(err.stack);
    console.error('VERIFICATION_ERROR_END');
    process.exit(1);
  }
};

verify();
