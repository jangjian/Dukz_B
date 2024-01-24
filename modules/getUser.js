const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'database-1.c7gky688wshv.ap-northeast-3.rds.amazonaws.com',
    user: 'root',
    password: 'yopamipa7541',
    database: 'dukz_db'
});

const getUser = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        console.log('Token not found in headers');
        return res.status(401).json({ message: 'Unauthorized: Token not found' });
    }

    const sql = 'SELECT * FROM user WHERE accesstoken = ?';
    connection.query(sql, [token], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error querying the database' });
        }

        if (result.length > 0) {
            req.user = result[0];
            next();
        } else {
            console.log('User not found with the given token');
            return res.status(404).json({ message: 'User Not Found!' });
        }
    });
};

exports.getUser = getUser;
