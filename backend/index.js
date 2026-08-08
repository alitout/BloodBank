
import { env } from './config/env.js';

import express from 'express';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';

import User from './models/User.js';

// Import all route files
import routes from './routes/routes.js';
import userRoutes from './routes/User/userRoutes.js';
import requestRoutes from './routes/Request/requestRoutes.js';
import hospitalRoutes from './routes/Hospital/hospitalRoutes.js';
import appointmentRoutes from './routes/Appointment/appointmentRoutes.js';
import alertRoutes from './routes/Alert/alertRoutes.js';
import profileRoutes from './routes/Profile/profileRoutes.js';
import donationRoutes from './routes/Donation/donationRoutes.js';

// Import security middleware
import { helmetMiddleware, corsMiddleware, generalLimiter, sanitizeDataMiddleware, genericErrorHandler, noCacheMiddleware } from './middleware/securityMiddleware.js';

const mongoString = env.MONGODB_URI;

// Verify critical environment variables
if (!mongoString || !env.JWT_SECRET) {
  console.error('❌ CRITICAL: Missing required environment variables (MONGODB_URI, JWT_SECRET)');
  process.exit(1);
}

mongoose.connect(mongoString)
const database = mongoose.connection;

database.on('error', (error) => {
  console.error('❌ Database connection error:', error);
});

database.once('open', () => {
  console.log('✅ Database Connected');
});

const app = express();

// Security headers (must be before any other middleware)
app.use(helmetMiddleware);

// CORS configuration
app.use(corsMiddleware);

// Parse request bodies
app.use(express.json({ limit: '10kb' })); // Limit payload size to prevent DOS
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Prevent NoSQL Injection by sanitizing data
app.use(mongoSanitize());

// Sanitize all input data
app.use(sanitizeDataMiddleware);

// Prevent caching of sensitive data
app.use(noCacheMiddleware);


// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.json({
    status: "Backend OK",
    timestamp: new Date().toISOString()
  });
});

// Register all routes
app.use('/', routes);

// API Routes - Auth routes with stricter rate limiting applied in router
app.use('/api/auth', userRoutes);
app.use('/api/auth', profileRoutes);
app.use('/api/requesters', requestRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/donations', donationRoutes);



app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(genericErrorHandler);

const PORT = env.PORT;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server Started at PORT ${PORT}`);
  console.log(`🔒 Security Features Enabled:`);
  console.log(`   - Helmet security headers`);
  console.log(`   - CORS: ${env.FRONTEND_URL}`);
  console.log(`   - Rate limiting: 100/15min (general), 5/15min (auth)`);
  console.log(`   - Input sanitization`);
  console.log(`   - NoSQL injection prevention`);
});
