/*
Antoine Gaubil 40115052
Kevin Emmanuel, 40066565
We certify this work is ours.
*/

const readline = require("readline");
const dgram = require("dgram");
const net = require("net");
const fs = require("fs");
const UDP = require("dgram");
let clientUDP = UDP.createSocket("udp4");
let client = new net.Socket();
let clientData = "";
let SERVER_IP = "";
let SERVER_PORT = "";
let DEBUG_MODE = false;
let TESTING = false;
let firstByte = true;
let connection = "";

if (process.argv[2] === "1") {
  DEBUG_MODE = true;
}
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: connection + "> ",
});

// Ask the user to choose between TCP and UDP
function askProtocol() {
  rl.question("Choose protocol (TCP/UDP): ", (protocol) => {
    connection = protocol.toLocaleLowerCase();
    if (protocol.toLowerCase() === "tcp") {
      askTcpDetails();
    } else if (protocol.toLowerCase() === "udp") {
      askUdpDetails();
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
      startClient();
    } else {
      console.log("Invalid input. Please provide IP address and Port number.");
      askTcpDetails();
    }
  });
}

function askUdpDetails() {
  rl.question("Provide IP address and Port Number: ", (details) => {
    const commandArgs = details.trim().split(" ");
    if (commandArgs[0] && commandArgs[1] && commandArgs[1] !== "3000") {
      SERVER_IP = commandArgs[0];
      SERVER_PORT = commandArgs[1];
      startClient();
    } else {
      if (commandArgs[1] == "3000") {
        console.log(
          "In UDP connection, the server is running on port 3000, you cannot pick the same port!"
        );
      } else {
        console.log(
          "Invalid input. Please provide IP address and Port number."
        );
      }
      askUdpDetails();
    }
  });
}

if (require.main === module) {
  askProtocol();
}

function startClient() {
  rl.setPrompt(connection + "> ");
  rl.on("line", (line) => {
    const commandArgs = line.trim().split(" ");
    clientData = commandArgs;
    let localClient;
    if (connection == "udp") {
      localClient = clientUDP;
    }
    if (connection == "tcp") {
      localClient = client;
    }
    formatRequest(
      commandArgs[0],
      commandArgs[1],
      commandArgs[2],
      localClient,
      TESTING
    );
  });
  rl.prompt();

  rl.on("close", () => {
    console.log("Session has been terminated. Exiting...");
    process.exit(0);
  });

  if (connection == "tcp") {
    client.connect(SERVER_PORT, SERVER_IP, () => {
      if (DEBUG_MODE) console.log("Connected to server");
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
    });
  }
}

clientUDP.on("message", (message) => {
  if (firstByte) {
    if (DEBUG_MODE) {
      console.log("DEBUG MODE RESPONSE FROM SERVER :", message.toString());
    }
    handleServerResponse(message);
  }
});

clientUDP.on("close", () => {
  rl.close();
});

function sendCommand(actionBinary) {
  if (DEBUG_MODE) {
    console.log("DEBUG MODE COMMAND SENT TO SERVER :", actionBinary);
  }

  if (connection == "tcp") {
    client.write(actionBinary, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
  if (connection == "udp") {
    clientUDP.send(actionBinary, 3000, SERVER_IP, (err) => {
      if (err) {
        console.error("Failed to send packet through UDP");
      }
    });
  }
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
        rl.prompt();
        break;
      }
      if (file.length > 30) {
        console.log("\n The name of the file is too long\n");
        rl.prompt();
        break;
      }
      if (file.substr(file.lastIndexOf(".") + 1, 3) !== "txt") {
        console.log("Only txt files can be summarized");
        rl.prompt();
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
      if (connection == "tcp") {
        client.end();
      }
      if (connection == "udp") {
        clientUDP.close();
      }

      break;
    default:
      console.log('\nInvalid command. Use "help" for help.\n');
      if (!TESTING) {
        rl.prompt();
      }
  }

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
  let readStream;
  if (connection == "tcp") {
    readStream = fs.createReadStream(filename, { highWaterMark: 1024 });
  }
  if (connection == "udp") {
    readStream = fs.createReadStream(filename);
  }
  readStream.on("data", (data) => {
    if (DEBUG_MODE) {
      console.log("DEBUG MODE DATA SENT TO SERVER :", data.toString());
    }
    if (connection == "tcp") {
      conn.write(data);
    }
    if (connection == "udp") {
      conn.send(data, 3000, SERVER_IP);
    }
  });

  readStream.on("end", () => {
    if (connection == "tcp") {
      conn.write("@#dqwe23ljdhy3ui&^%7w62");
    }
    if (connection == "udp") {
      conn.send("@#dqwe23ljdhy3ui&^%7w62", 3000, SERVER_IP);
    }
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
    if (data.toString().includes("@#dqwe23ljdhy3ui&^%7w62")) {
      const finishedIndex = data.toString().indexOf("@#dqwe23ljdhy3ui&^%7w62");
      const remainingData = data.toString().slice(0, finishedIndex);

      writeStream.write(remainingData);
      writeStream.end();
      isWritting = false;

      console.log(`"${filename}" has been downloaded successfully.`);

      if (connection == "tcp") {
        socket.off("data", onData);
      }
      if (connection == "udp") {
        clientUDP.off("message", onData);
      }

      firstByte = true;

      rl.prompt();
    } else {
      handleData(data, writeStream, socket);
    }
  }

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
    clientUDP.on("message", onData);
    clientUDP.on("error", (err) => {
      if (isWritting) {
        console.error(`Error reading the file!`);
        writeStream.end();
      }
    });
  }
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
    if (data.toString().includes("@#dqwe23ljdhy3ui&^%7w62")) {
      const finishedIndex = data.toString().indexOf("@#dqwe23ljdhy3ui&^%7w62");
      const remainingData = data.toString().slice(0, finishedIndex);

      writeStream.write(remainingData);
      writeStream.end();
      isWritting = false;

      console.log(`"${filename}" has been downloaded successfully.`);

      if (connection == "tcp") {
        socket.off("data", onData);
      }
      if (connection == "udp") {
        clientUDP.off("message", onData);
      }

      firstByte = true;

      rl.prompt();

      socket.off("data", onData);
    } else {
      handleData(data, writeStream, socket);
    }
  }

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
    clientUDP.on("message", onData);
    clientUDP.on("error", (err) => {
      if (isWritting) {
        console.error(`Error reading the file!`);
        writeStream.end();
      }
    });
  }
}

module.exports = {
  formatRequest,
  sendCommand,
};
