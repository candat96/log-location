const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { jwtDecode } = require('jwt-decode');
const mysql = require('mysql2/promise');
// Determine if running in Docker or locally
const isDocker = process.env.RUNNING_IN_DOCKER === 'true';

// Database connection configuration
const dbConfig = {
    // Use host.docker.internal when running in Docker, localhost otherwise
    host: process.env.MYSQL_HOST || '173.249.38.33',
    user: process.env.MYSQL_USER || 'roadcare',
    password: process.env.MYSQL_PASSWORD || 'deepcare@2024',
    database: process.env.MYSQL_DATABASE || 'location_db',
    port: process.env.MYSQL_PORT || 3308
};

console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}`);

// Database connection pool
let pool;

// Function to initialize database with better retry logic
async function initDatabase(retries = 30, delay = 5000) {
    try {
        console.log(`Attempting to connect to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
        
        // Create connection pool
        pool = mysql.createPool(dbConfig);
        
        // Test the connection
        await pool.query('SELECT 1');
        console.log('Successfully connected to MySQL database');
        
        // Create locations table if it doesn't exist with just 4 string columns
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(255),
                location TEXT,
                activity VARCHAR(255),
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error(`Database initialization error (retries left: ${retries}):`, error);
        
        if (retries > 0) {
            console.log(`Retrying in ${delay/1000} seconds...`);
            // Retry with one less retry count
            setTimeout(() => initDatabase(retries - 1, delay), delay);
        } else {
            console.error('Max retries reached. Could not connect to database.');
        }
    }
}

// Tạo ứng dụng Express
const app = express();
const server = http.createServer(app);

// Initialize database
initDatabase();

// Tạo WebSocket server
const wss = new WebSocket.Server({ server });

// Lưu danh sách các clients kết nối
const clients = new Set();

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    // Xử lý khi client ngắt kết nối
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Hàm gửi dữ liệu tới tất cả clients
function broadcastLocation(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API nhận vị trí
app.post('/api/location', async (req, res) => {
    let locationData = req.body;
    console.log('Request location', {});
    if (locationData.token) {
        const decodeData = jwtDecode(locationData.token);
        const email = decodeData.user.email;
        delete locationData.token;
        locationData.email = email;
    }
    console.log('Request location', locationData);
    
    // Gửi dữ liệu vị trí qua WebSocket tới tất cả clients
    broadcastLocation({
        type: locationData.type,
        data: locationData
    });
    
    try {
        // Save location data to database with simplified schema
        if (pool && locationData) {
            // Extract the 4 fields we want to store
            const type = locationData.type || '';
            const location = locationData.location ? JSON.stringify(locationData.location) : '';
            const activity = locationData.activity || '';
            const email = locationData.email || '';
            
            const query = `
                INSERT INTO locations (
                    type, location, activity, email
                ) VALUES (?, ?, ?, ?)
            `;
            
            const values = [type, location, activity, email];
            
            await pool.execute(query, values);
            console.log('Location data saved to database');
        }
    } catch (error) {
        console.error('Error saving location data to database:', error);
    }
    
    // Trả về phản hồi
    res.status(200).json({ message: 'Dữ liệu vị trí đã được nhận và lưu vào database!' });
});

// API lưu chuyến đi
app.post('/api/saveTrip', (req, res) => {
    const tripData = req.body;
    console.log('Request saveTrip', tripData);
    
    // Gửi thông báo qua WebSocket
    broadcastLocation({
        type: 'tripSaved',
        data: tripData
    });
    
    // Tạo timestamp cho tên file (ví dụ: trip_20250312_143022.json)
    const timestamp = new Date().toISOString()
        .replace(/T/, '_')         // Thay T bằng _
        .replace(/:/g, '')         // Xóa dấu :
        .replace(/\..+/, '');      // Xóa phần millisecond
    const filename = `trip_${timestamp}.json`;
    
    // Chuyển dữ liệu thành chuỗi JSON
    const dataToSave = JSON.stringify(tripData, null, 2);
    
    // Lưu vào file với tên có timestamp
    fs.writeFile(filename, dataToSave, (err) => {
        if (err) {
            console.error('Lỗi khi lưu file:', err);
            return res.status(500).json({
                message: 'Lỗi khi lưu dữ liệu chuyến đi',
                error: err.message
            });
        }
        res.status(200).json({
            message: `Dữ liệu chuyến đi đã được lưu thành công vào ${filename}!`
        });
    });
});

// Khởi động server
const PORT = 5021;
server.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`WebSocket server đang chạy tại ws://localhost:${PORT}`);
});
