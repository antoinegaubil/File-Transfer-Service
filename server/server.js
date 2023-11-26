const net = require("net");
const fs = require("fs");
const { toASCII } = require("punycode");

const server = net.createServer();

const PORT = process.argv[2] || 3000;
const DEBUG_MODE = false;
if (process.argv[3] === 1) {
  DEBUG_MODE = true;
}

server.on("connection", (socket) => {
  if (DEBUG_MODE) {
    console.log("Client connected");
  }

  socket.on("data", (data) => {
    const newData = data.toString();
    const command = newData.toString().trim().split(" ");
    console.log(toAscii(command[3]));
  });

  socket.on("end", () => {
    if (DEBUG_MODE) console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function sendFile(socket, fileName) {
  fs.readFile(fileName, (err, data) => {
    if (err) {
      socket.write("File not found\n");
    } else {
      socket.write(data);
    }
    socket.end();
  });
}

function toAscii(bin) {
  return bin.replace(/\s*[01]{8}\s*/g, function (bin) {
    return String.fromCharCode(parseInt(bin, 2));
  });
}

function receiveFile(socket, fileName) {
  let dataBuffer = Buffer.from([]);
  socket.on("data", (data) => {
    dataBuffer = Buffer.concat([dataBuffer, data]);
  });

  socket.on("end", () => {
    fs.writeFile(fileName, dataBuffer, (err) => {
      if (err) {
        socket.write("Error writing file\n");
      } else {
        socket.write("File received successfully\n");
      }
      socket.end();
    });
  });
}
