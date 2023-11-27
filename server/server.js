const net = require("net");
const fs = require("fs");

const server = net.createServer();

const PORT = process.argv[2] || 3000;
let DEBUG_MODE = false;
if (process.argv[3] === "1") {
  DEBUG_MODE = true;
}

let handleRequestData = { writeStream: null, handled: false };

server.on("connection", (socket) => {
  if (DEBUG_MODE) {
    console.log("Client connected");
  }

  socket.on("data", (data) => {
    const newData = data.toString();
    const command = newData.toString().trim().split(" ");

    if (!handleRequestData.handled) {
      handleRequest(command, socket, handleRequestData);
      handleRequestData.handled = true;
    } else {
      handleData(data, handleRequestData.writeStream);
    }
  });

  socket.on("end", () => {
    if (handleRequestData.writeStream) {
      handleRequestData.writeStream.end();
    }
    if (DEBUG_MODE) console.log("Client disconnected");
    // Reset the handled flag for the next connection
    handleRequestData.handled = false;
  });

  socket.on("error", (err) => {
    console.error(`Error with the socket: ${err.message}`);
    if (handleRequestData.writeStream) {
      handleRequestData.writeStream.end();
    }
    // Reset the handled flag for the next connection
    handleRequestData.handled = false;
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function serverResponse(answer) {
  //server.write(answer);
}

function handleRequest(command, socket, handleRequestData) {
  if (command[0].substring(0, 3) === "000") {
    const filename = toAscii(command[1]);
    const filePath = "./" + filename;

    handleRequestData.writeStream = fs.createWriteStream(filePath);

    socket.on("end", () => {
      if (handleRequestData.writeStream) {
        handleRequestData.writeStream.end();
        console.log(`File "${filePath}" stored successfully.`);
      }
      console.log("Client disconnected");
    });

    socket.on("error", (err) => {
      console.error(`Error with the socket: ${err.message}`);
      if (handleRequestData.writeStream) {
        handleRequestData.writeStream.end();
      }
    });
  } else if (command[0].substring(0, 3) === "001") {
    //get
    console.log("get");
  } else if (command[0].substring(0, 3) === "010") {
    //change
    console.log("change");
  } else if (command[0].substring(0, 3) === "011") {
    //summary
    console.log("summary");
  } else if (command[0].substring(0, 3) === "100") {
    //help
    const optionsString = `
    \nHere are the 6 possible options:
    1. get filename.xxx to retrieve a file from the server
    2. put filename.xxx to store a file in the server
    3. summary filename.xxx to get the statistical summary of a file from the server
    4. change filename.xxx newFileName.xxx to change the name of a file in the server
    5. help for help with the commands
    6. bye to end the connection with the server`;

    const helpAnswer = toBinary(optionsString);
    serverResponse(helpAnswer);
  } else {
    console.log("wrong command");
  }
}

function handleData(data, writeStream) {
  if (writeStream) {
    writeStream.write(data);
  }
}

function toAscii(bin) {
  return bin.replace(/\s*[01]{8}\s*/g, function (bin) {
    return String.fromCharCode(parseInt(bin, 2));
  });
}

function toBinary(str) {
  return str.replace(/[\s\S]/g, function (str) {
    str = zeroPad(str.charCodeAt().toString(2));
    return str;
  });
}

function zeroPad(num) {
  return "00000000".slice(String(num).length) + num;
}
