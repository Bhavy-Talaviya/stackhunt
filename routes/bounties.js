const express = require('express');
const Bounty = require('../models/Bounty');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all bounties
// @route   GET /api/bounties
router.get('/', async (req, res) => {
  try {
    const { language, difficulty, tag, search } = req.query;
    let query = { status: 'open' };

    if (difficulty) query.difficulty = difficulty;
    if (tag) query.tags = { $in: [tag] };
    if (search) query.title = { $regex: search, $options: 'i' };

    const bounties = await Bounty.find(query).populate('creatorId', 'name avatar');
    res.json(bounties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user's active bounties
// @route   GET /api/bounties/active
router.get('/active', protect, async (req, res) => {
  try {
    // A bounty is "active" for a user if they have a non-rejected, non-paid submission for it,
    // or if we track "assignee" (for now let's use submission status as proxy for active work)
    const submissions = await require('../models/Submission').find({ 
      developerId: req.user._id,
      status: { $in: ['pending', 'submitted', 'review', 'approved'] }
    }).populate('bountyId');
    
    const activeBounties = submissions.map(s => ({
      ...s.bountyId._doc,
      submissionStatus: s.status
    }));
    
    res.json(activeBounties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get company's posted bounties
// @route   GET /api/bounties/company
router.get('/company', protect, authorize('company', 'maintainer', 'developer', 'admin'), async (req, res) => {
  try {
    const bounties = await Bounty.find({ creatorId: req.user._id })
      .sort({ createdAt: -1 });
    
    // For each bounty, count submissions
    const Submission = require('../models/Submission');
    const bountiesWithCount = await Promise.all(bounties.map(async (bounty) => {
      const submissionCount = await Submission.countDocuments({ bountyId: bounty._id });
      return { ...bounty._doc, submissions: submissionCount };
    }));

    res.json(bountiesWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a bounty
// @route   POST /api/bounties
router.post('/', protect, authorize('company', 'maintainer', 'developer', 'admin'), async (req, res) => {
  const { title, description, reward, difficulty, repoLink, tags, deadline } = req.body;

  try {
    const bounty = await Bounty.create({
      title,
      description,
      reward,
      difficulty,
      repoLink,
      tags,
      deadline,
      creatorId: req.user._id
    });

    const io = req.app.get('io');
    if (io) io.emit('newBounty', bounty);

    res.status(201).json(bounty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get bounty by ID
// @route   GET /api/bounties/:id
router.get('/:id', async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id).populate('creatorId', 'name avatar');
    if (bounty) {
      res.json(bounty);
    } else {
      res.status(404).json({ message: 'Bounty not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
