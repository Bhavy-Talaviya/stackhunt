const mongoose = require('mongoose');

const bountySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  reward: { type: Number, required: true },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'easy' 
  },
  repoLink: { type: String, required: true },
  tags: [{ type: String }],
  deadline: { type: Date },
  status: { 
    type: String, 
    enum: ['open', 'in-progress', 'completed', 'cancelled'], 
    default: 'open' 
  },
  creatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  maintainerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bounty', bountySchema);
