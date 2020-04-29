const express = require('express');
const router = express.Router();

const SECRET = process.env.SECRET;

// -------------------------- USER ROUTES ---------------------------
//Get list of all users
router.get('/', async (req, res, next) => {
  try {
    return res.json({ message: 'Waking up Heroku' });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
