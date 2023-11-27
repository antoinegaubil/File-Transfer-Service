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

    handleRequest(command, socket, handleRequestData, data);
  });

  socket.on("end", () => {
    if (handleRequestData.writeStream) {
      handleRequestData.writeStream.end();
    }

    handleRequestData.handled = false;
  });

  socket.on("error", (err) => {
    console.error(`Error with the socket: ${err.message}`);
    if (handleRequestData.writeStream) {
      handleRequestData.writeStream.end();
    }
    handleRequestData.handled = false;
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function handleRequest(command, socket, handleRequestData, data) {
  let header = "";
  if (handleRequestData.handled === false) {
    header = command[0].substring(0, 3);
  } else {
    header = "111";
  }
  if (header === "000" || header === "111") {
    if (header === "111") {
      if (handleRequestData.writeStream) {
        handleData(data, handleRequestData.writeStream, socket);
      }
    } else {
      const filename = toAscii(command[1]);
      const filePath = "./" + filename;

      putRequest(filePath, socket, handleRequestData, socket);
      handleRequestData.handled = true;
    }
  } else if (header === "001") {
    //get
    const filenameGet = toAscii(command[1]);
    const filePathGet = "./" + filenameGet;
    getRequest(filePathGet, socket);

    console.log("get");
  } else if (header === "010") {
    const filenameChange = toAscii(command[1]);
    const filePathChange = "./" + filenameChange;
    changeRequest(filePathChange, command[2], socket);
  } else if (header === "011") {
    //summary
    console.log("summary");
    serverResponse("010", null, socket);
  } else if (header === "100") {
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
    const opcode =
      "110" +
      String(
        ((optionsString.length + 1) & 0b11111).toString(2).padStart(5, "0")
      );
    serverResponse(opcode, helpAnswer, socket);
  } else {
    serverResponse("100", null, socket);
    console.log("wrong command");
  }
}

function serverResponse(opcode, message, socket) {
  response = opcode + " " + message;
  socket.write(response);
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

function handleData(data, writeStream) {
  if (writeStream) {
    writeStream.write(data);
  }
}

function putRequest(filePath, socket, handleRequestData) {
  handleRequestData.writeStream = fs.createWriteStream(filePath);

  socket.on("end", () => {
    if (handleRequestData.writeStream) {
      handleRequestData.writeStream.end();
      console.log(`File "${filePath}" stored successfully.`);
      serverResponse("000", null, socket);
    }
    console.log("Client disconnected");
  });

  socket.on("error", (err) => {
    console.error(`Error with the socket: ${err.message}`);
    if (handleRequestData.writeStream) {
      handleRequestData.writeStream.end();
    }
  });
}

function getRequest(filePath) {
  if (fs.existsSync(filePath)) {
    serverResponse("001", "xxxxx", socket);
  } else {
    serverResponse("011", null, socket);
  }
}

function changeRequest(filePath, newFilePath, socket) {
  fs.rename(filePath, newFilePath, (err) => {
    if (err) {
      serverResponse("101", null, socket);
    } else {
      serverResponse("000", null, socket);
    }
  });
}
