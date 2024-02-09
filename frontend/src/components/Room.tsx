import { useEffect, useState, useRef } from "react";
// import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import { Navbar } from "./Navbar";

const URL = "http://localhost:3000";

type RoomProps = {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
};

export const Room = ({ name, localAudioTrack, localVideoTrack }: RoomProps) => {
  // const [searchParams, setSearchParams] = useSearchParams();
  // const name = searchParams.get("name");
  const [socket, setSocket] = useState<null | Socket>(null);
  const [lobby, setLobby] = useState(true);
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(
    null
  );
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = io(URL);
    socket.on("send-offer", async ({ roomId }: { roomId: string }) => {
      setLobby(false);
      const pc = new RTCPeerConnection();
      setSendingPc(pc);
      if (localVideoTrack) {
        pc.addTrack(localVideoTrack);
      }
      if (localAudioTrack) {
        pc.addTrack(localAudioTrack);
      }
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          socket.emit("new-ice-candidate", {
            candidate: e.candidate,
            roomId,
            type: "sender",
          });
        }
      };
      pc.onnegotiationneeded = async () => {
        const sdp = await pc.createOffer();
        pc.setLocalDescription(sdp);
        socket.emit("offer", {
          sdp,
          roomId,
        });
      };
    });

    socket.on(
      "offer",
      async ({
        sdp: remoteSdp,
        roomId,
      }: {
        sdp: RTCSessionDescription;
        roomId: string;
      }) => {
        setLobby(false);
        let remoteStream: MediaStream | null = null;
        const pc = new RTCPeerConnection();
        pc.ontrack = (e) => {
          console.log("track added");
          if (!remoteStream) {
            remoteStream = new MediaStream();
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            // remoteVideoRef.current.srcObject = e.streams[0];
          }
          remoteStream.addTrack(e.track);
          remoteVideoRef.current?.play();
        };

        pc.setRemoteDescription(remoteSdp);
        const sdp = await pc.createAnswer();
        pc.setLocalDescription(sdp);
        //trickle ice

        pc.onicecandidate = async (e) => {
          console.log("on ice candidate on receiving side");
          if (e.candidate) {
            socket.emit("new-ice-candidate", {
              candidate: e.candidate,
              roomId,
              type: "receiver",
            });
          }
        };
        setReceivingPc(pc);

        socket.emit("answer", {
          sdp,
          roomId,
        });
        // setTimeout(() => {
        //   const track1 = pc.getTransceivers()[0].receiver.track;
        //   const track2 = pc.getTransceivers()[1].receiver.track;
        //   stream.addTrack(track1);
        //   stream.addTrack(track2);
        //   if (remoteVideoRef.current) {
        //     remoteVideoRef.current.srcObject = stream;
        //     remoteVideoRef.current.play()
        //   }
        // }, 5000);
      }
    );

    socket.on(
      "answer",
      ({
        sdp: remoteSdp,
        roomId,
      }: {
        sdp: RTCSessionDescription;
        roomId: string;
      }) => {
        setLobby(false);
        setSendingPc((pc) => {
          pc?.setRemoteDescription(remoteSdp);
          return pc;
        });
      }
    );
    socket.on("lobby", () => {
      setLobby(true);
    });
    socket.on("new-ice-candidate", ({ candidate, type }) => {
      const iceCandidate = new RTCIceCandidate(candidate);
      if (type === "sender") {
        setReceivingPc((pc) => {
          pc?.addIceCandidate(iceCandidate);
          return pc;
        });
      } else {
        setSendingPc((pc) => {
          pc?.addIceCandidate(iceCandidate);
          return pc;
        });
      }
    });
    setSocket(socket);
  }, [name, localAudioTrack, localVideoTrack]);

  useEffect(() => {
    if (localVideoRef.current) {
      if (localVideoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
        localVideoRef.current.play();
      }
    }
  }, [localVideoRef, localVideoTrack]);

  return (
    <>
      <Navbar />
      <div className="room-container">
        <div className="videos-container">
          <video
            autoPlay
            className="remote-video"
            ref={remoteVideoRef}
          />
          {lobby ? <p className="lobby-text"> Waiting to connect you to someone</p> : null}
          <video
            autoPlay
            className="local-video"
            ref={localVideoRef}
          />
        </div>
        <div className="chat-container"></div>
      </div>
    </>
  );
};
