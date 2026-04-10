const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    trackingId: {
        type: String,
        unique: true
    },
    fullName: {
        type: String,
        default: 'مواطن'
    },
    phoneNumber: {
        type: String,
        default: ''
    },
    governorate: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Speed Issue', 'Data Limit Issue', 'Disconnection', 'Other'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    refusedNumber: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Escalated', 'Completed'],
        default: 'Pending'
    }
}, { timestamps: true });

// Pre-save hook to generate Smart ID
complaintSchema.pre('save', async function(next) {
    if (this.isNew && !this.trackingId) {
        const year = new Date().getFullYear();
        // find last complaint in the current year
        const lastComplaint = await this.constructor.findOne({
            trackingId: new RegExp(`^NETRA-${year}-`)
        }).sort({ createdAt: -1 });

        let sequenceNumber = 1;
        if (lastComplaint && lastComplaint.trackingId) {
            const parts = lastComplaint.trackingId.split('-');
            if (parts.length === 3) {
                sequenceNumber = parseInt(parts[2], 10) + 1;
            }
        }

        const paddedSequence = sequenceNumber.toString().padStart(6, '0');
        this.trackingId = `NETRA-${year}-${paddedSequence}`;
    }
    next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
