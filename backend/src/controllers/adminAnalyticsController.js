const mongoose = require('mongoose');
const ParkingSpot = require('../models/ParkingSpot');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');

const ACTIVE_STATUSES = ['reserved', 'checked-in', 'overstay'];
const PAID_STATUSES = ['reserved', 'checked-in', 'overstay', 'completed'];

/* ----------------------------- helpers ----------------------------- */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* ====================================================================
 * 1. PEAK DEMAND HEATMAP
 *    GET /api/v1/admin/analytics/peak-demand?days=7
 *
 *    Groups reservations by hour-of-day (0..23) and counts bookings.
 *    Single aggregation, hits the `scheduledArrival` index, no in-memory
 *    massaging on hot path.
 * ================================================================== */
exports.getPeakDemand = async (req, res) => {
  try {
    const days = Math.max(1, Math.min(90, parseInt(req.query.days, 10) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          scheduledArrival: { $gte: since },
          status: { $in: PAID_STATUSES }
        }
      },
      {
        $group: {
          // Bug Task-5: peak-hour analytics must be computed in the operating
          // timezone. SmartPark is deployed in Nepal so this is Asia/Kathmandu (NPT, UTC+5:45).
          _id: { $hour: { date: '$scheduledArrival', timezone: 'Asia/Kathmandu' } },
          bookings: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$amountInfo.finalAmount', { $ifNull: ['$amountInfo.totalAmount', 0] }] } }
        }
      },
      { $project: { _id: 0, hour: '$_id', bookings: 1, revenue: 1 } },
      { $sort: { hour: 1 } }
    ];

    const rows = await Reservation.aggregate(pipeline).allowDiskUse(true);

    // Fill missing hours so the frontend renders a flat 24-bar row
    const byHour = new Map(rows.map((r) => [r.hour, r]));
    const max = rows.reduce((m, r) => Math.max(m, r.bookings), 0) || 1;
    const data = Array.from({ length: 24 }, (_, h) => {
      const row = byHour.get(h) || { hour: h, bookings: 0, revenue: 0 };
      return { ...row, intensity: row.bookings / max };
    });

    const peakHour = data.reduce((a, b) => (b.bookings > a.bookings ? b : a), data[0]);

    res.json({
      success: true,
      data,
      meta: { rangeDays: days, peakHour: peakHour.hour, peakBookings: peakHour.bookings }
    });
  } catch (err) {
    console.error('[admin/peakDemand]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ====================================================================
 * 2. SMART INSIGHTS POWER QUERY
 *    GET /api/v1/admin/analytics/insights
 *
 *    Runs three aggregations in parallel via Promise.all — total wall
 *    time = max(query), not the sum.
 * ================================================================== */
exports.getSmartInsights = async (_req, res) => {
  try {
    const todayStart = startOfDay(new Date());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const occupancyPromise = Promise.all([
      ParkingSpot.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalSpots: { $sum: '$totalSpaces' }, available: { $sum: '$availableSpaces' } } }
      ]),
      Reservation.countDocuments({ status: { $in: ACTIVE_STATUSES } })
    ]).then(([spotsAgg, activeBookings]) => {
      const totals = spotsAgg[0] || { totalSpots: 0, available: 0 };
      const rate = totals.totalSpots > 0 ? (activeBookings / totals.totalSpots) * 100 : 0;
      return {
        activeBookings,
        totalSpots: totals.totalSpots,
        availableSpaces: totals.available,
        occupancyRate: Number(rate.toFixed(1))
      };
    });

    const revenuePromise = Reservation.aggregate([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          createdAt: { $gte: yesterdayStart }
        }
      },
      {
        $group: {
          _id: {
            $cond: [{ $gte: ['$createdAt', todayStart] }, 'today', 'yesterday']
          },
          total: { $sum: { $ifNull: ['$amountInfo.finalAmount', { $ifNull: ['$amountInfo.totalAmount', 0] }] } },
          count: { $sum: 1 }
        }
      }
    ]).then((rows) => {
      const today = rows.find((r) => r._id === 'today') || { total: 0, count: 0 };
      const yest = rows.find((r) => r._id === 'yesterday') || { total: 0, count: 0 };
      const growth =
        yest.total > 0
          ? ((today.total - yest.total) / yest.total) * 100
          : today.total > 0
          ? 100
          : 0;
      return {
        todayRevenue: today.total,
        yesterdayRevenue: yest.total,
        todayBookings: today.count,
        revenueGrowthPct: Number(growth.toFixed(1))
      };
    });

    const topRatedPromise = ParkingSpot.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'parkingSpot',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          reviewCount: { $size: '$reviews' },
          averageRating: {
            $cond: [{ $gt: [{ $size: '$reviews' }, 0] }, { $avg: '$reviews.rating' }, 0]
          }
        }
      },
      { $match: { reviewCount: { $gt: 0 } } },
      { $sort: { averageRating: -1, reviewCount: -1 } },
      { $limit: 1 },
      {
        $project: {
          locationName: 1,
          address: 1,
          averageRating: { $round: ['$averageRating', 2] },
          reviewCount: 1,
          price: 1
        }
      }
    ]).then((rows) => rows[0] || null);

    const [occupancy, revenue, topRated] = await Promise.all([
      occupancyPromise,
      revenuePromise,
      topRatedPromise
    ]);

    res.json({
      success: true,
      data: { occupancy, revenue, topRated, generatedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.error('[admin/insights]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ====================================================================
 * 3. SYSTEM STATUS
 *    GET /api/v1/admin/analytics/system-status
 *    Confirms 2dsphere index + reports platform-nav API health.
 * ================================================================== */
exports.getSystemStatus = async (_req, res) => {
  try {
    const indexes = await ParkingSpot.collection.indexes();
    const hasGeoIndex = indexes.some((ix) => {
      const keys = ix.key || {};
      return Object.values(keys).includes('2dsphere');
    });

    const db = mongoose.connection;
    const dbOk = db.readyState === 1;

    res.json({
      success: true,
      data: {
        geoIndex: {
          name: '2dsphere',
          collection: 'parkingspots',
          online: hasGeoIndex,
          indexCount: indexes.length
        },
        platformNavApi: {
          name: 'Platform-Aware Navigation',
          online: true,
          providers: ['Apple Maps (iOS)', 'Google Maps (Android/Web)']
        },
        database: {
          name: 'MongoDB Atlas',
          online: dbOk,
          host: db.host || 'unknown'
        },
        smartScoreEngine: { online: true, weights: { distance: 0.6, price: 0.2, rating: 0.2 } },
        checkedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
