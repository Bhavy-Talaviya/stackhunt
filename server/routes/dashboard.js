const express = require('express');
const Bounty = require('../models/Bounty');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Active Bounties Count (submissions that are not finalized)
    const activeBountiesCount = await Submission.countDocuments({
      developerId: req.user._id,
      status: { $in: ['pending', 'submitted', 'review', 'approved'] }
    });

    res.json({
      totalEarnings: user.earnings || 0,
      activeBounties: activeBountiesCount,
      solvedIssues: user.solvedIssues || 0,
      reputation: user.reputation || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get company dashboard stats
// @route   GET /api/dashboard/company-stats
router.get('/company-stats', protect, async (req, res) => {
  try {
    const bounties = await Bounty.find({ creatorId: req.user._id });
    const bountyIds = bounties.map(b => b._id);

    const totalFunded = bounties.reduce((sum, b) => sum + (b.reward || 0), 0);
    const liveBounties = bounties.filter(b => b.status === 'open').length;

    const submissions = await Submission.find({ bountyId: { $in: bountyIds } });
    const activeDevelopers = new Set(submissions.map(s => s.developerId.toString())).size;
    const solutionsVerified = submissions.filter(s => s.status === 'approved' || s.status === 'paid').length;

    res.json({
      totalFunded,
      liveBounties,
      activeDevelopers,
      solutionsVerified
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get maintainer dashboard stats
// @route   GET /api/dashboard/maintainer-stats
router.get('/maintainer-stats', protect, async (req, res) => {
  try {
    const openSubmissions = await Submission.countDocuments({ status: 'submitted' });
    const managedRepos = await Bounty.distinct('repoLink', { maintainerId: req.user._id });
    const verifiedPRs = await Submission.countDocuments({ 
      status: { $in: ['approved', 'paid'] } 
    });

    res.json({
      openSubmissions,
      managedRepos: managedRepos.length,
      verifiedPRs,
      avgReviewTime: '4h' // Placeholder for now, can be calculated if we track review start time
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
