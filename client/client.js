const readline = require("readline");
const dgram = require("dgram");
const net = require("net");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "ftp> ",
});

let client;
let clientData = "";
let SERVER_IP = "";
let SERVER_PORT = "";
let DEBUG_MODE = false;
let TESTING = false;
let firstByte = true;

if (process.argv[2] === "1") {
  DEBUG_MODE = true;
}

// Ask the user to choose between TCP and UDP
function askProtocol() {
  rl.question("Choose protocol (TCP/UDP): ", (protocol) => {
    if (protocol.toLowerCase() === "tcp") {
      askTcpDetails();
    } else if (protocol.toLowerCase() === "udp") {
      client = dgram.createSocket("udp4");
      startClient();
    } else {
      console.log("Invalid choice.");
      askProtocol();
    }
  });
}

function askTcpDetails() {
  rl.question("Provide IP address and Port Number: ", (details) => {
    const commandArgs = details.trim().split(" ");
    if (commandArgs[0] && commandArgs[1]) {
      SERVER_IP = commandArgs[0];
      SERVER_PORT = commandArgs[1];
      client = new net.Socket();
      startClient();
    } else {
      console.log("Invalid input. Please provide IP address and Port number.");
      askTcpDetails();
    }
  });
}

if (require.main === module) {
  askProtocol();
}

function startClient() {
  rl.on("line", (line) => {
    const commandArgs = line.trim().split(" ");
    clientData = commandArgs;
    formatRequest(
      commandArgs[0],
      commandArgs[1],
      commandArgs[2],
      client,
      TESTING
    );
  });

  rl.on("close", () => {
    console.log("Session has been terminated. Exiting...");
    process.exit(0);
  });

  client.connect(SERVER_PORT, SERVER_IP, () => {
    if (DEBUG_MODE) console.log("Connected to server");
    rl.prompt();
  });

  client.on("data", (data) => {
    if (firstByte) {
      if (DEBUG_MODE) {
        console.log("DEBUG MODE RESPONSE FROM SERVER :", data.toString());
      }
      handleServerResponse(data);
    }
  });

  client.on("end", () => {
    rl.close();
    console.log("The session has been terminated");
  });
}

function sendCommand(actionBinary) {
  if (DEBUG_MODE) {
    console.log("DEBUG MODE COMMAND SENT TO SERVER :", actionBinary);
  }
  client.write(actionBinary);
}

function formatRequest(action, file, newFileName, client, isTesting) {
  let byte0, byte1, byte2, byte3, command;
  TESTING = isTesting;
  switch (action) {
    case "put":
      if (file === undefined) {
        console.log(`\nYou need an argument with ${action} command`);
        console.log("Type help for help with the commands\n");
        rl.prompt();
        break;
      }
      if (file.length > 30) {
        console.log("\n The name of the file is too long\n");
        rl.prompt();
        break;
      }

      byte0 =
        "000" +
        String(((file.length + 1) & 0b11111).toString(2).padStart(5, "0"));
      byte1 = toBinary(file);
      const sizePut = getFileSize(file);
      if (sizePut == -1) {
        rl.prompt();
        break;
      }

      byte2 = (sizePut & 0b11111111111111111111111111111111)
        .toString(2)
        .padStart(32, "0");

      command = byte0 + " " + byte1 + " " + byte2;
      if (!TESTING) {
        sendCommand(command);
        send(client, file);
      }

      break;

    case "get":
      if (file === undefined) {
        console.log(`\nYou need an argument with ${action} command`);
        console.log("Type help for help with the commands\n");
        rl.prompt();
        break;
      }
      if (file.length > 30) {
        console.log("\n The name of the file is too long\n");
        rl.prompt();
        break;
      }
      byte0 =
        "001" +
        String(((file.length + 1) & 0b11111).toString(2).padStart(5, "0"));
      byte1 = toBinary(file);

      command = byte0 + " " + byte1;
      if (!TESTING) {
        sendCommand(command);
      }
      break;

    case "change":
      if (newFileName === undefined || file === undefined) {
        console.log(`\nYou need two arguments with ${action} command`);
        console.log("Type help for help with the commands\n");
        rl.prompt();
        break;
      }
      if (file.length > 30 || newFileName > 30) {
        console.log("\n The name of the file is too long\n");
        rl.prompt();
        break;
      }
      byte0 =
        "010" +
        String(((file.length + 1) & 0b11111).toString(2).padStart(5, "0"));

      byte1 = toBinary(file);

      byte2 = String(
        ((newFileName.length + 1) & 0b11111111).toString(2).padStart(8, "0")
      );

      byte3 = toBinary(newFileName);

      command = byte0 + " " + byte1 + " " + byte2 + " " + byte3;
      if (!TESTING) {
        sendCommand(command);
      }
      break;

    case "summary":
      if (file === undefined) {
        console.log(`\nYou need an argument with ${action} command`);
        console.log("Type help for help with the commands\n");
        break;
      }
      if (file.length > 30) {
        console.log("\n The name of the file is too long\n");
        break;
      }
      byte0 =
        "011" +
        String(((file.length + 1) & 0b11111).toString(2).padStart(5, "0"));

      byte1 = toBinary(file);

      command = byte0 + " " + byte1;
      if (!TESTING) {
        sendCommand(command);
      }

      break;

    case "help":
      byte0 = "10000000";
      command = byte0;
      if (!TESTING) {
        sendCommand(command);
      }
      break;
    case "bye":
      client.end();
      break;
    default:
      console.log('\nInvalid command. Use "help" for help.\n');
      if (!TESTING) {
        rl.prompt();
      }
  }

  console.log("this is the command!");

  return command;
}

