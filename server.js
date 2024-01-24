const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const PORT = 3000;
const path = require('path');
const userRoutes = require('./routes/user_route.js');

app.use(cors());
app.use(bodyParser.json())
app.use('/user', userRoutes);

// uploads 디렉토리를 정적 파일로 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});