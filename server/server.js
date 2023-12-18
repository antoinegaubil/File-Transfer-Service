/*
Antoine Gaubil 40115052
Kevin Emmanuel, 40066565
We certify this work is ours.
*/

const net = require("net");
const fs = require("fs");
const UDP = require("dgram");

const PORT = process.argv[2] || 3000;
let DEBUG_MODE = false;
let firstByte = true;
let connection = "";
let IP = "";
let sendPort = ";";
let TESTING = false;

if (process.argv[3] === "1") {
  DEBUG_MODE = true;
}

const server = net.createServer();

const serverUDP = UDP.createSocket("udp4");

serverUDP.on("message", (message, rinfo) => {
  IP = rinfo.address;
  sendPort = rinfo.port;
  connection = "udp";
  if (DEBUG_MODE) {
    console.log("DATA RECEIVED FROM CLIENT : ", message.toString());
  }
  if (firstByte) {
    handleRequest(message, serverUDP, TESTING);
  }
});

serverUDP.bind(PORT);

server.on("connection", (socket) => {
  connection = "tcp";
  console.log(`\nClient connected wiht port number ${PORT}\n`);

  socket.on("data", (data) => {
    if (firstByte) {
      if (DEBUG_MODE) {
        console.log("DEBUG MODE REQUEST FROM CLIENT :", data.toString());
      }
      handleRequest(data, socket, TESTING);
    }
  });

  socket.on("end", () => {
    console.log("\nClient disconnected\n");
  });

  socket.on("error", (err) => {
    console.error(`\nCONNECTION LOST WITH THE CLIENT\n`);
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

function handleRequest(data, socket, TESTING) {
  try {
    let response = "";
    const command = data.toString().trim().split(" ");
    const opcode = command[0].substring(0, 3);
    if (opcode === "000") {
      firstByte = false;
      response = handlePut(command, socket, TESTING);
    } else if (opcode === "001") {
      response = handleGet(command, socket, TESTING);
    } else if (opcode === "010") {
      handleChange(command, socket);
    } else if (opcode === "011") {
      handleSummary(command, socket);
    } else if (opcode === "100") {
      response = handleHelp(socket, TESTING);
    } else {
      handleUnknown(socket);
    }

    return response;
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
    return error;
  }
}

function handlePut(command, socket, TESTING) {
  const filename = toAscii(command[1]);
  let filePath;
  if (!TESTING) {
    filePath = "database/" + filename;
  } else {
    filePath = "../server/database/" + filename;
  }

  const writeStream = fs.createWriteStream(filePath);
  let isWritting = false;

  function onData(data) {
    isWritting = true;
    if (data.toString().includes("@#dqwe23ljdhy3ui&^%7w62")) {
      const finishedIndex = data.toString().indexOf("@#dqwe23ljdhy3ui&^%7w62");
      const remainingData = data.toString().slice(0, finishedIndex);

      writeStream.write(remainingData);
      writeStream.end();
      isWritting = false;
      if (!TESTING) {
        console.log("Put request handled with success");
      }
      serverResponse("000", socket);

      if (connection == "tcp") {
        socket.off("data", onData);
      }
      if (connection == "udp") {
        serverUDP.off("message", onData);
      }

      firstByte = true;
    } else {
      handleData(data, writeStream, socket);
    }
  }
  if (!TESTING) {
    if (connection == "tcp") {
      socket.on("data", onData);

      socket.on("end", () => {});

      socket.on("error", (err) => {
        if (isWritting) {
          console.error(`Error reading the file!`);
          writeStream.end();
        }
      });
    }
    if (connection == "udp") {
      serverUDP.on("message", onData);
      serverUDP.on("error", (err) => {
        if (isWritting) {
          console.error(`Error reading the file!`);
          writeStream.end();
        }
      });
    }
  }
  return "000";
}

function handleGet(command, socket, TESTING) {
  const filenameGet = toAscii(command[1]);
  let filePathGet;
  if (TESTING) {
    filePathGet = "../server/database/" + filenameGet;
  } else {
    filePathGet = "database/" + filenameGet;
  }

  if (fs.existsSync(filePathGet)) {
    const filenameLength = (filenameGet.length + 1)
      .toString(2)
      .padStart(5, "0");
    const sizeGet = getFileSize(filePathGet);
    const sizeBinary = sizeGet.toString(2).padStart(32, "0");
    const commandGet =
      "001" + filenameLength + " " + toBinary(filenameGet) + " " + sizeBinary;

    serverResponse(commandGet, socket);
    if (!TESTING) {
      send(socket, filenameGet);
    }

    if (!TESTING) {
      console.log("Get request handled with success, data has been sent");
    }
    return commandGet;
  } else {
    serverResponse("011", socket);
    return "011";
  }
}

function handleChange(command, socket) {
  const filenameChange = toAscii(command[1]);
  const filePathChange = "database/" + filenameChange;
  const newFilenameChange = toAscii(command[3]);
  const newFilePathChange = "database/" + newFilenameChange;

  const ext1 = filePathChange.split(".")[2];
  const ext2 = newFilePathChange.split(".")[2];

  if (ext1 !== ext2) {
    serverResponse("101", socket);
  } else {
    fs.rename(filePathChange, newFilePathChange, (err) => {
      if (err) {
        console.error(`Error renaming file`);

        serverResponse("101", socket);
      } else {
        console.log("Change request handled with success");
        serverResponse("000", socket);
      }
    });
  }
}

function handleSummary(command, socket) {
  const filenameSumm = toAscii(command[1]);
  const filePathSumm = "database/" + filenameSumm;

  if (fs.existsSync(filePathSumm)) {
    let summaryFileName = "";
    if (filenameSumm.length > 23) {
      summaryFileName =
        "summary_" + filenameSumm.substring(7, filenameSumm.length);
    } else {
      summaryFileName = "summary_" + filenameSumm;
    }

    const filenameLength = (summaryFileName.length + 1)
      .toString(2)
      .padStart(5, "0");
    const sizeGet = getFileSize(filePathSumm);
    const sizeBinary = sizeGet.toString(2).padStart(32, "0");
    const commandGet =
      "010" +
      filenameLength +
      " " +
      toBinary(summaryFileName) +
      " " +
      sizeBinary;

    serverResponse(commandGet, socket);
    sendSummary(socket, filenameSumm);

    console.log("Summary request handled with success");
  } else {
    serverResponse("011", socket);
  }
}

function send(conn, filename) {
  filename = "database/" + filename;
  let readStream;
  if (connection == "tcp") {
    readStream = fs.createReadStream(filename, { highWaterMark: 1024 });
  }
  if (connection == "udp") {
    readStream = fs.createReadStream(filename);
  }

  readStream.on("data", (data) => {
    if (DEBUG_MODE) {
      console.log("DEBUG DATA SENT TO CLIENT :", data.toString());
    }
    if (connection == "tcp") {
      if (DEBUG_MODE) {
        console.log("DATA SENT TO CLIENT : ", data.toString());
      }
      conn.write(data);
    }
    if (connection == "udp") {
      if (DEBUG_MODE) {
        console.log("DATA SENT TO CLIENT : ", data.toString());
      }
      conn.send(data, sendPort, IP);
    }
  });

  readStream.on("end", () => {
    if (connection == "tcp") {
      conn.write("@#dqwe23ljdhy3ui&^%7w62");
    }
    if (connection == "udp") {
      conn.send("@#dqwe23ljdhy3ui&^%7w62", sendPort, IP);
    }
  });

  readStream.on("error", (err) => {
    console.error(`Error reading file: ${err.message}`);
    //conn.error(); // Close the connection in case of an error
  });
}

function sendSummary(conn, filename) {
  filename = "database/" + filename;
  const readStream = fs.createReadStream(filename);

  readStream.on("data", (data) => {
    if (DEBUG_MODE) {
      console.log("DEBUG DATA SENT TO CLIENT :", data.toString());
    }
    const numbers = data.toString().split(",").map(Number);

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const average = numbers.reduce((acc, num) => acc + num, 0) / numbers.length;
    const numericalData = `The minimum value is : ${min}\nThe maximum value is : ${max}\nThe average value is : ${average}\n`;

    if (connection == "tcp") {
      conn.write(numericalData);
    }
    if (connection == "udp") {
      conn.send(numericalData, sendPort, IP);
    }
  });

  readStream.on("end", () => {
    if (connection == "tcp") {
      conn.write("@#dqwe23ljdhy3ui&^%7w62");
    }
    if (connection == "udp") {
      conn.send("@#dqwe23ljdhy3ui&^%7w62", sendPort, IP);
    }
  });

  readStream.on("error", (err) => {
    console.error(`Error reading file: ${err.message}`);
    //conn.error(); // Close the connection in case of an error
  });
}

function handleHelp(socket, TESTING) {
  const optionsString = `Here are the 6 possible options:
    1. get filename.xxx to retrieve a file from the server
    2. put filename.xxx to store a file in the server
    3. summary filename.xxx to get the statistical summary of a file from the server
    4. change filename.xxx newFileName.xxx to change the name of a file in the server
    5. help for help with the commands
    6. bye to end the connection with the server`;

  const helpAnswer = toBinary(optionsString);
  const opcode =
    "110" + (optionsString.length + 1).toString(2).padStart(5, "0");
  if (!TESTING) {
    console.log("Help request handled with success");
  }
  serverResponse(opcode + " " + helpAnswer, socket);

  return opcode + " " + helpAnswer;
}

function handleUnknown(socket) {
  serverResponse("100", socket);
  console.log("wrong command");
}

function serverResponse(opcode, socket) {
  if (DEBUG_MODE) {
    console.log("DEBUG MODE RESPONSE SENT TO CLIENT :", opcode);
  }
  if (connection == "tcp") {
    socket.write(opcode);
  }
  if (connection == "udp") {
    serverUDP.send(opcode, sendPort, IP, (err) => {
      if (err) {
        console.error("Failed to send response through UDP");
      }
    });
  }
}

function toAscii(bin) {
  return bin.replace(/\s*[01]{8}\s*/g, (bin) =>
    String.fromCharCode(parseInt(bin, 2))
  );
}

function toBinary(str) {
  return str.replace(/[\s\S]/g, (str) => zeroPad(str.charCodeAt().toString(2)));
}

function zeroPad(num) {
  return "00000000".slice(num.length) + num;
}

function handleData(data, writeStream) {
  if (writeStream) {
    writeStream.write(data);
  }
}

function getFileSize(file) {
  try {
    const stats = fs.statSync(file);
    return stats.size;
  } catch (err) {
    console.error(`Error getting file size: ${err.message}`);
    return -1;
  }
}

module.exports = {
  serverResponse,
  handleRequest,
};
