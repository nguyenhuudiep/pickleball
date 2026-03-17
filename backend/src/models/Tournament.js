const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    rank: {
      type: Number,
      default: null,
    },
    result: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tournament', tournamentSchema);
