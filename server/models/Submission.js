const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  bountyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bounty', 
    required: true 
  },
  developerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  prLink: { type: String },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'review', 'approved', 'paid', 'rejected', 'changes-requested'], 
    default: 'pending' 
  },
  feedback: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
