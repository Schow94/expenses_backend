const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// installed dotenv from npm to get env variables
require('dotenv').config();

const SECRET = process.env.SECRET;

// ------------------------ EXPRESS MIDDLEWARES --------------------------
// Check if user's token is valid
const isLoggedIn = async (req, res, next) => {
  try {
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

// -------------------------- EXPENSE ROUTES -------------------------
//Get all expenses for that user
router.get('/', isLoggedIn, async (req, res, next) => {
  try {
    const expenses = await db.query('SELECT * FROM expenses WHERE user_id=$1', [
      req.user_id,
    ]);
    // return res.json(req.user_id);
    return res.json(expenses.rows);
  } catch (e) {
    return next(e);
  }
});

router.post('/', isLoggedIn, async (req, res, next) => {
  try {
    const expenseToAdd = await db.query(
      'INSERT INTO expenses (expense_name, price, category, paid_to, user_id, expense_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        req.body.expense_name,
        req.body.price,
        req.body.category,
        req.body.paid_to,
        req.user_id,
        req.body.expense_date,
      ]
    );

    return res.json(expenseToAdd.rows[0]);
  } catch (e) {
    return next(e);
  }
});

router.delete('/:id', isLoggedIn, async (req, res, next) => {
  try {
    const expenseToDelete = await db.query(
      'DELETE FROM expenses WHERE user_id=$1 AND id=$2 RETURNING *',
      [req.user_id, req.params.id]
    );
    return res.json(expenseToDelete.rows[0]);
  } catch (e) {
    return next(e);
  }
});

//EDIT - Easier to test with form data
// router.patch('/');

module.exports = router;
