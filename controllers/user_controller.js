// user_controller.js
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1011',
  database: 'dukz_db'
});

const multer = require('multer');
const path = require('path');

// 이미지 저장 디렉토리 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage }).single('profile_image');

// 회원가입 및 이미지 업로드 컨트롤러
exports.uploadImage = (req, res) => {
    // 이미지 업로드 처리
    upload(req, res, function (uploadErr) {
        if (uploadErr instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: '이미지 업로드 실패' });
        } else if (uploadErr) {
            console.error('Upload Error:', uploadErr);
        return res.status(500).json({ success: false, message: '서버 오류 발생', error: uploadErr.message });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    res.status(200).json({ success: true, message: '이미지 업로드 성공', image_url });
  });
};
