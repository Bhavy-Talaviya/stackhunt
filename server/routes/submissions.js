const express = require('express');
const Submission = require('../models/Submission');
const Bounty = require('../models/Bounty');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Start work on a bounty (create pending submission)
// @route   POST /api/submissions/start
router.post('/start', protect, authorize('developer'), async (req, res) => {
  const { bountyId } = req.body;

  try {
    const bounty = await Bounty.findById(bountyId);
    if (!bounty) return res.status(404).json({ message: 'Bounty not found' });

    // Check if already started or submitted
    const existing = await Submission.findOne({ bountyId, developerId: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already started work or submitted for this bounty' });
    }

    const submission = await Submission.create({
      bountyId,
      developerId: req.user._id,
      status: 'pending'
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Submit a solution
// @route   POST /api/submissions
router.post('/', protect, authorize('developer'), async (req, res) => {
  const { bountyId, prLink, description } = req.body;

  try {
    const bounty = await Bounty.findById(bountyId);
    if (!bounty) return res.status(404).json({ message: 'Bounty not found' });

    let submission = await Submission.findOne({ bountyId, developerId: req.user._id });

    if (submission) {
      if (submission.status !== 'pending' && submission.status !== 'changes-requested') {
        return res.status(400).json({ message: 'You have already submitted a solution for this bounty' });
      }
      submission.prLink = prLink;
      submission.description = description;
      submission.status = 'submitted';
      submission.submittedAt = Date.now();
      await submission.save();
    } else {
      submission = await Submission.create({
        bountyId,
        developerId: req.user._id,
        prLink,
        description,
        status: 'submitted'
      });
    }

    res.status(201).json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get user's submissions
// @route   GET /api/submissions/me
router.get('/me', protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ developerId: req.user._id })
      .populate('bountyId')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Review a submission
// @route   PUT /api/submissions/review
router.put('/review', protect, authorize('maintainer', 'admin'), async (req, res) => {
  const { submissionId, status, feedback } = req.body;

  try {
    const submission = await Submission.findById(submissionId).populate('bountyId');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.status = status;
    submission.feedback = feedback;
    await submission.save();

    const developer = await User.findById(submission.developerId);

    if (status === 'approved') {
      // Create a pending earnings record
      const Earnings = require('../models/Earnings');
      await Earnings.create({
        developerId: submission.developerId,
        bountyId: submission.bountyId._id,
        submissionId: submission._id,
        amount: submission.bountyId.reward,
        status: 'pending'
      });

      // Update bounty status
      const bounty = await Bounty.findById(submission.bountyId._id);
      if (bounty) {
        bounty.status = 'completed';
        await bounty.save();
      }

      // Update developer reputation, solved issues, and earnings
      developer.reputation += 10;
      developer.solvedIssues += 1;
      developer.earnings += submission.bountyId.reward;
      await developer.save();

      // Create notification
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: submission.developerId,
        message: `Your submission for "${submission.bountyId.title}" has been approved!`,
        type: 'submission_accepted'
      });
    }

    if (status === 'paid') {
      const Earnings = require('../models/Earnings');
      const earningsRecord = await Earnings.findOne({ 
        submissionId: submission._id,
        developerId: submission.developerId,
        bountyId: submission.bountyId._id
      });
      
      if (earningsRecord) {
        earningsRecord.status = 'paid';
        earningsRecord.paidAt = Date.now();
        await earningsRecord.save();
      }

      const Notification = require('../models/Notification');
      await Notification.create({
        userId: submission.developerId,
        message: `Payment released for "${submission.bountyId.title}". Check your balance!`,
        type: 'payment_released'
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(submission.developerId.toString()).emit('submissionStatusChange', {
        submissionId: submission._id,
        status,
        bountyTitle: submission.bountyId.title
      });
      
      // Update leaderboard for everyone if reputation changed
      if (status === 'approved') {
        io.emit('leaderboardUpdate');
      }
    }

    res.json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get all submissions for review (maintainer/admin only)
// @route   GET /api/submissions/review
router.get('/review', protect, authorize('maintainer', 'admin'), async (req, res) => {
  try {
    const submissions = await Submission.find({ status: 'submitted' })
      .populate('bountyId')
      .populate('developerId', 'name avatar')
      .sort({ submittedAt: 1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
