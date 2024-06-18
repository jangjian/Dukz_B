const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1011',
  database: 'dukz_db'
});


const app = express();

// body-parser를 사용하여 페이로드 크기 제한을 늘립니다.
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

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

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).array('images', 10);

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

      const hashtags = hashtagsResult.map(tag => tag.hashtag);

      resolve(hashtags);
    });
  });
}

// 카드뉴스 저장 API
exports.saveCardNews = (req, res) => {
  upload(req, res, function (uploadErr) {
    if (uploadErr) {
      console.error('Upload Error:', uploadErr);
      return res.status(500).json({ error: 'Error uploading image', details: uploadErr.message });
    }
    
    const { place, open_time, close_time, price, userid, card_review, star, hashtags } = req.body;
    const image_urls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    console.log("Image URLs:", image_urls);
    console.log("Hashtags:", hashtags);

    const saveCardNewsQuery = 'INSERT INTO cardNews (title, place, open_time, close_time, price, image_url, userid, card_review, star) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const cardNewsValues = [place, place, open_time, close_time, price, image_urls.join(','), userid, card_review, star];

    connection.query(saveCardNewsQuery, cardNewsValues, (cardNewsErr, cardNewsResult) => {
        if (cardNewsErr) {
            console.error(cardNewsErr);
            return res.status(500).json({ error: 'Error saving card news' });
        }

        const cardNewsId = cardNewsResult.insertId;
        const hashtagArray = Array.isArray(hashtags) ? hashtags : JSON.parse(hashtags); // Parse JSON string to array

        const saveHashtags = (tag, callback) => {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                return callback(null); // Skip invalid tags
            }

            const insertTagQuery = 'INSERT INTO tag (hashtag) VALUES (?) ON DUPLICATE KEY UPDATE tagid=LAST_INSERT_ID(tagid)';
            connection.query(insertTagQuery, [tag], (tagErr, tagResult) => {
                if (tagErr) return callback(tagErr);
                const tagId = tagResult.insertId;

                const insertCardNewsHashtagQuery = 'INSERT INTO cardNewsHashtags (cardNewsId, hashtagId) VALUES (?, ?)';
                connection.query(insertCardNewsHashtagQuery, [cardNewsId, tagId], callback);
            });
        };

        let completed = 0;
        const total = Math.min(hashtagArray.length, 3);
        for (let i = 0; i < total; i++) {
            saveHashtags(hashtagArray[i], (hashtagErr) => {
                if (hashtagErr) {
                    console.error('Error saving hashtag:', hashtagErr);
                    return res.status(500).json({ error: 'Error saving hashtags', details: hashtagErr.message });
                }
                completed++;
                if (completed === total) {
                    res.status(200).json({ message: 'Card news saved successfully with hashtags', cardNewsId });
                }
            })
        }
    });
  });
};

// 스케줄 아이템 저장 API
exports.saveScheduleItem = (req, res) => {
  const { scheduleId, dayId, startTime, endTime, cardNewsId } = req.body;

  // 스케줄 아이템 저장
  const saveScheduleItemQuery = 'INSERT INTO scheduleItem (scheduleId, dayId, startTime, endTime, cardNewsId) VALUES (?, ?, ?, ?, ?)';
  const scheduleItemValues = [scheduleId, dayId, startTime, endTime, cardNewsId];

  connection.query(saveScheduleItemQuery, scheduleItemValues, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error saving schedule item' });
      return;
    }

    res.status(200).json({ message: 'Schedule item saved successfully', scheduleItemId: result.insertId });
  });
};

