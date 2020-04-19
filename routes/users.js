const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.SECRET;

// ------------------------ EXPRESS MIDDLEWARES --------------------------
// Check if user's token is valid
const isLoggedIn = async (req, res, next) => {
  try {
    //Slice to remove 'Bearer' in front of our token
    const authHeaderValue = req.headers.authorization.slice(7);

    const token = jwt.verify(authHeaderValue, SECRET);
    const username = jwt.decode(authHeaderValue).username;

    const user = await db.query('SELECT * FROM users WHERE username=$1', [
      username,
    ]);

    req.username = username;
    req.user_id = user.rows[0].id;

    // return res.json(user.username);
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// -------------------------- USER ROUTES ---------------------------
//Get list of all users
router.get('/', isLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE username=$1', [
      req.username,
    ]);
    return res.json(result.rows);
  } catch (e) {
    return next(e);
  }
});

router.get('/testing', async (req, res, next) => {
  try {
    return res.json({ message: 'Successful' });
  } catch (e) {
    return next(e);
  }
});

router.post('/signup', async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [req.body.username, req.body.email, hashedPassword]
    );

    const token = jwt.sign(
      {
        username: req.body.username,
      },
      SECRET,
      { expiresIn: 60 * 60 }
    );

    return res.json({ token });
  } catch (e) {
    return next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const foundUser = await db.query(
      'SELECT * FROM users WHERE username=$1 LIMIT 1',
      [req.body.username]
    );

    if (foundUser.rows.length === 0) {
      return res.json({ message: 'Invalid Username' });
    }

    const verifiedPw = await bcrypt.compare(
      req.body.password,
      foundUser.rows[0].password
    );

    if (verifiedPw === false) {
      return res.json({ message: 'Invalid Password' });
    }

    const token = jwt.sign({ username: foundUser.rows[0].username }, SECRET, {
      expiresIn: 60 * 60,
    });

    return res.json({ token });
  } catch (e) {
    return next(e);
  }
});

router.get('/income', isLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id=$1', [
      req.user_id,
    ]);

    return res.json(result.rows[0])
  } catch (e) {
    return next(e);
  }
});

router.post('/income', isLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE users SET income_total=$2 WHERE id=$1 RETURNING *',
      [req.user_id, req.body.income_total]
    );

    return res.json(result.rows[0]);
  } catch (e) {
    return next(e);
  }
});

// router.delete('/');

// router.patch('/');

module.exports = router;
