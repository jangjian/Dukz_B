const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const { getUser } = require('../modules/getUser');

// 회원가입1-5 라우트
router.post('/signup', userController.signup);
router.post('/signup2', userController.signup2);
router.post('/signup3', userController.signup3);
router.post('/signup4', userController.signup4);
router.post('/signup5', userController.signup5);
router.post('/signup6', userController.signup6);
router.post('/signup7', userController.signup7);

// 아이디 중복확인 라우트
router.post('/checkDuplicate', userController.checkDuplicate);

// 이메일 중복확인 라우트
router.post('/emailDuplicate', userController.emailDuplicate);

// 이메일 인증번호 보내는 라우트 
router.post("/certificate", userController.certificate);

// 인증번호 확인 라우트 
router.post("/checkAuthCode", userController.checkAuthCode);

// 로그인 라우트 
router.post("/login", userController.login);

// 이미지 불러오기 라우트 
router.post("/getUrl",userController.getUrl);

// 이름 불러오기 라우트 
router.post("/getName",userController.getName);

// 일지 저장 라우트 
router.post("/saveDiary",userController.saveDiary);

// 일지의 장르 정보 저장 컨트롤러
router.post("/saveDiaryGenre",userController.saveDiaryGenre);

// 카드 뉴스 저장 컨트롤러
router.post("/saveCardNews",userController.saveCardNews);

// 카드 뉴스 불러오기 컨트롤러
router.get("/getCardNews",userController.getCardNews);

module.exports = router;
