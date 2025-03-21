const mysql = require('mysql2/promise');

// Determine if running in Docker or locally
const isDocker = process.env.RUNNING_IN_DOCKER === 'true';

// Database connection configuration
const dbConfig = {
    // Use host.docker.internal when running in Docker, localhost otherwise
    host: process.env.MYSQL_HOST || (isDocker ? 'host.docker.internal' : 'localhost'),
    user: process.env.MYSQL_USER || 'roadcare',
    password: process.env.MYSQL_PASSWORD || 'deepcare@2024',
    database: process.env.MYSQL_DATABASE || 'location_db',
    port: process.env.MYSQL_PORT || 3306
};

console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}`);

async function checkDatabase() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database successfully');

        // Query the locations table
        console.log('Querying locations table...');
        const [rows] = await connection.execute('SELECT * FROM locations ORDER BY id DESC LIMIT 10');
        
        if (rows.length === 0) {
            console.log('No location data found in the database');
        } else {
            console.log(`Found ${rows.length} location records:`);
            rows.forEach((row, index) => {
                console.log(`\nRecord #${index + 1}:`);
                console.log(`ID: ${row.id}`);
                console.log(`Type: ${row.type}`);
                console.log(`Location: ${row.location}`);
                console.log(`Activity: ${row.activity}`);
                console.log(`Email: ${row.email}`);
                console.log(`Created at: ${row.created_at}`);
                
                // Try to parse location JSON if it's not empty
                if (row.location) {
                    try {
                        const locationObj = JSON.parse(row.location);
                        if (locationObj.latitude && locationObj.longitude) {
                            console.log(`  Parsed location: ${locationObj.latitude}, ${locationObj.longitude}`);
                        }
                    } catch (e) {
                        // If it's not valid JSON, just show as is
                    }
                }
            });
        }
    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

// Check the database
checkDatabase();
