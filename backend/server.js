require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDatabase = require('./config/db');
const resourceRoutes = require('./routes/resourceRoutes');
const dashboard = require('./controllers/dashboardController');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/api/health', (req, res) => res.json({ success: true, database: 'connected' }));
app.get('/api/dashboard', dashboard);
for (const resource of ['students', 'lecturers', 'courses', 'attendance', 'grades']) {
  app.use(`/api/${resource}`, resourceRoutes(resource));
}
app.use('/api', notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
connectDatabase()
  .then(() => app.listen(port, () => console.log(`Student management system running at http://localhost:${port}`)))
  .catch((error) => {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error('Start the MongoDB Community Server service and verify MONGODB_URI in .env.');
    process.exitCode = 1;
  });
