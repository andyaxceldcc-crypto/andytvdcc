const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

// Proteger todas las rutas con autenticación + rol admin
router.use(authenticate, isAdmin);

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);
router.get('/stats', adminController.getStats);
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