// 모든 일지 가져오기 (createDate 및 내용 포함)
exports.getAllDiaries = (req, res) => {
  const getAllDiariesQuery = 'SELECT diaryId, createDate FROM diary ORDER BY diaryId ASC';
  
  connection.query(getAllDiariesQuery, async (err, diaryResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving all diaries' });
    }

    if (diaryResult.length === 0) {
      return res.status(404).json({ error: 'No diaries found' });
    }

    try {
      // 클라이언트에게 전송할 데이터 생성
      const formattedDiaries = await Promise.all(diaryResult.map(async (diary) => {
        const diaryId = diary.diaryId;
        const createDate = new Date(diary.createDate); // MySQL에서 직접 불러온 createDate를 Date 객체로 변환

        const formattedCreateDate = `${createDate.getFullYear()}-${String(createDate.getMonth() + 1).padStart(2, '0')}-${String(createDate.getDate()).padStart(2, '0')} ${String(createDate.getHours()).padStart(2, '0')}:${String(createDate.getMinutes()).padStart(2, '0')}:${String(createDate.getSeconds()).padStart(2, '0')}`;

        const getDiaryContentQuery = 'SELECT * FROM diaryContent WHERE diaryId = ? ORDER BY diaryId ASC';
        
        const contentQueryResult = await new Promise((resolve, reject) => {
          connection.query(getDiaryContentQuery, [diaryId], async (contentErr, contentResult) => {
            if (contentErr) {
              reject(contentErr);
            } else {
              // contentType이 cardNews인 경우에 대한 처리 추가
              for (let i = 0; i < contentResult.length; i++) {
                if (contentResult[i].contentType === 'cardNews') {
                  const cardNewsId = contentResult[i].cardNewsId;
                  // cardNewsId를 사용하여 cardNews의 내용을 가져오는 함수 호출
                  const cardNewsContent = await getCardNewsContent(cardNewsId);
                  contentResult[i].cardNews = cardNewsContent;
                }
              }
              resolve(contentResult);
            }
          });
        });

        // diaryId와 formattedCreateDate를 포함한 일지 내용 반환
        return {
          diaryId: diary.diaryId,
          createDate: formattedCreateDate,
          content: contentQueryResult // diaryId에 해당하는 모든 내용
        };
      }));

      // 모든 formattedDiaries 작업이 완료되면 클라이언트에게 응답을 보냄
      res.status(200).json({ diaries: formattedDiaries });
    } catch (error) {
      console.error('Error retrieving diary contents:', error);
      res.status(500).json({ error: 'Error retrieving diary contents' });
    }
  });
};

// cardNewsId를 사용하여 cardNews의 내용을 가져오는 함수 정의
async function getCardNewsContent(cardNewsId) {
  return new Promise((resolve, reject) => {
    const getCardNewsQuery = 'SELECT * FROM cardNews WHERE cardNewsId = ?';

    connection.query(getCardNewsQuery, [cardNewsId], (cardNewsErr, cardNewsResult) => {
      if (cardNewsErr) {
        reject(cardNewsErr);
      } else {
        if (cardNewsResult.length === 0) {
          resolve(null); // 해당 cardNewsId에 대한 데이터가 없을 경우 null 반환
        } else {
          // cardNews 데이터 반환
          resolve(cardNewsResult[0]);
        }
      }
    });
  });
}

// 사용자가 선택한 일지 가져오기
exports.getDiary = (req, res) => {
  const { diaryId } = req.body;

  const getUserQuery = 'SELECT userId, DATE_FORMAT(createDate, "%Y-%m-%d %H:%i:%s") AS createDate FROM diary WHERE diaryId = ?';
  connection.query(getUserQuery, [diaryId], async (err, userResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving user ID' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult[0].userId;
    const createDate = userResult[0].createDate; 

    // 2. 사용자의 이름 가져오기
    const getUserNameQuery = 'SELECT name FROM user WHERE id = ?';
    connection.query(getUserNameQuery, [userId], async (nameErr, nameResult) => {
      if (nameErr) {
        console.error(nameErr);
        return res.status(500).json({ error: 'Error retrieving user name' });
      }

      if (nameResult.length === 0) {
        return res.status(404).json({ error: 'User name not found' });
      }

      const userName = nameResult[0].name;

      // 3. 선택한 일지의 내용 가져오기
      const getDiaryContentQuery = 'SELECT * FROM diaryContent WHERE diaryId = ? ORDER BY diaryId ASC';
      connection.query(getDiaryContentQuery, [diaryId], async (diaryErr, diaryResult) => {
        if (diaryErr) {
          console.error(diaryErr);
          return res.status(500).json({ error: 'Error retrieving diary content' });
        }

        if (diaryResult.length === 0) {
          return res.status(404).json({ error: 'No diary content found for the specified diaryId' });
        }

        // Handle cardNews content
        for (let i = 0; i < diaryResult.length; i++) {
          if (diaryResult[i].contentType === 'cardNews') {
            const cardNewsId = diaryResult[i].cardNewsId;
            try {
              const cardNewsContent = await getCardNewsContent(cardNewsId);
              diaryResult[i].cardNews = cardNewsContent;
            } catch (error) {
              console.error('Error fetching cardNews content:', error);
              return res.status(500).json({ error: 'Error retrieving cardNews content' });
            }
          }
        }

        const groupedDiaries = diaryResult.reduce((acc, content) => {
          if (!acc[content.diaryId]) {
            acc[content.diaryId] = [];
          }
          acc[content.diaryId].push(content);
          return acc;
        }, {});

        const groupedDiariesArray = Object.values(groupedDiaries);

        // Format createDate
        const formattedCreateDate = new Date(createDate);
        const formattedDate = `${formattedCreateDate.getFullYear()}-${String(formattedCreateDate.getMonth() + 1).padStart(2, '0')}-${String(formattedCreateDate.getDate()).padStart(2, '0')} ${String(formattedCreateDate.getHours()).padStart(2, '0')}:${String(formattedCreateDate.getMinutes()).padStart(2, '0')}:${String(formattedCreateDate.getSeconds()).padStart(2, '0')}`;

        res.status(200).json({ recommendedDiaries: groupedDiariesArray, name: userName, createDate: formattedDate });
      });
    });
  });
};

