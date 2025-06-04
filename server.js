
process.env.NODE_TLS_REJECT_UNAUTHORIZED 

const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./config/dbConfig');
require('./cron/inviteCleanup');
require('./cron/inviteReminder');



require('./auth/passport'); 

const app = express();

app.use(session({ secret: 'your_secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());


// Routes
const authRoutes = require('./routes/authRouter');
const eventRoutes = require ('./routes/eventRouter')
const galleryRoutes = require ('./routes/gallery')
const contributionRoutes = require ('./routes/contributionRouter')

app.use('/', authRoutes);
app.use ('/', eventRoutes )
app.use ('/', galleryRoutes)
app.use ('/', contributionRoutes)

app.get('/', (req, res) => {
  res.send('Home Page');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
