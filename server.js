import express from 'express';
import { mkdirSync, writeFile } from 'fs';
import { readFile } from 'fs/promises';
import cors from 'cors';
import { validate as isUUID } from 'uuid';

const app = express();
const hostname = '0.0.0.0';

// CORS configuration with additional security headers
const corsOptions = {
  origin: ['http://localhost', 'https://zulfaahyan.github.io', 'https://zulfaahyan.forgottengaze.africa'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Api-Version'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' })); // Increased limit for larger datasets

// Validation middleware for waypoint data
const validateWaypoints = (req, res, next) => {
  const { routeId, waypoints, metadata } = req.body;

  if (!routeId || !waypoints || !Array.isArray(waypoints)) {
    return res.status(400).json({ 
      error: 'Invalid request format', 
      details: 'Required fields: routeId and waypoints array' 
    });
  }

  if (!isUUID(routeId)) {
    return res.status(400).json({ 
      error: 'Invalid routeId format',
      details: 'RouteId must be a valid UUID'
    });
  }

  // Validate waypoint structure
  const isValidWaypoint = (waypoint) => {
    return waypoint 
      && typeof waypoint.lat === 'number'
      && typeof waypoint.lng === 'number'
      && !isNaN(waypoint.lat)
      && !isNaN(waypoint.lng)
      && waypoint.lat >= -90 
      && waypoint.lat <= 90
      && waypoint.lng >= -180 
      && waypoint.lng <= 180;
  };

  if (!waypoints.every(isValidWaypoint)) {
    return res.status(400).json({ 
      error: 'Invalid waypoint data',
      details: 'Each waypoint must have valid lat/lng coordinates'
    });
  }

  next();
};

// Root route with version information
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    version: '2.0.0',
    supportedApiVersions: ['1.0', '2.0']
  });
});

// Enhanced waypoint storage
app.post('/store-waypoints', validateWaypoints, async (req, res) => {
  console.log('Received waypoints request:', req.body);
  const { routeId, waypoints, metadata = {} } = req.body;

  // Enhance the stored data with additional metadata
  const enhancedData = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    routeId,
    waypoints,
    metadata: {
      ...metadata,
      storageTimestamp: new Date().toISOString(),
      pointCount: waypoints.length,
      boundingBox: calculateBoundingBox(waypoints),
      totalDistance: calculateTotalDistance(waypoints)
    }
  };

  const filePath = `./waypoints/${routeId}.json`;

  try {
    // Ensure the directory exists
    mkdirSync('./waypoints', { recursive: true });

    // Write the enhanced data
    await new Promise((resolve, reject) => {
      writeFile(filePath, JSON.stringify(enhancedData, null, 2), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`Waypoints for ${routeId} stored successfully.`);
    res.status(200).json({
      message: 'Waypoints stored successfully',
      metadata: enhancedData.metadata
    });

  } catch (error) {
    console.error('Error in store-waypoints route:', error);
    res.status(500).json({
      error: 'Failed to store waypoints',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enhanced waypoint retrieval
app.get('/get-waypoints/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    
    if (!isUUID(routeId)) {
      return res.status(400).json({ 
        error: 'Invalid routeId format',
        details: 'RouteId must be a valid UUID'
      });
    }

    const filePath = `./waypoints/${routeId}.json`;
    const data = await readFile(filePath, 'utf8');
    const parsedData = JSON.parse(data);

    // Add last accessed timestamp
    parsedData.metadata.lastAccessed = new Date().toISOString();

    res.json(parsedData);
  } catch (error) {
    console.error('Error reading waypoints:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ 
        error: 'Waypoints not found',
        details: 'No data exists for the specified routeId'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Utility function to calculate bounding box
function calculateBoundingBox(waypoints) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  waypoints.forEach(point => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  return {
    south: minLat,
    north: maxLat,
    west: minLng,
    east: maxLng
  };
}

// Utility function to calculate total distance
function calculateTotalDistance(waypoints) {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }
  return total;
}

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(value) {
  return value * Math.PI / 180;
}

const PORT = process.env.PORT;
app.listen(PORT, hostname, () => {
  console.log(`Server running on http://${hostname}:${PORT}`);
});
