import { Socket } from "socket.io"
import { RoomManager } from "./RoomManager"

export interface User {
    socket: Socket
    name: String
}
export class UserManager {
    private users: User[]
    private queue: string[]
    private roomManager: RoomManager

    constructor() {
        this.users = []
        this.queue = []
        this.roomManager = new RoomManager()
    }
    addUser(name: string, socket: Socket) {
        this.users.push({
            socket,name
        })
        this.queue.push(socket.id)
        socket.emit("lobby")
        this.clearQueue()
        this.initHandlers(socket)
    }

    removeUser(socketId: string) {
        const user = this.users.find(x => x.socket.id === socketId)

        this.users = this.users.filter(x => x.socket.id !== socketId)
        // TODO:
        this.queue = this.queue.filter(x => x === socketId)
    }

    clearQueue(){
        if(this.queue.length<2){
            return
        }
        console.log("Queue:",this.queue)
        const id1 = this.queue.pop()
        const id2 = this.queue.pop()
        const user1 = this.users.find(x => x.socket.id === id1)
        const user2 = this.users.find(x => x.socket.id === id2)

        if (!user1 || !user2)
            return

        const room = this.roomManager.createRoom(user1,user2)
        this.clearQueue()
    }

    initHandlers(socket: Socket){
        socket.on("offer",({sdp,roomId}: {sdp: any,roomId:string}) => {
            this.roomManager.onOffer(sdp,roomId,socket.id)
        })
        socket.on("answer",({sdp,roomId}: {sdp: any,roomId:string}) => {
            this.roomManager.onAnswer(sdp,roomId,socket.id)
        })
        socket.on("new-ice-candidate",({candidate,roomId,type}: {candidate: any,roomId: string,type: "sender" | "receiver"}) => {
            this.roomManager.onIceCandidate(candidate,roomId,type,socket.id)
        })
    }
}