// 사용자의 선호하는 장르 기반으로 추천 일지 가져오기
exports.getRecommendedDiaries = (req, res) => {
  const { userid } = req.body;

  // 1. 사용자의 id 가져오기
  const getUserQuery = 'SELECT id FROM user WHERE userid = ?';
  connection.query(getUserQuery, [userid], (err, userResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error retrieving user ID' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult[0].id;

    // 2. 사용자의 선호하는 장르 가져오기
    const getUserGenresQuery = 'SELECT genreId FROM UserGenrePreference WHERE userId = ?';
    connection.query(getUserGenresQuery, [userId], (genreErr, genreResult) => {
      if (genreErr) {
        console.error(genreErr);
        return res.status(500).json({ error: 'Error retrieving user genre preferences' });
      }

      if (genreResult.length === 0) {
        return res.status(404).json({ error: 'User genre preferences not found' });
      }

      // 장르 ID 배열 생성
      const genreIds = genreResult.map((row) => row.genreId);

      // 3. 장르별 일지 가져오기
      const getDiariesByGenresQuery = 'SELECT DISTINCT diaryId FROM diarygenre WHERE genreId IN (?)';
      connection.query(getDiariesByGenresQuery, [genreIds], async (diaryErr, diaryResult) => {
        if (diaryErr) {
          console.error(diaryErr);
          return res.status(500).json({ error: 'Error retrieving diaries by genres' });
        }

        if (diaryResult.length === 0) {
          return res.status(404).json({ error: 'No diaries found for the specified genres' });
        }

        // diaryResult에서 추출된 diaryId 배열 생성
        const diaryIds = diaryResult.map((row) => row.diaryId);

        // 4. 추천 일지의 내용 가져오기
        const getDiaryContentsQuery = 'SELECT * FROM diaryContent WHERE diaryId IN (?) ORDER BY diaryId ASC';
        connection.query(getDiaryContentsQuery, [diaryIds], async (contentErr, contentResult) => {
          if (contentErr) {
            console.error(contentErr);
            return res.status(500).json({ error: 'Error retrieving diary contents' });
          }

          // Handle cardNews content if contentType is 'cardNews'
          for (let i = 0; i < contentResult.length; i++) {
            if (contentResult[i].contentType === 'cardNews') {
              const cardNewsId = contentResult[i].cardNewsId;
              try {
                const cardNewsContent = await getCardNewsContent(cardNewsId);
                contentResult[i].cardNews = cardNewsContent;
              } catch (error) {
                console.error('Error fetching cardNews content:', error);
                return res.status(500).json({ error: 'Error retrieving cardNews content' });
              }
            }
          }

          // diaryId를 기준으로 그룹화
          const groupedDiaries = contentResult.reduce((acc, content) => {
            if (!acc[content.diaryId]) {
              acc[content.diaryId] = [];
            }
            acc[content.diaryId].push(content);
            return acc;
          }, {});

          // 배열 형태로 변환
          const groupedDiariesArray = Object.values(groupedDiaries);

          // 모든 작업이 완료되면 클라이언트에 응답 보내기
          res.status(200).json({ recommendedDiaries: groupedDiariesArray });
        });
      });
    });
  });
};

