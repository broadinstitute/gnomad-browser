import express from 'express';
import cors from 'cors';
import adminRoutes from './admin';
import threadRoutes from './threads';
import userRoutes from './users';
import miscRoutes from './misc';

const router = express.Router();

// Define CORS options for the CopilotKit endpoint
const corsOptions = {
  origin: [
    'http://localhost:8008', // local browser dev
    'http://localhost:8010', // local api dev
    'https://gnomad.broadinstitute.org', // production
  ],
  credentials: true,
};

// Apply CORS to all routes
router.use(cors(corsOptions));

// Apply JSON body parser with increased limit for tool results
router.use(express.json({ limit: '50mb' }));

router.use('/admin', adminRoutes);
router.use('/threads', threadRoutes);
router.use('/users', userRoutes);
// Mount misc routes at the root of /api/copilotkit
router.use('/', miscRoutes);

export default router;
