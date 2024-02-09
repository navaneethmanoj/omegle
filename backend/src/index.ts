import { Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";

const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server,{
  cors: {
    origin: "http://localhost:5173"
  }
});

const userManager = new UserManager()

io.on('connection',(socket: Socket) => {
    console.log("A user connected")
    userManager.addUser("random",socket)
    socket.on("disconnect",() => {
      userManager.removeUser(socket.id)
    })
})

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});