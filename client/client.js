const net = require("net");
const fs = require("fs");
const { toASCII } = require("punycode");

const client = new net.Socket();

const SERVER_IP = process.argv[2] || "127.0.0.1";
const SERVER_PORT = process.argv[3] || 3000;
const DEBUG_MODE = false;
if (process.argv[3] === 1) {
  DEBUG_MODE = true;
}

client.connect(SERVER_PORT, SERVER_IP, () => {
  if (DEBUG_MODE) console.log("Connected to server");
  // Handle user input
  process.stdin.on("data", (data) => {
    const command = data.toString().trim().split(" ");
    formatRequest(command[0], command[1], command[2], client);
  });
});

client.on("data", (data) => {
  console.log("HERE", data.toString());
});

client.on("end", () => {
  if (DEBUG_MODE) console.log("Connection closed");
});

function sendCommand(actionBinary) {
  client.write(actionBinary);
}

function formatRequest(action, file, newFileName, client) {
  let byte0, byte1, byte2, byte3;
  switch (action) {
    case "put":
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
        "000" +
        String(((file.length + 1) & 0b11111).toString(2).padStart(5, "0"));
      byte1 = toBinary(file);
      const sizePut = getFileSize(file);
      if (sizePut == -1) {
        break;
      }

      byte2 = (sizePut & 0b11111111111111111111111111111111)
        .toString(2)
        .padStart(32, "0");

      byte3 = send(client, file);
      if (byte3 == -1) {
        break;
      }

      const commandPut = byte0 + " " + byte1 + " " + byte2 + " " + byte3;
      sendCommand(commandPut);
      break;

    case "get":
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
        "001" +
        String(((file.length + 1) & 0b11111).toString(2).padStart(5, "0"));
      byte1 = toBinary(file);
      const sizeGet = getFileSize(file);
      if (sizeGet == -1) {
        break;
      }
      byte2 = (sizeGet & 0b11111111111111111111111111111111)
        .toString(2)
        .padStart(32, "0");

      const commandGet = byte0 + " " + byte1 + " " + byte2;
      sendCommand(commandGet);
      break;

    case "change":
      if (newFileName === undefined || file === undefined) {
        console.log(`\nYou need two arguments with ${action} command`);
        console.log("Type help for help with the commands\n");
        break;
      }
      if (file.length > 30 || newFileName > 30) {
        console.log("\n The name of the file is too long\n");
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

      const commandChange = byte0 + " " + byte1 + " " + byte2 + " " + byte3;
      sendCommand(commandChange);
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

      const commandSummary = byte0 + " " + byte1;
      sendCommand(commandSummary);

      break;

    case "help":
      byte0 = "10000000";
      const commandHelp = byte0;
      sendCommand(commandHelp);
      break;
    case "bye":
      client.end();
      break;
    default:
      console.log('\nInvalid command. Use "help" for help.\n');
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

function getFileSize(file) {
  let filePath = "./" + file;
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;

    return fileSizeInBytes;
  } catch (err) {
    console.error(`Error getting file size: ${err.message}`);
    return -1;
  }
}

function fileToBinary(file) {
  try {
    let filePath = "./" + file;
    const fileData = fs.readFileSync(filePath);
    const binaryString = fileData.toString("binary");
    const result = toBinary(binaryString);
    console.log(result.length / 8);

    return result;
  } catch (err) {
    console.error(`Error reading file: ${err.message}`);
    return -1;
  }
}

async function fileToBinary2(filePath) {
  try {
    // Read the file and convert to base64
    filePath = "./" + filePath;
    fileData = fs.createReadStream(filePath);
    console.log(fileData);
    return fileData;
  } catch (err) {
    console.error(`Error reading file: ${err.message}`);
    return null;
  }
}

function send(conn, filename) {
  filename = "./" + filename;
  const readStream = fs.createReadStream(filename, { highWaterMark: 1024 });

  readStream.on("data", (data) => {
    conn.write(data);
  });

  readStream.on("end", () => {
    conn.end();
  });

  readStream.on("error", (err) => {
    console.error(`Error reading file: ${err.message}`);
    conn.end(); // Close the connection in case of an error
  });
}