// 사용자의 일지 가져오기
exports.getUserDiary = (req, res) => {
  const { userid } = req.body;

  // 1. 사용자의 id 가져오기
  const getUserQuery = 'SELECT id FROM user WHERE userid = ?';
  connection.query(getUserQuery, [userid], (err, userResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '사용자 ID를 가져오는 중 오류가 발생했습니다' });
    }

    if (userResult.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const userId = userResult[0].id;

    // 2. 사용자가 작성한 모든 일지의 ID와 생성일자 가져오기
    const getUserDiariesQuery = 'SELECT DISTINCT d.diaryId, d.createDate FROM diary d INNER JOIN diaryContent dc ON d.diaryId = dc.diaryId WHERE d.userId = ?';
    connection.query(getUserDiariesQuery, [userId], (diaryErr, diaryResult) => {
      if (diaryErr) {
        console.error(diaryErr);
        return res.status(500).json({ error: '사용자의 일지를 가져오는 중 오류가 발생했습니다' });
      }

      if (diaryResult.length === 0) {
        return res.status(404).json({ error: '해당 사용자의 일지가 없습니다' });
      }

      // diaryResult에서 추출된 diaryId와 createDate 배열 생성
      const userDiaries = diaryResult.map(row => ({
        diaryId: row.diaryId,
        createDate: row.createDate,
        contents: [] // 각 일지의 내용을 저장할 배열
      }));

      // diaryId 배열 생성
      const diaryIds = userDiaries.map(diary => diary.diaryId);

      // 3. 사용자가 작성한 모든 일지의 내용 가져오기
      const getDiaryContentsQuery = 'SELECT * FROM diaryContent WHERE diaryId IN (?) ORDER BY diaryId ASC';
      connection.query(getDiaryContentsQuery, [diaryIds], async (contentErr, contentResult) => {
        if (contentErr) {
          console.error(contentErr);
          return res.status(500).json({ error: '일지의 내용을 가져오는 중 오류가 발생했습니다' });
        }

        // Handle cardNews content if contentType is 'cardNews'
        for (let i = 0; i < contentResult.length; i++) {
          if (contentResult[i].contentType === 'cardNews') {
            const cardNewsId = contentResult[i].cardNewsId;
            try {
              const cardNewsContent = await getCardNewsContent(cardNewsId);
              contentResult[i].cardNews = cardNewsContent;
            } catch (error) {
              console.error('카드뉴스 내용을 불러오는 중 오류가 발생했습니다:', error);
              return res.status(500).json({ error: '카드뉴스 내용을 가져오는 중 오류가 발생했습니다' });
            }
          }
        }

        // diaryId를 기준으로 각 일지의 내용 그룹화
        contentResult.forEach(content => {
          const diaryIndex = userDiaries.findIndex(diary => diary.diaryId === content.diaryId);
          if (diaryIndex !== -1) {
            userDiaries[diaryIndex].contents.push({
              contentId: content.contentId,
              contentType: content.contentType,
              content: content.content,
              align: content.align,
              imageSrc: content.imageSrc,
              cardNewsId: content.cardNewsId,
              cardNews: content.cardNews // 카드뉴스 내용 추가
            });
          }
        });

        // createDate를 원하는 포맷으로 변환하여 userDiaries에 포함시킴
        userDiaries.forEach(diary => {
          const formattedCreateDate = new Date(diary.createDate);
          diary.createDate = `${formattedCreateDate.getFullYear()}-${String(formattedCreateDate.getMonth() + 1).padStart(2, '0')}-${String(formattedCreateDate.getDate()).padStart(2, '0')} ${String(formattedCreateDate.getHours()).padStart(2, '0')}:${String(formattedCreateDate.getMinutes()).padStart(2, '0')}:${String(formattedCreateDate.getSeconds()).padStart(2, '0')}`;
        });

        // 모든 작업이 완료되면 클라이언트에 응답 보내기
        res.status(200).json({ 사용자의_일지: userDiaries });
      });
    });
  });
};


// 사용자 이미지 URL 불러오기 API
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

// 카드뉴스 불러오기 API
exports.getCardNews = (req, res) => {
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

// 회원가입 API(이메일)
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

// 이메일 중복 확인 API
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

// 회원가입 API 2 (아이디)
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

// 아이디 중복 확인 API
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

// 회원가입 API 3 (비밀번호)
exports.signup3 = (req, res) => {
  const { email, pw } = req.body;
  const sql = 'UPDATE user SET pw = ? WHERE email = ?';
  connection.query(sql, [pw, email], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user information' });
      return;
    }
    res.status(200).json({ message: 'User registered successfully' });
  })
};

