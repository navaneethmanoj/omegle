import { Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";

const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const userManager = new UserManager()

io.on('connection', (socket: Socket) => {
  console.log("A user connected:", socket.handshake.query.name)
  userManager.addUser(<string>socket.handshake.query.name, socket)
  socket.on("disconnect", () => {
    userManager.removeUser(socket.id)
  })
})

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});