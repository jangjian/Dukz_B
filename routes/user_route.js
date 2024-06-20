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

// 사용자의 정보 가져오는 라우트 
router.post("/getUserInfo", userController.getUserInfo);

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
router.post("/saveDiaryDetails",userController.saveDiaryDetails);

// 모든 일지 불러오기 라우트 
router.post("/getAllDiaries",userController.getAllDiaries);

// 장르 추천 일지 불러오기 라우트 
router.post("/getRecommendedDiaries",userController.getRecommendedDiaries);

// 일지 불러오기 라우트 
router.post("/getDiary",userController.getDiary);

// 사용자의 일지 불러오기 라우트 
router.post("/getUserDiary",userController.getUserDiary);

// 일정 저장 라우트
router.post("/saveSchedule",userController.saveSchedule);

// 일정 저장 라우트 2
router.post("/saveScheduleItem",userController.saveScheduleItem);

// 카드 뉴스 저장 라우트
router.post("/saveCardNews",userController.saveCardNews);

// 북마크 추가 라우트
router.post("/addBookmark",userController.addBookmark);

// 사용자의 모든 북마크 가져오기 라우트
router.post("/getUserBookmarks",userController.getUserBookmarks);

// 카드 뉴스 불러오기 라우트
router.get("/getCardNews", userController.getCardNews);

// 아이디 변경 라우트
router.post("/changeUserId", userController.changeUserId);

// 비밀번호 변경 라우트
router.post("/changeUserPw", userController.changeUserPw);

// 비밀번호 테스트 라우트
router.post("/passwordTest", userController.passwordTest);

// 사용자 이미지 변경 라우트
router.post("/changeUserImage", userController.changeUserImage);

// 사용자 닉네임 변경 라우트
router.post("/changeUserName", userController.changeUserName);

module.exports = router;
