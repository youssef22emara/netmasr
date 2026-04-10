const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

router.post('/', complaintController.submitComplaint);
router.get('/track/:id', complaintController.trackComplaint);
router.get('/stats', complaintController.getDashboardStats);

module.exports = router;
