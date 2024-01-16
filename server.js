const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const PORT = 3000;
const userRoutes = require('./routes/user_route.js');

app.use(cors());
app.use(bodyParser.json())
app.use('/user', userRoutes);

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});