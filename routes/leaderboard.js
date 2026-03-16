const express = require('express');
const User = require('../models/User');

const router = express.Router();

// @desc    Get top developers
// @route   GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const topDevelopers = await User.find({ role: 'developer' })
      .sort({ reputation: -1, earnings: -1 })
      .limit(10)
      .select('name avatar reputation earnings skills');
    
    res.json(topDevelopers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
