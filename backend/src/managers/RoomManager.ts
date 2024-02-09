import { User } from "./UserManager"

let GLOBAL_ROOM_ID = 1

interface Room {
    user1: User
    user2: User
}

export class RoomManager {
    private rooms: Map<string, Room>

    constructor() {
        this.rooms = new Map<string, Room>()
    }

    createRoom(user1: User, user2: User) {
        const roomId = this.generate().toString()
        this.rooms.set(roomId, { user1, user2 })
        console.log("Room created:",this.rooms)
        user1?.socket.emit("send-offer", {
            roomId
        })
        user2.socket.emit("send-offer",{
            roomId
        })
    }

    onOffer(sdp: any, roomId: string, senderSocketId: string ) {
        const room = this.rooms.get(roomId)
        if(!room)
            return
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1
        console.log("Rooms:",this.rooms)
        console.log("forwarding offer to user2:",room.user2?.socket.id)
        receivingUser?.socket.emit("offer", {
            sdp,
            roomId
        })
    }
    onAnswer(sdp:any,roomId:string,senderSocketId: string){
        const room = this.rooms.get(roomId)
        if(!room)
            return        
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1
        receivingUser?.socket.emit("answer",{
            sdp,
            roomId
        })
    }
    onIceCandidate(candidate: any,roomId: string,type: "sender" | "receiver",senderSocketId: string){
        const room = this.rooms.get(roomId)
        if(!room)
            return
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1
        receivingUser.socket.emit("new-ice-candidate",{candidate,type})
    }
    generate() {
        return GLOBAL_ROOM_ID++
    }
}
