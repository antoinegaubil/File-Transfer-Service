Run the Client file :
node client.js 1 --> Debug Mode ON
node client.js 0 --> Debug Mode OFF

Then follow the instructions to choose TCP or UDP
If TCP is chosen --> give the IP address and port number : localhost 3000
If UDP is chosen --> give the IP addres and port number but port number cannot be 3000 for the client, we ask you to put port number 3000 for the server and any other port number for the client : localhost 3001
hit help for the commands.

Run the Server file :
node server.js 3000 1 --> port number 3000 Debug Mode ON
node server.js 3000 0 --> port number 3000 Debug Mode OFF

TESTING FILES :

node test_1.js 0
node test_2.js 0
