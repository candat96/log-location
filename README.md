# Location Tracking WebSocket Server

This server provides real-time location tracking functionality via WebSocket connections, with the ability to filter data by email address.

## Features

- Real-time location updates via WebSocket
- Email-based filtering for WebSocket connections
- Location data storage in MySQL database
- Trip saving functionality

## WebSocket Connection

### Basic Connection

Connect to the WebSocket server at:

```
ws://your-server-address:5021
```

Replace `your-server-address` with your actual server address (or use `localhost` for local testing).

This will receive updates for all emails (no filtering).

### Email-Filtered Connection

To receive updates only for a specific email, connect with an email parameter:

```
ws://your-server-address:5021?email=example@gmail.com
```

This connection will only receive location updates for the specified email address.

### Changing Email Subscription

You can change which email you're subscribed to by sending a message to the WebSocket server:

```json
{
  "action": "subscribe",
  "email": "new-email@example.com"
}
```

### Testing with Postman

1. **Testing WebSocket Connection:**
   - In Postman, create a new WebSocket request
   - Enter the WebSocket URL: `ws://your-server-address:5021?email=example@gmail.com`
   - Connect to the WebSocket server
   - To change email subscription, send a message with this format:
     ```json
     {
       "action": "subscribe",
       "email": "new-email@example.com"
     }
     ```

2. **Testing Location API:**
   - Create a new HTTP POST request to `http://your-server-address:5021/api/location`
   - Set Content-Type header to `application/json`
   - Add a JSON body:
     ```json
     {
       "type": "location",
       "location": {
         "latitude": 10.123456,
         "longitude": 106.789012
       },
       "activity": "driving",
       "email": "user@example.com"
     }
     ```
   - Send the request and observe the WebSocket connection to see if it receives the update

## API Endpoints

### POST /api/location

Sends location data which will be broadcast to relevant WebSocket clients and stored in the database.

Example request:
```json
{
  "type": "location",
  "location": {
    "latitude": 10.123456,
    "longitude": 106.789012
  },
  "activity": "driving",
  "email": "user@example.com"
}
```

### POST /api/saveTrip

Saves trip data to a JSON file and broadcasts a notification to WebSocket clients.

Example request:
```json
{
  "tripId": "trip123",
  "startTime": "2025-03-22T10:00:00Z",
  "endTime": "2025-03-22T11:30:00Z",
  "points": [...],
  "email": "user@example.com"
}
```

## WebSocket Message Format

Messages sent from the server to clients have the following format:

```json
{
  "type": "location|tripSaved|subscription",
  "data": {
    // Data specific to the message type
  }
}
```

## Running the Server

Basic usage:
```bash
node server.js
```

With environment variables for custom configuration:
```bash
SERVER_URL=your-server-domain HOST=0.0.0.0 node server.js
```

### Environment Variables

The server can be configured using the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port number for the server | 5021 |
| HOST | Host address to bind the server | 0.0.0.0 |
| SERVER_URL | Public URL or hostname for the server | localhost |
| MYSQL_HOST | MySQL database host | 173.249.38.33 |
| MYSQL_PORT | MySQL database port | 3308 |
| MYSQL_USER | MySQL database user | roadcare |
| MYSQL_PASSWORD | MySQL database password | deepcare@2024 |
| MYSQL_DATABASE | MySQL database name | location_db |

When deploying to a production environment, you should set at least the SERVER_URL to your actual server domain or IP address.
