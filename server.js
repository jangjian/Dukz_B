const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors')

const app = express();
const PORT = 3000;

app.use(cors());

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

// 이미지 업로드 엔드포인트
app.post('/upload', (req, res) => {
  upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
          return res.status(500).json({ success: false, message: '이미지 업로드 실패' });
      } else if (err) {
          console.error('Upload Error:', err);
          return res.status(500).json({ success: false, message: '서버 오류 발생', error: err.message });
      }

      const image_url = req.file ? `/uploads/${req.file.filename}` : null;
      res.status(200).json({ success: true, message: '이미지가 성공적으로 업로드되었습니다.', image_url });
  });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
