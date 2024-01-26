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

// 이메일 중복 확인 컨트롤러
exports.emailDuplicate = (req, res) => {
  const { email } = req.body;
  const checkDuplicateSql = 'SELECT COUNT(*) AS count FROM user WHERE email = ?';
  connection.query(checkDuplicateSql, [email], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error checking duplicate user' });
      return;
    }
    res.status(200).json({ isDuplicate: result[0].count > 0 });
  });
};

// 회원가입 컨트롤러 2 (아이디)
exports.signup2 = (req, res) => {
    const { email, userid } = req.body;
  
    const sql = 'UPDATE user SET userid = ? WHERE email = ?';
    connection.query(sql, [userid, email], (err, updateResult) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating user information' });
        return;
      }
      res.status(200).json({ message: 'User registered successfully' });
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

// 회원가입 컨트롤러 3 (비밀번호)
exports.signup3 = (req,res) => {
  const {email, pw} = req.body;
  const sql = 'UPDATE user SET pw = ? WHERE email = ?';
  connection.query(sql, [pw, email], (err, updateResult)=>{
    if(err){
      console.error(err);
      res.status(500).json({ error: 'Error updating user information' });
        return;
      }
      res.status(200).json({ message: 'User registered successfully' });
  })
};

// 회원가입 컨트롤러 4 (닉네임)
exports.signup4 = (req,res) => {
  const {email, name} = req.body;
  const sql = 'UPDATE user SET name = ? WHERE email = ?';
  connection.query(sql, [name, email], (err, updateResult)=>{
    if(err){
      console.error(err);
      res.status(500).json({ error: 'Error updating user information' });
        return;
      }
      res.status(200).json({ message: 'User registered successfully' });
  })
};

// 회원가입 및 이미지 업로드 (컨트롤러)
exports.signup5 = (req, res) => {
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
        const {email} = req.body;
        const sql = 'UPDATE user SET image_url = ? WHERE email = ?';
        connection.query(sql, [image_url, email], (err, updateResult) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error updating user information' });
                return;
            }
            res.status(200).json({ success: true, message: 'User registered successfully', image_url });
        });
    });
};

// 회원가입 컨트롤러 6 (생년월일)
exports.signup6 = (req,res) => {
  const {email, birth} = req.body;
  const sql = 'UPDATE user SET birth = ? WHERE email = ?';
  connection.query(sql, [birth, email], (err, updateResult)=>{
    if(err){
      console.error(err);
      res.status(500).json({ error: 'Error updating user information' });
        return;
      }
      res.status(200).json({ message: 'User registered successfully' });
  })
};

