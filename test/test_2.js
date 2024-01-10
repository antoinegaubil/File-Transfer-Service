const net = require("net");
const clientFunctions = require("../client/client.js");
const serverFunctions = require("../server/server.js");

const { formatRequest } = clientFunctions;
const { handleRequest } = serverFunctions;

let client = new net.Socket();

testGet();
testPut();

function testGet() {
  //from input get.txt, call the client formatRequest and check if it is correct. With that result, use it in the server functions to see if the handleRequest function will send back the correct data.
  const result = formatRequest("get", "file.txt", "", client, true); //as
  //get opcode : 001, file.txt.length+1 = 01001
  //file.txt to binary = 0110011001101001011011000110010100101110011101000111100001110100
  console.log(result);
  if (
    result ==
    "00101001 0110011001101001011011000110010100101110011101000111100001110100"
  ) {
    console.log("Client handle request for get passed.");
  }
  const response = handleRequest(result, client, true);
  if (response.substring(0, 3) == "001") {
    console.log("Get Case Passed!");
  }
}

function testPut() {
  //from input put file.txt, call the client formatRequest and check if it is correct. With that result, use it in the server functions to see if the handleRequest function will send back the correct data.
  //get opcode : 001, file.txt.length+1 = 01001
  //file.txt to binary = 0110011001101001011011000110010100101110011101000111100001110100
  const result = formatRequest("put", "file.txt", "", client, true);
  if (
    result ==
    "00001001 0110011001101001011011000110010100101110011101000111100001110100 00000000000000000000000000011011"
  ) {
    console.log("Client handle request for put passed.");
  }
  const response = handleRequest(result, client, true);
  if (response.substring(0, 3) == "000") {
    console.log("Put Case Passed!");
  }
}
