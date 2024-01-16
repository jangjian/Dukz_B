// user_routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');

router.post('/upload', userController.uploadImage);

module.exports = router;
