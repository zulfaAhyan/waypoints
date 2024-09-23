import express from 'express';
import { mkdirSync, writeFile } from 'fs';
import { readFile } from 'fs/promises';
import cors from 'cors';

const app = express();

//added for zeet hosting
const hostname = '0.0.0.0';

// CORS configuration
const corsOptions = {
  origin: ['http://localhost', 'https://zulfaahyan.github.io', 'https://zulfaahyan.forgottengaze.africa'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());


// Debugging route for the root path
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Debugging route to test CORS
app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS is working' });
});

// Handle POST request to store waypoints
app.post('/store-waypoints', (req, res) => {
  console.log('Received waypoints request:', req.body);
  const { routeId, waypoints } = req.body;

  // Define the path where the waypoints will be stored
  const filePath = `./waypoints/${routeId}.json`;

  try {
    // Ensure the directory exists
    mkdirSync('./waypoints', { recursive: true });

    // Write the waypoints to a JSON file
    writeFile(filePath, JSON.stringify(waypoints, null, 2), (err) => {
      if (err) {
        console.error('Error saving waypoints:', err);
        res.status(500).json({ error: 'Failed to store waypoints.' });
        return;
      }
      console.log(`Waypoints for ${routeId} stored successfully.`);
      res.status(200).json({ message: 'Waypoints stored successfully.' });
    });
  } catch (error) {
    console.error('Error in store-waypoints route:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// Add a new route to get waypoints
app.get('/get-waypoints/:routeId', async (req, res) => {
    try {
      const { routeId } = req.params;
      const filePath = `./waypoints/${routeId}.json`;
      const data = await readFile(filePath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      console.error('Error reading waypoints:', error);
      res.status(404).json({ error: 'Waypoints not found' });
    }
  });


// Start the server
const PORT = process.env.PORT;
app.listen(PORT, hostname, () => {
  console.log(`Server running on http://${hostname}:${PORT}`);
});