// 사용자의 장르 선호를 저장하는 컨트롤러
exports.signup7 = (req, res) => {
  const { email, genres } = req.body;

  const getUserIdQuery = 'SELECT id FROM user WHERE email = ?';
  connection.query(getUserIdQuery, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving user information' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = result[0].id;

    const insertGenresQuery = 'INSERT INTO UserGenrePreference (userId, genreId) VALUES ?';
    const values = genres.map((genreId) => [userId, genreId]);

    connection.query(insertGenresQuery, [values], (insertErr) => {
      if (insertErr) {
        console.error(insertErr);
        return res.status(500).json({ error: 'Error inserting genre preferences' });
      }

      res.status(200).json({ message: 'Genre preferences saved successfully' });
    });
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
        html: `    <div style="margin: 5%; margin-bottom: 6px;"><p style="width: 50%; color:#F8AC0B; font-weight: bolder; font-size: 50px; margin-bottom: 0">Duk'z</p></div>
        <div style="height: 2px; width: 90%; margin-left: 5%; background-color: #F8AC0B;"></div>
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

// 로그인 컨트롤러
exports.login = (req, res) => {
  const { userid, pw } = req.body;
    const token = randomstring.generate(40);
    const sql = 'SELECT * FROM user WHERE userid = ? AND pw = ?';
    connection.query(sql, [userid, pw], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        return;
      }
      if (result.length === 0) {
        res.status(401).json({ error: '잘못된 자격 증명' });
        return;
      }
      const userData = {
        userid: result[0].userid,
        token: token,
        hasProfile: result[0].hasProfile, 
      };
      // 사용자 정보에 토큰 업데이트
      connection.query('UPDATE user SET accesstoken = ? WHERE userid = ?', [token, userid], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          res.status(500).json({ error: '토큰 업데이트 중 오류가 발생했습니다.' });
          return;
        }
        res.status(200).json(userData);
      });
  });
};

// 사용자 정보 불러오기
exports.getName = (req, res) => {
  const { userid } = req.body;

  const getUserRulesSql = 'SELECT name FROM user WHERE userid = ?';
  connection.query(getUserRulesSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: '이미지를 불러오던 중 오류가 발생했습니다.' });
      return;
    }

    const userName = result[0].name;
    
    res.status(200).json({
      name: userName
    });
  });
};

// 일지를 저장하는 컨트롤러
exports.saveDiary = (req, res) => {
  const { title, content, subtitle, userid, regionId } = req.body;
  const createDate = new Date();

  // 1. 사용자 정보 조회
  const getUserIdQuery = 'SELECT id FROM user WHERE userid = ?';
  connection.query(getUserIdQuery, [userid], (userErr, userResult) => {
    if (userErr) {
      console.error(userErr);
      return res.status(500).json({ error: 'Error retrieving user information' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult[0].id;

    // 2. 일지 저장
    const saveDiaryQuery = 'INSERT INTO diary (title, content, subtitle, createDate, regionId) VALUES (?, ?, ?, ?, ?)';
    const diaryValues = [title, content, subtitle, createDate, regionId];

    connection.query(saveDiaryQuery, diaryValues, (diaryErr, diaryResult) => {
      if (diaryErr) {
        console.error(diaryErr);
        return res.status(500).json({ error: 'Error saving diary' });
      }

      const diaryId = diaryResult.insertId;

      // 3. 지역 정보 저장
      const saveRegionQuery = 'INSERT INTO diaryregion (diaryId, userId, regionId) VALUES (?, ?, ?)';
      const regionValues = [diaryId, userId, regionId];

      connection.query(saveRegionQuery, regionValues, (regionErr) => {
        if (regionErr) {
          console.error(regionErr);
          return res.status(500).json({ error: 'Error saving region information' });
        }

        res.status(200).json({ message: 'Diary and region information saved successfully' });
      });
    });
  });
};

// 일지의 장르 정보 저장 컨트롤러
exports.saveDiaryGenre = (req, res) => {
  const { diaryId, genreId } = req.body;

  // DiaryGenre 테이블에 일지의 장르 정보 저장
  const insertDiaryGenreQuery = 'INSERT INTO DiaryGenre (diaryId, genreId) VALUES (?, ?)';
  const values = [diaryId, genreId];

  connection.query(insertDiaryGenreQuery, values, (insertErr) => {
    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ error: 'Error inserting diary genre information' });
    }

    res.status(200).json({ message: 'Diary genre information saved successfully' });
  });
};

// 카드뉴스 저장 컨트롤러
exports.saveCardNews = (req, res) => {
  const { title, place, open_time, close_time, price, image_url, userid } = req.body;
  const createDate = new Date();

  // 1. 사용자 정보 조회
  const getUserInfoQuery = 'SELECT * FROM user WHERE userid = ?';
  connection.query(getUserInfoQuery, [userid], (userErr, userResult) => {
    if (userErr) {
      console.error(userErr);
      return res.status(500).json({ error: 'Error retrieving user information' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. 카드뉴스 저장
    const saveCardNewsQuery = 'INSERT INTO cardNews (title, place, open_time, close_time, price, image_url, createDate, userid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const cardNewsValues = [title, place, open_time, close_time, price, image_url, createDate, userid];

    connection.query(saveCardNewsQuery, cardNewsValues, (cardNewsErr, cardNewsResult) => {
      if (cardNewsErr) {
        console.error(cardNewsErr);
        return res.status(500).json({ error: 'Error saving card news' });
      }

      const cardNewsId = cardNewsResult.insertId;

      // 3. 클라이언트에게 전달
      res.status(200).json({ message: 'Card news saved successfully', cardNewsId });
    });
  });
};

// 사용자의 선호하는 장르 기반으로 추천 일지 가져오기
exports.getRecommendedDiaries = (req, res) => {
  const { userid } = req.body;

  // 1. 사용자의 선호하는 장르 가져오기
  const getUserGenresQuery = 'SELECT genreId FROM UserGenrePreference WHERE userId = ?';
  connection.query(getUserGenresQuery, [userid], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving user genre preferences' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'User genre preferences not found' });
    }

    // 2. 장르별 일지 가져오기
    const genreIds = result.map((row) => row.genreId);
    const getDiariesByGenresQuery = 'SELECT DISTINCT diaryId FROM DiaryGenre WHERE genreId IN (?)';
    connection.query(getDiariesByGenresQuery, [genreIds], (diaryErr, diaryResult) => {
      if (diaryErr) {
        console.error(diaryErr);
        return res.status(500).json({ error: 'Error retrieving diaries by genres' });
      }

      if (diaryResult.length === 0) {
        return res.status(404).json({ error: 'No diaries found for the specified genres' });
      }

      // 3. 추천 로직 적용 (예시: 간단하게 처음 일지 선택)
      const recommendedDiaryId = diaryResult[0].diaryId;

      // 4. 클라이언트에게 전달
      return res.status(200).json({ recommendedDiaryId });
    });
  });
};

// 사용자 이미지 URL 불러오기 컨트롤러
exports.getUrl = (req, res) => {
  const { userid } = req.body;

  const getUserImageQuery = 'SELECT image_url FROM user WHERE userid = ?';
  
  connection.query(getUserImageQuery, [userid], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving user image URL' });
    }

    // 결과에서 이미지 URL 가져오기
    if (result.length === 0 || !result[0].image_url) {
      const defaultImageUrl = '/default-profile-image.jpg';
      return res.status(200).json({ imageUrl: defaultImageUrl });
    }

    const imageUrl = result[0].image_url;

    res.status(200).json({ imageUrl });
  });
};

// 카드뉴스 불러오기 컨트롤러
exports.getAllCardNews = (req, res) => {
  const getCardNewsQuery = 'SELECT * FROM cardNews ORDER BY createDate DESC';

  connection.query(getCardNewsQuery, (cardNewsErr, cardNewsResult) => {
    if (cardNewsErr) {
      console.error(cardNewsErr);
      return res.status(500).json({ error: '카드 뉴스를 가져오는 중 오류가 발생했습니다.' });
    }

    if (cardNewsResult.length === 0) {
      return res.status(404).json({ error: '카드 뉴스를 찾을 수 없습니다.' });
    }

    // 모든 카드뉴스를 가져올 때는 배열에 담아서 전송
    const allCardNewsPromises = cardNewsResult.map(cardNews => {
      return new Promise((resolve, reject) => {
        getUserInfo(cardNews.userid)
          .then(userInfo => {
            getHashtagsForCardNews(cardNews.cardNewsId)
              .then((hashtags) => {
                const cardNewsData = {
                  cardNews,
                  userInfo,
                  hashtags,
                };
                resolve(cardNewsData);
              })
              .catch((error) => {
                console.error("Error fetching hashtags:", error);
                reject(error);
              });
          })
          .catch(error => {
            console.error(error);
            reject(error);
          });
      });
    });

    Promise.all(allCardNewsPromises)
      .then(allCardNews => {
        res.status(200).json(allCardNews);
      })
      .catch(error => {
        res.status(500).json({ error: '사용자 정보 및 해시태그를 가져오는 중 오류가 발생했습니다.' });
      });
  });
};


// 도우미 함수
function getUserInfo(userid) {
  return new Promise((resolve, reject) => {
    const getUserInfoQuery = 'SELECT * FROM user WHERE userid = ?';

    connection.query(getUserInfoQuery, [userid], (userErr, userResult) => {
      if (userErr) {
        reject(userErr);
      }

      if (userResult.length === 0) {
        reject('사용자를 찾을 수 없습니다.');
      }

      const userInfo = {
        nickname: userResult[0].name,
        profileImage: userResult[0].image_url,
      };

      resolve(userInfo);
    });
  });
}

// 도우미 함수: 카드뉴스에 연결된 해시태그 불러오기
function getHashtagsForCardNews(cardNewsId) {
  return new Promise((resolve, reject) => {
    const getHashtagsQuery = `
      SELECT tag.hashtag
      FROM cardNewsHashtags
      JOIN tag ON cardNewsHashtags.hashtagId = tag.tagid
      WHERE cardNewsHashtags.cardNewsId = ?;
    `;

    connection.query(getHashtagsQuery, [cardNewsId], (hashtagsErr, hashtagsResult) => {
      if (hashtagsErr) {
        reject(hashtagsErr);
        return;
      }

      // 결과에서 해시태그 가져오기
      const hashtags = hashtagsResult.map(tag => tag.hashtag);

      resolve(hashtags);
    });
  });
}

// ID 변경 컨트롤러
exports.changeUserId = (req, res) => {
  const { userid, id } = req.body;

  const updateUserIdSql = 'UPDATE user SET userid = ? WHERE userid = ?';
  connection.query(updateUserIdSql, [id, userid], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user ID' });
      return;
    }
    const updateCardNewsUserIdSql = 'UPDATE cardnews SET userid = ? WHERE userid = ?';
    connection.query(updateCardNewsUserIdSql, [id, userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
      }
    });
    res.status(200).json({ message: '사용자 ID가 성공적으로 변경되었습니다.' });
  });
};

// pw 변경 컨트롤러
exports.changeUserPw = (req, res) => {
  const { userid, pw } = req.body;

  const updateUserIdSql = 'UPDATE user SET pw = ? WHERE userid = ?';
  connection.query(updateUserIdSql, [pw, userid], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user ID' });
      return;
    }
    res.status(200).json({ message: '사용자 ID가 성공적으로 변경되었습니다.' });
  });
};

// 비밀번호 테스트 컨트롤러
exports.passwordTest = (req, res) => {
  const { userid, pw } = req.body;
    const sql = 'SELECT * FROM user WHERE userid = ? AND pw = ?';
    connection.query(sql, [userid, pw], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: '오류가 발생했습니다.' });
        return;
      }
      if (result.length === 0) {
        res.status(401).json({ error: '잘못된 자격 증명' });
        return;
      }
      res.status(200).json({ message: 'This is the correct password' });
  });
};




