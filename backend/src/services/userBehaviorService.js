const Reservation = require('../models/Reservation');
const User = require('../models/User');
const mongoose = require('mongoose');

async function recalculateUserBehavior(userId) {
  const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const rows = await Reservation.aggregate([
    { $match: { user: objectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = rows.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  const completed = counts.completed || 0;
  const noShows = counts['no-show'] || 0;
  const checkedIn = counts['checked-in'] || 0;
  const totalSessions = completed + noShows + checkedIn;
  const noShowRate = totalSessions ? noShows / totalSessions : 0;
  const completedRate = totalSessions ? completed / totalSessions : 0;
  const punctualityScore = Math.max(0, Math.min(1, 1 - noShowRate));
  const score = Number((punctualityScore * 0.6 + completedRate * 0.4).toFixed(3));

  await User.findByIdAndUpdate(userId, {
    $set: {
      behaviorProfile: {
        punctualityScore: Number(punctualityScore.toFixed(3)),
        noShowRate: Number(noShowRate.toFixed(3)),
        completedRate: Number(completedRate.toFixed(3)),
        totalSessions,
        score,
        lastCalculatedAt: new Date(),
      },
    },
  });
}

module.exports = { recalculateUserBehavior };
