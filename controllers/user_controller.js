// user_controller.js
const mysql = require('mysql2');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
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

// 이미지 업로드 컨트롤러
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

// 회원가입 컨트롤러(이메일)
exports.signup = (req, res) => {
    const { email } = req.body;
  
    const sql = 'INSERT INTO user (email) VALUES (?)';
    connection.query(sql, [email], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error registering user' });
        return;
      }

      // 사용자 등록 후 생성된 ID를 반환
      const userId = result.insertId;
      res.status(200).json({ message: 'User registered successfully', userId });
    });
};

// 회원가입 컨트롤러 2 (아이디, 비밀번호)
exports.signup2 = (req, res) => {
    const { userId, userid, pw } = req.body;
  
    const sql = 'UPDATE user SET userid = ?, password = ? WHERE id = ?';
    connection.query(sql, [userid, pw, userId], (err, updateResult) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating user information' });
        return;
      }
      res.status(200).json({ message: 'User registered successfully' });
    });
};

// 최종 회원가입 및 이미지 업로드 컨트롤러
exports.signup3 = (req, res) => {
    // 이미지 업로드 처리
    upload(req, res, function (uploadErr) {
        if (uploadErr instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: '이미지 업로드 실패' });
        } else if (uploadErr) {
            console.error('Upload Error:', uploadErr);
            return res.status(500).json({ success: false, message: '서버 오류 발생', error: uploadErr.message });
        }

        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        // 회원가입 정보 업데이트
        const { name, birth } = req.body;
        const sql = 'UPDATE user SET name = ?, birth = ?, image_url = ? WHERE id = ?';
        connection.query(sql, [name, birth, image_url, userId], (err, updateResult) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error updating user information' });
                return;
            }
            res.status(200).json({ success: true, message: 'User registered successfully', image_url });
        });
    });
};

// 아이디 중복 확인 컨트롤러
exports.checkDuplicate = (req, res) => {
    const { userid } = req.body;
    const checkDuplicateSql = 'SELECT COUNT(*) AS count FROM user WHERE userid = ?';
    connection.query(checkDuplicateSql, [userid], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error checking duplicate user' });
        return;
      }
      res.status(200).json({ isDuplicate: result[0].count > 0 });
    });
};

// 이메일 인증 코드 요청 컨트롤러
exports.certificate = async (req, res) => {
    const { email } = req.body;
    // 기존에 해당 이메일로 생성된 인증 코드가 있다면 삭제
    const deleteAuthCodeSql = 'DELETE FROM verification_codes WHERE email = ?';
    connection.query(deleteAuthCodeSql, [email], async (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error(deleteErr);
        return res.status(500).json({ error: '기존 인증 코드를 삭제하는 중 오류가 발생하였습니다.' });
      }
      // 새로운 랜덤한 5자리 숫자 생성
      const verificationCode = Math.floor(10000 + Math.random() * 90000);
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "jamda831@gmail.com",
          pass: "nhvluiqogrktkieu",
        },
      });
      const mailOptions = {
        to: email,
        subject: "이메일 인증",
        html: `    <div style="margin: 5%; margin-bottom: 6px;"><p style="width: 50%; color:#FF6666; font-weight: bolder; font-size: 50px; margin-bottom: 0">JAMDA</p></div>
        <div style="height: 2px; width: 90%; margin-left: 5%; background-color: #FF8585;"></div>
        <h2 style="margin-left: 5%; margin-top: 30px; margin-bottom: 30px;">고객님의 인증번호는 다음과 같습니다.</h2>
        <div style=" height: 230px; width: 90%; margin-left: 5%; border: 2px solid #C1C1C1">
            <p style="color: #6B6B6B; text-align: center;">아래 인증번호 5자리를 인증번호 입력창에 입력해주세요</p>
            <div style="text-align: center; font-size: 80px; vertical-align: middle; letter-spacing: 10px;">${verificationCode}</div>
        </div>
        <p style="margin-left: 5%; margin-top: 20px;">
            인증번호를 요청하지 않았다면 이 메일을 무시하셔도 됩니다.<br>
            누군가 귀하의 이메일 주소를 잘못 입력한 것을 수도 있습니다.<br>
            <br>
            감사합니다.
        </p>`,
      };
      const insertAuthCodeSql = 'INSERT INTO verification_codes (email, code) VALUES (?, ?)';
      connection.query(insertAuthCodeSql, [email, verificationCode], async (insertErr, insertResult) => {
        if (insertErr) {
          console.error(insertErr);
          return res.status(500).json({ error: '이메일을 발송하는 중 오류가 발생하였습니다.' });
        }
        try {
          const info = await transporter.sendMail(mailOptions);
          console.log(info);
          return res.status(200).json({ message: "이메일이 성공적으로 전송되었습니다." });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: "이메일 전송 중에 오류가 발생했습니다." });
        }
      });
    });
};

// 인증번호 확인 함수
exports.checkAuthCode = (req, res) => {
    const { email, code } = req.body;
    
    // 사용자가 입력한 이메일과 인증번호를 검색하여 확인
    const checkAuthCodeSql = 'SELECT * FROM verification_codes WHERE email = ? AND code = ?';
    connection.query(checkAuthCodeSql, [email, code], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error checking auth code' });
        return;
      }
      // 결과에서 매치되는 레코드를 찾지 못하면 인증 실패
      if (result.length === 0) {
        res.status(201).json({ message: '인증번호가 일치하지 않습니다.' });
        console.log(result);
        return;
      }
      // 인증 성공
      return res.status(200).json({ message: '인증번호가 확인되었습니다.' });
    });
};
