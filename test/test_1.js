const net = require("net");
const clientFunctions = require("../client/client.js");
const serverFunctions = require("../server/server.js");

const { formatRequest } = clientFunctions;
const { serverResponse, handleRequest } = serverFunctions;

let client;

client = new net.Socket();
let SERVER_IP = "localhost";
let SERVER_PORT = "3000";

client.connect(SERVER_PORT, SERVER_IP, () => {
  //testPut();
  //testGet();
  testHelp();
  client.end();
});

function testHelp() {
  const result = formatRequest("help", "", "", client, true);
  const response = handleRequest(result, client);
  if (
    response ===
    "110110010101 0100100001100101011100100110010100100000011000010111001001100101001000000111010001101000011001010010000000110110001000000111000001101111011100110111001101101001011000100110110001100101001000000110111101110000011101000110100101101111011011100111001100111010000010100010000000100000001000000010000000110001001011100010000001100111011001010111010000100000011001100110100101101100011001010110111001100001011011010110010100101110011110000111100001111000001000000111010001101111001000000111001001100101011101000111001001101001011001010111011001100101001000000110000100100000011001100110100101101100011001010010000001100110011100100110111101101101001000000111010001101000011001010010000001110011011001010111001001110110011001010111001000001010001000000010000000100000001000000011001000101110001000000111000001110101011101000010000001100110011010010110110001100101011011100110000101101101011001010010111001111000011110000111100000100000011101000110111100100000011100110111010001101111011100100110010100100000011000010010000001100110011010010110110001100101001000000110100101101110001000000111010001101000011001010010000001110011011001010111001001110110011001010111001000001010001000000010000000100000001000000011001100101110001000000111001101110101011011010110110101100001011100100111100100100000011001100110100101101100011001010110111001100001011011010110010100101110011110000111100001111000001000000111010001101111001000000110011101100101011101000010000001110100011010000110010100100000011100110111010001100001011101000110100101110011011101000110100101100011011000010110110000100000011100110111010101101101011011010110000101110010011110010010000001101111011001100010000001100001001000000110011001101001011011000110010100100000011001100111001001101111011011010010000001110100011010000110010100100000011100110110010101110010011101100110010101110010000010100010000000100000001000000010000000110100001011100010000001100011011010000110000101101110011001110110010100100000011001100110100101101100011001010110111001100001011011010110010100101110011110000111100001111000001000000110111001100101011101110100011001101001011011000110010101001110011000010110110101100101001011100111100001111000011110000010000001110100011011110010000001100011011010000110000101101110011001110110010100100000011101000110100001100101001000000110111001100001011011010110010100100000011011110110011000100000011000010010000001100110011010010110110001100101001000000110100101101110001000000111010001101000011001010010000001110011011001010111001001110110011001010111001000001010001000000010000000100000001000000011010100101110001000000110100001100101011011000111000000100000011001100110111101110010001000000110100001100101011011000111000000100000011101110110100101110100011010000010000001110100011010000110010100100000011000110110111101101101011011010110000101101110011001000111001100001010001000000010000000100000001000000011011000101110001000000110001001111001011001010010000001110100011011110010000001100101011011100110010000100000011101000110100001100101001000000110001101101111011011100110111001100101011000110111010001101001011011110110111000100000011101110110100101110100011010000010000001110100011010000110010100100000011100110110010101110010011101100110010101110010"
  ) {
    console.log("Help Case Passed!");
  }
  return;
}

function testGet() {
  const result = formatRequest("get", "file.txt", "", client, true);
  //get opcode : 001, file.txt.length+1 = 01001
  //file.txt to binary = 0110011001101001011011000110010100101110011101000111100001110100
  if (
    result ===
    "00101001 0110011001101001011011000110010100101110011101000111100001110100"
  ) {
    console.log("Get Case Passed!");
  }
}

function testPut() {
  const result = formatRequest("put", "file.txt", "", client, true);

  //get opcode : 001, file.txt.length+1 = 01001
  //file.txt to binary = 0110011001101001011011000110010100101110011101000111100001110100log("put: ", result);

  if (
    result ===
    "00001001 0110011001101001011011000110010100101110011101000111100001110100 00000000000000000000000000001011"
  ) {
    console.log("Put Case Passed!");
  }
}