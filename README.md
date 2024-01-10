This repository contains a client-server application for communication using both TCP and UDP protocols. Follow the instructions below to run the client and server files, and choose between debug modes.

### Run the Client

# Debug Mode ON
node client.js 1

# Debug Mode OFF
node client.js 0


Follow the on-screen instructions to choose between TCP and UDP.

If TCP is chosen:


# Provide the IP address and port number
ex: localhost 3000


If UDP is chosen:


# Provide the IP address and a port number different from 3000
ex: localhost 3001


Hit `help` for available commands.

### Run the Server


# Debug Mode ON
node server.js 3000 1

# Debug Mode OFF
node server.js 3000 0


## Testing

Run the testing files:

# Test 1
node test_1.js 0

# Test 2
node test_2.js 0


## Note

- Ensure correct port numbers and debug modes are used for both client and server.
- For UDP, the client's port number must differ from 3000.

Feel free to explore and contribute to this project. If you encounter any issues or have suggestions, please create an issue in the repository.
