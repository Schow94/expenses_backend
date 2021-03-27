const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const IncomingForm = require('formidable').IncomingForm;
const fs = require('fs');
const fastcsv = require('fast-csv');
const path = require('path');
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
    //Add user_id to req header
    req.user_id = user.rows[0].id;
    // return res.json(user.username);
    return next();
  } catch (e) {
    console.log('error: ', e);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// -------------------------- EXPENSE ROUTES -------------------------
//GET all expenses for that user
router.get('/', isLoggedIn, async (req, res, next) => {
  try {
    const expenses = await db.query(
      'SELECT * FROM expenses WHERE user_id=$1 ORDER BY expense_date DESC',
      [req.user_id]
    );
    // return res.json(req.user_id);
    return res.json(expenses.rows);
  } catch (e) {
    return next(e);
  }
});

router.get('/:year', isLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM expenses WHERE user_id=$1 AND EXTRACT(YEAR FROM to_timestamp(expense_date))=$2 ORDER BY expense_date ASC',
      [req.user_id, req.params.year]
    );

    return res.json(result.rows);
  } catch (e) {
    return next(e);
  }
});

router.get('/:year/:month', isLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM expenses WHERE user_id=$1 AND EXTRACT(YEAR FROM to_timestamp(expense_date))=$2 AND EXTRACT(MONTH FROM to_timestamp(expense_date))=$3 ORDER BY expense_date ASC',
      [req.user_id, req.params.year, req.params.month]
    );

    return res.json(result.rows);
  } catch (e) {
    return next(e);
  }
});

router.get('/:year/:month/:day', isLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM expenses WHERE user_id=$1 AND EXTRACT(YEAR FROM to_timestamp(expense_date))=$2 AND EXTRACT(MONTH FROM to_timestamp(expense_date))=$3 AND EXTRACT(DAY FROM to_timestamp(expense_date))=$4 ORDER BY expense_date ASC',
      [req.user_id, req.params.year, req.params.month, req.params.day]
    );

    return res.json(result.rows);
  } catch (e) {
    return next(e);
  }
});

// Returns all expenses w/in a particular week
// Formatting probably wrong
router.post('/week/current', isLoggedIn, async (req, res, next) => {
  try {
    console.log(req);

    const result = await db.query(
      'SELECT * FROM expenses WHERE user_id=$1 AND to_timestamp(expense_date)::date BETWEEN $2::date AND $3::date ORDER BY expense_date ASC',
      [req.user_id, req.body.start, req.body.end]
    );

    // SELECT * FROM expenses WHERE to_timestamp(expense_date)::date BETWEEN '2020-06-14' AND '2020-06-20';

    return res.json(result.rows);
  } catch (e) {
    return next(e);
  }
});

// ADD AN EXPENSE
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

// DELETE A USER
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
router.patch('/:id', isLoggedIn, async (req, res, next) => {
  try {
    if (req.body.expense_name) {
      const expenseToUpdate = await db.query(
        'UPDATE expenses SET expense_name=$1 WHERE user_id=$2 AND id=$3 RETURNING *',
        [req.body.expense_name, req.user_id, req.params.id]
      );
      return res.json(expenseToUpdate.rows[0]);
    } else if (req.body.price) {
      const expenseToUpdate = await db.query(
        'UPDATE expenses SET price=$1 WHERE user_id=$2 AND id=$3 RETURNING *',
        [req.body.price, req.user_id, req.params.id]
      );
      return res.json(expenseToUpdate.rows[0]);
    } else if (req.body.category) {
      const expenseToUpdate = await db.query(
        'UPDATE expenses SET category=$1 WHERE user_id=$2 AND id=$3 RETURNING *',
        [req.body.category, req.user_id, req.params.id]
      );
      return res.json(expenseToUpdate.rows[0]);
    } else if (req.body.paid_to) {
      const expenseToUpdate = await db.query(
        'UPDATE expenses SET paid_to=$1 WHERE user_id=$2 AND id=$3 RETURNING *',
        [req.body.paid_to, req.user_id, req.params.id]
      );
      return res.json(expenseToUpdate.rows[0]);
    } else if (req.body.expense_date) {
      const expenseToUpdate = await db.query(
        'UPDATE expenses SET expense_date=$1 WHERE user_id=$2 AND id=$3 RETURNING *',
        [req.body.expense_date, req.user_id, req.params.id]
      );
      return res.json(expenseToUpdate.rows[0]);
    }
  } catch (e) {
    return next(e);
  }
});

//Upload a CSV to db
router.post('/upload', isLoggedIn, async (req, res, next) => {
  try {
    const user_id = req.user_id;
    console.log('req: ', user_id);

    //Create a new form
    const options = {
      multiples: true,
    };
    var form = new IncomingForm(options);

    //Keeps files from being renamed & lets us specify file path to save to
    form.on('fileBegin', (name, file) => {
      const fileType = file.type.split('/').pop();
      const filePath = path.join(__dirname, `../uploads/${file.name}`);

      console.log('file type: ', file.type);

      if (fileType === 'csv') {
        file.path = `${__dirname}/../uploads/${file.name}`;
      } else {
        console.log(
          'Incorrect file type ' + fileType + ' is not an accepted file type'
        );
      }
    });

    form.parse(req, (err, fields, files) => {
      //Fast CSV logic
      if (err) {
        return next(err);
      }

      res.json({ fields, files });
    });

    await form.on('file', (name, file) => {
      // Create ReadStream object which ‘pipes’ a CsvParserStream object generated from fast-csv
      // parse() function:
      const filePath = path.join(__dirname, `../uploads/${file.name}`);
      console.log('path: ', filePath);
      let stream = fs.createReadStream(filePath);

      //Handles errors in event that file location cant be found
      //location/path to file wont be specified for all non-csv files since were choosing
      // to not set the path for non-csv files
      stream.on('error', (error) => {
        res.end(error);
      });

      let csvData = [];
      let csvStream = fastcsv
        .parse({ headers: true })
        // on ('data') is triggered when a record is parsed so we get the record (data) in the
        // handler fxn.
        .on('data', (data) => {
          // Each record is pushed to the csvData array
          csvData.push(data);
          const date = new Date(data['Date']).getTime() / 1000;

          const expenseToAdd = db.query(
            'INSERT INTO expenses (expense_name, price, category, paid_to, user_id, expense_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [
              data['Expense'],
              data['Price'],
              data['Category'],
              data['Paid To'],
              req.user_id,
              date,
            ]
          );
        })
        // on('end') is triggered after the parsing is done
        .on('end', () => {
          // connect to the PostgreSQL database
          // save csvData
        });
      stream.pipe(csvStream);

      // Cleanup and delete temp file after reading with csv
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
        }
      });
    });

    //Send file back to user in browser
    form.on('end', (name, file) => {
      console.log('Done uploading! Clean up here');
      //Send JSON file back to browser
      res.json(file);
      // const filePath = path.join(__dirname, `../uploads`);
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