// 회원가입 API 4 (닉네임)
exports.signup4 = (req, res) => {
  const { email, name } = req.body;
  const sql = 'UPDATE user SET name = ? WHERE email = ?';
  connection.query(sql, [name, email], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user information' });
      return;
    }
    res.status(200).json({ message: 'User registered successfully' });
  })
};

// 회원가입 및 이미지 업로드 (API)
exports.signup5 = (req, res) => {
  // 이미지 업로드 처리
  upload(req, res, function (uploadErr) {
    if (uploadErr instanceof multer.MulterError) {
      return res.status(500).json({ success: false, message: '이미지 업로드 실패', error: uploadErr.message });
    } else if (uploadErr) {
      console.error('Upload Error:', uploadErr);
      return res.status(500).json({ success: false, message: '서버 오류 발생', error: uploadErr.message });
    }

    const image_urls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const { email } = req.body;

    console.log('Email:', email);
    console.log('Image URLs:', image_urls);

    const imageUrlString = image_urls.join(',');

    const sql = 'UPDATE user SET image_url = ? WHERE email = ?';
    connection.query(sql, [imageUrlString, email], (err, updateResult) => {
      if (err) {
        console.error('DB Error:', err);
        res.status(500).json({ error: '사용자 정보 업데이트 오류', errorDetails: err });
        return;
      }

      console.log('DB Update Result:', updateResult);
      res.status(200).json({ success: true, message: 'User registered successfully', image_urls });
    });
  });
};

// 회원가입 API 6 (생년월일)
exports.signup6 = (req, res) => {
  const { email, birth } = req.body;
  const sql = 'UPDATE user SET birth = ? WHERE email = ?';
  connection.query(sql, [birth, email], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user information' });
      return;
    }
    res.status(200).json({ message: 'User registered successfully' });
  })
};

// 사용자의 장르 선호를 저장하는 API
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

// 이메일 인증 코드 요청 API
exports.certificate = async (req, res) => {
  const { email } = req.body;
  const deleteAuthCodeSql = 'DELETE FROM verification_codes WHERE email = ?';
  connection.query(deleteAuthCodeSql, [email], async (deleteErr, deleteResult) => {
    if (deleteErr) {
      console.error(deleteErr);
      return res.status(500).json({ error: '기존 인증 코드를 삭제하는 중 오류가 발생하였습니다.' });
    }
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

// 로그인 API
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

// 지역을 저장하는 API
exports.saveRegion = (req, res) => {
  const { regionName, userid } = req.body;

  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  // 사용자 정보 조회
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

    // 지역 ID 조회
    const getRegionIdQuery = 'SELECT id FROM region WHERE name = ?';
    connection.query(getRegionIdQuery, [regionName], (regionErr, regionResult) => {
      if (regionErr) {
        console.error(regionErr);
        return res.status(500).json({ error: 'Error retrieving region information' });
      }

      if (regionResult.length === 0) {
        return res.status(404).json({ error: 'Region not found' });
      }

      const regionId = regionResult[0].id;

      // 지역 정보 저장
      const saveDiaryQuery = 'INSERT INTO diary (userId, regionId) VALUES (?, ?)';
      const diaryValues = [userId, regionId];

      connection.query(saveDiaryQuery, diaryValues, (diaryErr, diaryResult) => {
        if (diaryErr) {
          console.error(diaryErr);
          return res.status(500).json({ error: 'Error saving diary information' });
        }

        res.status(200).json({ message: 'Region information saved successfully', diaryId: diaryResult.insertId });
      });
    });
  });
};

// 장르를 저장하는 API
exports.saveGenre = (req, res) => {
  const { diaryId, genres } = req.body;

  const insertGenresQuery = 'INSERT INTO diarygenre (diaryId, genreId) VALUES ?';
  const values = genres.map((genreId) => [diaryId, genreId]);

  connection.query(insertGenresQuery, [values], (insertErr) => {
    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ error: 'Error inserting genre preferences' });
    }

    res.status(200).json({ message: 'Genre preferences saved successfully' });
  });
};

