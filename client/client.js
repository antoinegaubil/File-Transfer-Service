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
    formatRequest(command[0], command[1], command[2]);
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

function formatRequest(action, file, newFileName) {
  let byte0, byte1, byte2, byte3;
  switch (action) {
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
      break;
    //sendCommand(action, file);
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
      const size = getFileSize(file);
      if (size == -1) {
        break;
      }
      byte2 = (size & 0b11111111111111111111111111111111)
        .toString(2)
        .padStart(32, "0");

      byte3 = fileToBinary(file);
      if (file == -1) {
        break;
      }

      const command = byte0 + " " + byte1 + " " + byte2 + " " + byte3;
      sendCommand(command);
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
      break;

    case "help":
      /*console.log('\nHere are the 6 possible options : \n')
      console.log('1. get filename.xxx to retrieve a file from the server\n');
      console.log('2. put filename.xxx to store a file in the server\n');
      console.log('3. summary filename.xxx to get the statistical summary of a file from the server\n')
      console.log('4. change filename.xxx newFileName.xxx to change the name of a file in the server\n');
      console.log('5. help for help with the commands\n');
      console.log('6. bye to end the connection with the server\n');*/

      //sendRequest to the server which answers the following ^^
      break;
    case "bye":
      client.end();
      break;
    default:
      console.log('\nInvalid command. Use "get", "put", or "quit".\n');
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

      return result;
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      return -1;
    }
  }
}
