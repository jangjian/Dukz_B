const express = require('express');
const app = express();
const PORT = 3000;

// get을 이용해서 요청을 보냄 
app.get('/', (req, res)=>{
  res.send('Hello world');
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});