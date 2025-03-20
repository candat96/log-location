const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { jwtDecode } = require('jwt-decode');
// Tạo ứng dụng Express
const app = express();
const server = http.createServer(app);

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
app.post('/api/location', (req, res) => {
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
        type: 'location',
        data: locationData
    });
    
    // Trả về phản hồi
    res.status(200).json({ message: 'Dữ liệu vị trí đã được nhận!' });
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
