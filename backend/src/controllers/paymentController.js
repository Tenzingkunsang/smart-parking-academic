const khaltiService = require('../services/khaltiService');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const QRCode = require('qrcode');

const initiateKhaltiPayment = async (req, res) => {
  try {
    const { reservationId } = req.body;
    
    const reservation = await Reservation.findById(reservationId).populate('parkingSpot');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Ownership Check
    if (reservation.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    
    const payload = {
      return_url: `${process.env.FRONTEND_URL}/payment-success`,
      website_url: process.env.FRONTEND_URL,
      amount: Math.round(reservation.totalAmount * 100), 
      purchase_order_id: reservation._id.toString(),
      purchase_order_name: `Parking: Spot ${reservation.parkingSpot.spotNumber}`,
      customer_info: {
        name: user.name || "Customer",
        email: user.email,
        phone: user.phone || "9800000000"
      }
    };

    const result = await khaltiService.initiatePayment(payload);

    if (result.success) {
      reservation.paymentMethod = 'khalti';
      reservation.paymentStatus = 'pending';
      await reservation.save();
      
      return res.json({
        success: true,
        payment_url: result.payment_url,
        pidx: result.pidx
      });
    }

    res.status(400).json({ success: false, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};