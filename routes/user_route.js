// user_routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');

// 이미지 업로드 라우트
router.post('/upload', userController.uploadImage);

// 회원가입1 라우트
router.post('/signup', userController.signup);

// 이메일 인증번호 보내는 라우트 
router.post("/certificate", userController.certificate);

// 인증번호 확인 라우트 
router.post("/checkAuthCode", userController.checkAuthCode);

module.exports = router;
