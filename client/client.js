const net = require('net');
const fs = require('fs');

const client = new net.Socket();

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;

client.connect(SERVER_PORT, SERVER_HOST, () => {
  console.log('Connected to server');

  // Example download
  client.write('download example.txt');

  // Example upload
  const fileStream = fs.createReadStream('upload.txt');
  client.write('upload upload.txt');
  fileStream.pipe(client);
});

client.on('data', data => {
  // Handle received data
  console.log('Received data:', data.toString());
});

client.on('close', () => {
  console.log('Connection closed');
});