function handleServerResponse(data) {
  const command = data.toString().trim().split(" ");

  const opcode = command[0].substring(0, 3);

  if (opcode === "000" && clientData[0] === "put") {
    console.log(clientData[1], "has been uploaded successfully");
  } else if (opcode === "000" && clientData[2]) {
    console.log(
      "file",
      clientData[1],
      "has been succesfully changed to",
      clientData[2]
    );
  } else if (opcode === "001") {
    firstByte = false;
    getRequest(command, client);
  } else if (opcode === "010") {
    firstByte = false;
    summaryRequest(command, client);
  } else if (opcode === "011") {
    console.log("Error : file", clientData[1], "not found in the database");
  } else if (opcode === "100") {
    console.log("Command Not Found");
  } else if (opcode === "101") {
    console.log(
      "The change of",
      clientData[1],
      "to",
      clientData[2],
      "has been unsuccesful"
    );
  } else if (opcode === "110") {
    console.log(toAscii(command[1]));
  }

  if (opcode !== "001" && opcode !== "010") {
    rl.prompt();
  }
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

function toAscii(bin) {
  const result = bin.replace(/\s*[01]{8}\s*/g, function (bin) {
    return String.fromCharCode(parseInt(bin, 2));
  });
  return result;
}
function handleData(data, writeStream) {
  if (writeStream) {
    writeStream.write(data);
  }
}

function getFileSize(file) {
  let filePath;
  if (!TESTING) {
    filePath = "files/" + file;
  } else {
    filePath = "../client/files/" + file;
  }

  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;

    return fileSizeInBytes;
  } catch (err) {
    console.error(`Error getting file size: ${err.message}`);
    return -1;
  }
}

function send(conn, filename) {
  if (!TESTING) {
    filename = "files/" + filename;
  } else {
    filename = "../client/files/" + filename;
  }
  const readStream = fs.createReadStream(filename, { highWaterMark: 1024 });

  readStream.on("data", (data) => {
    if (DEBUG_MODE) {
      console.log("DEBUG MODE DATA SENT TO SERVER :", data.toString());
    }
    conn.write(data);
  });

  readStream.on("end", () => {
    conn.write("finished");
  });

  readStream.on("error", (err) => {
    console.error(`Error reading file: ${err.message}`);
  });
}

function getRequest(command, socket) {
  const filename = toAscii(command[1]);
  let filePath;
  if (!TESTING) {
    filePath = "files/" + filename;
  } else {
    filePath = "../client/files/" + filename;
  }

  const writeStream = fs.createWriteStream(filePath);
  let isWritting = false;

  function onData(data) {
    isWritting = true;
    if (DEBUG_MODE) {
      console.log("DEBUG MODE DATA RECEIVED FROM SERVER : ", data.toString());
    }
    if (data.toString().includes("finished")) {
      const finishedIndex = data.toString().indexOf("finished");
      const remainingData = data.toString().slice(0, finishedIndex);

      writeStream.write(remainingData);
      writeStream.end();
      isWritting = false;

      console.log(`"${filename}" has been downloaded successfully.`);

      firstByte = true;

      rl.prompt();

      socket.off("data", onData);
    } else {
      handleData(data, writeStream, socket);
    }
  }

  socket.on("data", onData);

  socket.on("end", () => {});

  socket.on("error", () => {
    if (isWritting) {
      console.error(`Error reading the file!`);
      writeStream.end();
    }
  });
}

function summaryRequest(command, socket) {
  const filename = toAscii(command[1]);

  let filePath;
  if (!TESTING) {
    filePath = "files/" + filename;
  } else {
    filePath = "../client/files/" + filename;
  }

  const writeStream = fs.createWriteStream(filePath);
  let isWritting = false;

  function onData(data) {
    isWritting = true;
    if (DEBUG_MODE) {
      console.log("DEBUG MODE DATA RECEIVED FROM SERVER : ", data.toString());
    }
    if (data.toString().includes("finished")) {
      const finishedIndex = data.toString().indexOf("finished");
      const remainingData = data.toString().slice(0, finishedIndex);

      writeStream.write(remainingData);
      writeStream.end();
      isWritting = false;

      console.log(`"${filename}" has been downloaded successfully.`);

      firstByte = true;

      rl.prompt();

      socket.off("data", onData);
    } else {
      handleData(data, writeStream, socket);
    }
  }

  socket.on("data", onData);

  socket.on("end", () => {});

  socket.on("error", () => {
    if (isWritting) {
      console.error(`Error reading the file!`);
      writeStream.end();
    }
  });
}

module.exports = {
  formatRequest,
  sendCommand,
};
