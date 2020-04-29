const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const userRoutes = require('./routes/users');
const expenseRoutes = require('./routes/expenses');
const landingRoutes = require('./routes/landing');

const PORT = process.env.PORT || 5000;

// ------------------------------- MIDDLEWARES ---------------------------
app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.json());

// --------------------------------------- Routes ----------------------------------------------------
app.use('/landing', landingRoutes);
app.use('/users', userRoutes);
app.use('/expenses', expenseRoutes);

// ---------------------------- ERROR HANDLING ------------------------
app.use((req, res, next) => {
  var err = new Error('Not found');
  err.status = 404;
  return next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  return res.json({
    message: err.message,
    error: app.get('env') === 'development' ? err : {},
  });
});

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