// 일지 내용을 저장하는 API
exports.saveDiary = (req, res) => {
  upload(req, res, function (uploadErr) {
    if (uploadErr) {
      console.error('Upload Error:', uploadErr);
      return res.status(500).json({ error: 'Error uploading image', details: uploadErr.message });
    }

    const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const { diaryId, contents } = req.body;

    let parsedContents;
    try {
      parsedContents = JSON.parse(contents);
      if (!Array.isArray(parsedContents)) {
        throw new Error('Parsed contents is not an array');
      }
    } catch (parseErr) {
      console.error('Error parsing contents:', parseErr);
      return res.status(400).json({ error: 'Invalid contents format' });
    }

    const saveContent = (content, imageSrc, callback) => {
      const { contentType, contentText, align, cardNewsId } = content;

      const saveContentQuery = 'INSERT INTO diaryContent (diaryId, contentType, content, align, imageSrc, cardNewsId) VALUES (?, ?, ?, ?, ?, ?)';
      const contentValues = [diaryId, contentType, contentText, align, imageSrc, cardNewsId];

      connection.query(saveContentQuery, contentValues, (err, results) => {
        if (err) {
          console.error('Error executing query:', err);
          if (err.code !== 'ER_DATA_TOO_LONG') {
            return callback(err);
          }
        }
        callback(null, results);
      });
    };

    let remaining = parsedContents.length;
    const errors = [];

    parsedContents.forEach((content, index) => {
      let imageSrc = null;
      if (content.contentType === 'image' && imageUrls.length > 0) {
        imageSrc = imageUrls.shift();
      }

      saveContent(content, imageSrc, (contentErr) => {
        if (contentErr) {
          errors.push(contentErr);
        }
        remaining -= 1;
        if (remaining === 0) {
          if (errors.length > 0) {
            console.error(errors);
            res.status(500).json({ error: 'Error saving diary content', details: errors });
          } else {
            res.status(200).json({ message: 'Diary content saved successfully' });
          }
        }
      });
    });
  });
};

exports.saveSchedule = (req, res) => {
  const { userId, dayId, title } = req.body;

  const sql = 'INSERT INTO schedule (userId, dayId, title) VALUES (?, ?, ?)';
  connection.query(sql, [userId, dayId, title], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error saving schedule' });
    }

    const scheduleId = result.insertId;
    res.status(200).json({ message: 'Schedule saved successfully', scheduleId });
  });
};

// ID 변경 API
exports.changeUserId = (req, res) => {
  const { userid, id } = req.body;

  const updateUserIdSql = 'UPDATE user SET userid = ? WHERE userid = ?';
  connection.query(updateUserIdSql, [id, userid], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user ID' });
      return;
    }
    const updateCardNewsUserIdSql = 'UPDATE cardNews SET userid = ? WHERE userid = ?';
    connection.query(updateCardNewsUserIdSql, [id, userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
      }
    });
    res.status(200).json({ message: '사용자 ID가 성공적으로 변경되었습니다.' });
  });
};

// pw 변경 API
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

// 비밀번호 테스트 API
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

// 사용자 이미지 변경 API
exports.changeUserImage = (req, res) => {
  // 이미지 업로드 처리
  upload(req, res, function (uploadErr) {
    if (uploadErr instanceof multer.MulterError) {
      return res.status(500).json({ success: false, message: '이미지 업로드 실패' });
    } else if (uploadErr) {
      console.error('Upload Error:', uploadErr);
      return res.status(500).json({ success: false, message: '서버 오류 발생', error: uploadErr.message });
    }

    const newImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 기존 이미지를 가져오기 위한 쿼리
    const { userid } = req.body;
    const getOldImageUrlQuery = 'SELECT image_url FROM user WHERE userid = ?';
    connection.query(getOldImageUrlQuery, [userid], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error retrieving old image URL' });
        return;
      }

      const oldImageUrl = result[0].image_url;

      const updateUserInfoQuery = 'UPDATE user SET image_url = ? WHERE userid = ?';
      connection.query(updateUserInfoQuery, [newImageUrl, userid], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          res.status(500).json({ error: 'Error updating user image' });
          return;
        }

        // 이전 이미지 삭제
        if (oldImageUrl && oldImageUrl !== newImageUrl) {
          const oldImagePath = path.join(__dirname, oldImageUrl);
          fs.unlink(oldImagePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Error deleting old image:', unlinkErr);
            }
          });
        }

        res.status(200).json({ success: true, message: 'User image updated successfully', newImageUrl });
      });
    });
  });
};

// 닉네임 변경 API
exports.changeUserName = (req, res) => {
  const { userid, name } = req.body;

  const updateUserIdSql = 'UPDATE user SET name = ? WHERE userid = ?';
  connection.query(updateUserIdSql, [name, userid], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user ID' });
      return;
    }
    res.status(200).json({ message: '사용자 닉네임이 성공적으로 변경되었습니다.' });
  });
};



