import express from 'express';
import { mkdirSync, writeFile } from 'fs';
import { readFile } from 'fs/promises';
import cors from 'cors';
import path from 'path';

const app = express();
const hostname = '0.0.0.0';

// CORS configuration
const corsOptions = {
  origin: ['http://localhost', 'https://zulfaahyan.github.io', 'https://zulfaahyan.forgottengaze.africa', 'https://samsontz.github.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Data-Version'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Create waypoints directory if it doesn't exist
const waypointsDir = path.join(process.cwd(), 'waypoints');
mkdirSync(waypointsDir, { recursive: true });

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS is working' });
});

app.post('/store-waypoints', (req, res) => {
  console.log('Received waypoints request:', req.body);
  const { routeId, waypoints, metadata } = req.body;

  // Enhanced validation
  if (!routeId || !waypoints || !Array.isArray(waypoints)) {
    return res.status(400).json({ error: 'Invalid request format. Required: routeId and waypoints array' });
  }

  if (waypoints.length < 2) {
    return res.status(400).json({ error: 'Route must have at least 2 waypoints' });
  }

  // Sanitize the routeId to prevent directory traversal
  const sanitizedRouteId = routeId.replace(/[^a-zA-Z0-9-_]/g, '');
  const filePath = path.join(waypointsDir, `${sanitizedRouteId}.json`);

  // Store complete route data
  const routeData = {
    routeId: sanitizedRouteId,
    waypoints,
    metadata: {
      ...metadata,
      savedAt: new Date().toISOString()
    }
  };

  try {
    writeFile(filePath, JSON.stringify(routeData, null, 2), (err) => {
      if (err) {
        console.error('Error saving waypoints:', err);
        res.status(500).json({ error: 'Failed to store waypoints.' });
        return;
      }
      console.log(`Waypoints for ${routeId} stored successfully.`);
      res.status(200).json({ 
        message: 'Waypoints stored successfully.',
        routeId: sanitizedRouteId,
        totalPoints: waypoints.length
      });
    });
  } catch (error) {
    console.error('Error in store-waypoints route:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/get-waypoints/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const sanitizedRouteId = routeId.replace(/[^a-zA-Z0-9-_]/g, '');
    const filePath = path.join(waypointsDir, `${sanitizedRouteId}.json`);
    
    const data = await readFile(filePath, 'utf8');
    const routeData = JSON.parse(data);
    
    // Verify data structure
    if (!routeData.waypoints || !Array.isArray(routeData.waypoints)) {
      throw new Error('Invalid data structure in stored file');
    }
    
    res.json(routeData);
  } catch (error) {
    console.error('Error reading waypoints:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Route not found' });
    } else {
      res.status(500).json({ error: 'Error retrieving waypoints data' });
    }
  }
});

const port = process.env.PORT || 3000;
app.listen(port, hostname, () => {
  console.log(`Server running on port ${port}`);
});
