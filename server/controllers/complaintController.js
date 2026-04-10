const Complaint = require('../models/Complaint');

// Example external n8n integration placeholder logic
const notifyN8n = async (complaint) => {
    // try {
    //     await fetch('...n8n webhook url...', { method: 'POST', body: JSON.stringify(complaint) })
    // } catch(...)
    console.log(`[n8n Webhook Triggered] New complaint submitted. Tracking ID: ${complaint.trackingId}`);
};

exports.submitComplaint = async (req, res) => {
    try {
        const complaint = new Complaint(req.body);
        await complaint.save();
        
        // Prepare webhook trigger async without blocking response
        notifyN8n(complaint);

        res.status(201).json({
            success: true,
            data: complaint,
            trackingId: complaint.trackingId
        });
    } catch (error) {
        console.error('Error submitting complaint:', error);
        res.status(400).json({ success: false, error: 'Failed to submit complaint. Ensure all required fields are provided correctly.' });
    }
};

exports.trackComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint.findOne({ trackingId: id });
        
        if (!complaint) {
            return res.status(404).json({ success: false, error: 'Complaint not found.' });
        }
        res.status(200).json({ success: true, data: complaint });
    } catch (error) {
        console.error('Error fetching tracking info:', error);
        res.status(500).json({ success: false, error: 'Server error while fetching complaint.' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const total = await Complaint.countDocuments();
        const refusedCount = await Complaint.countDocuments({ refusedNumber: true });

        // Aggregate by type
        const typeAggregation = await Complaint.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } }
        ]);

        // Aggregate by governorate
        const govAggregation = await Complaint.aggregate([
            { $group: { _id: "$governorate", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Fetch multiple recent
        const recentComplaints = await Complaint.find().sort({ createdAt: -1 }).limit(10);

        res.status(200).json({
            success: true,
            stats: {
                total,
                refusedCount,
                byType: typeAggregation,
                byGov: govAggregation,
                recent: recentComplaints
            }
        });
    } catch (error) {
        console.error('Error generating stats:', error);
        res.status(500).json({ success: false, error: 'Failed to generate dashboard aggregation statistics.' });
    }
};
