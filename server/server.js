const net = require("net");
const fs = require("fs");

const PORT = process.argv[2] || 3000;
let DEBUG_MODE = false;
let firstByte = true;

const server = net.createServer();

server.on("connection", (socket) => {
  console.log("\nClient connected\n");

  socket.on("data", (data) => {
    if (firstByte) {
      handleRequest(data, socket);
    }
  });

  socket.on("end", () => {
    console.log("\nClient disconnected\n");
  });

  socket.on("error", (err) => {
    console.error(`\nCONNECTION LOST WITH THE CLIENT\n`);
    // Handle the error event
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

function handleRequest(data, socket) {
  try {
    const command = data.toString().trim().split(" ");
    const opcode = command[0].substring(0, 3);

    if (opcode === "000") {
      firstByte = false;
      handlePut(command, socket);
    } else if (opcode === "001") {
      handleGet(command, socket);
    } else if (opcode === "010") {
      handleChange(command, socket);
    } else if (opcode === "011") {
      handleSummary(command, socket);
    } else if (opcode === "100") {
      handleHelp(socket);
    } else {
      handleUnknown(socket);
    }
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
  }
}

function handlePut(command, socket) {
  const filename = toAscii(command[1]);
  const filePath = "./" + filename;

  const writeStream = fs.createWriteStream(filePath);
  let isWritting = false;

  function onData(data) {
    isWritting = true;
    if (data.toString().includes("finished")) {
      const finishedIndex = data.toString().indexOf("finished");
      const remainingData = data.toString().slice(0, finishedIndex);

      writeStream.write(remainingData);
      writeStream.end();
      isWritting = false;

      console.log("Put request handled with success");
      serverResponse("000", socket);

      firstByte = true;

      // Remove the "data" event listener
      socket.off("data", onData);
    } else {
      handleData(data, writeStream, socket);
    }
  }

  socket.on("data", onData);

  socket.on("end", () => {});

  socket.on("error", (err) => {
    if (isWritting) {
      console.error(`Error reading the file!`);
      writeStream.end();
    }
  });
}

function handleGet(command, socket) {
  const filenameGet = toAscii(command[1]);
  const filePathGet = "./" + filenameGet;

  if (fs.existsSync(filePathGet)) {
    const filenameLength = (filenameGet.length + 1)
      .toString(2)
      .padStart(5, "0");
    const sizeGet = getFileSize(filePathGet);
    const sizeBinary = sizeGet.toString(2).padStart(32, "0");
    const commandGet =
      "001" + filenameLength + " " + toBinary(filenameGet) + " " + sizeBinary;

    serverResponse(commandGet, socket);
    send(socket, filenameGet);

    console.log("Get request handled with success, data has been sent");
  } else {
    serverResponse("011", socket);
  }
}

function handleChange(command, socket) {
  const filenameChange = toAscii(command[1]);
  const filePathChange = "./" + filenameChange;
  const newFilenameChange = toAscii(command[3]);
  const newFilePathChange = "./" + newFilenameChange;

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
  console.log("Summary request handled with success");
  serverResponse("010", socket);
}

function send(conn, filename) {
  filename = "./" + filename;
  const readStream = fs.createReadStream(filename, { highWaterMark: 1024 });

  readStream.on("data", (data) => {
    conn.write(data);
  });

  readStream.on("end", () => {
    conn.write("finished");
  });

  readStream.on("error", (err) => {
    console.error(`Error reading file: ${err.message}`);
    //conn.error(); // Close the connection in case of an error
  });
}

function handleHelp(socket) {
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
  console.log("Help request handled with success");
  serverResponse(opcode + " " + helpAnswer, socket);
}

function handleUnknown(socket) {
  serverResponse("100", socket);
  console.log("wrong command");
}

function serverResponse(opcode, socket) {
  socket.write(opcode);
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
