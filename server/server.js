const net = require('net');
const fs = require('fs');

const server = net.createServer(socket => {
  console.log('Client connected');

  socket.on('data', data => {
    const message = data.toString().trim();
    const [command, filename] = message.split(' ');

  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
