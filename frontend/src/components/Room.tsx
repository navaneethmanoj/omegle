import { useEffect, useState, useRef } from "react";
// import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import { Navbar } from "./Navbar";

const URL = "http://localhost:3000";

type RoomProps = {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  onHangup: () => void;
};

export const Room = ({
  name,
  localAudioTrack,
  localVideoTrack,
  onHangup,
}: RoomProps) => {
  // const [searchParams, setSearchParams] = useSearchParams();
  // const name = searchParams.get("name");
  const [socket, setSocket] = useState<null | Socket>(null);
  const [lobby, setLobby] = useState(true);
  const [roomId, setRoomId] = useState("");
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(
    null
  );
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const handleRemoveTrackEvent = () => {
    console.log("remove track triggered");
    const stream = remoteVideoRef.current?.srcObject;
    const trackList = (stream as MediaStream)?.getTracks();
    if (trackList.length === 0) {
      closeVideoCall();
    }
  };

  const closeVideoCall = () => {
    console.log("Closing");
    const senders = sendingPc?.getSenders();
    senders?.forEach((sender) => {
      sendingPc?.removeTrack(sender);
    });
    setSendingPc((pc) => {
      if (!pc) return pc;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onnegotiationneeded = null;
      // pc.oniceconnectionstatechange = null;
      // pc.onsignalingstatechange = null;
      // pc.onicegatheringstatechange = null;
      return pc;
    });
    setReceivingPc((pc) => {
      if (!pc) return pc;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onnegotiationneeded = null;
      // pc.oniceconnectionstatechange = null;
      // pc.onsignalingstatechange = null;
      // pc.onicegatheringstatechange = null;
      return pc;
    });
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }
    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    sendingPc?.close();
    receivingPc?.close();
    setSendingPc(null);
    setReceivingPc(null);
    localVideoRef.current?.removeAttribute("srcObject");
    remoteVideoRef.current?.removeAttribute("srcObject");
    onHangup();
  };
  const hangUpCall = () => {
    closeVideoCall();
    socket?.emit("hang-up", roomId);
  };

  useEffect(() => {
    const socket = io(URL,{
      query: {
        name
      }
    });
    socket.on("send-offer", async ({ roomId }: { roomId: string }) => {
      setLobby(false);
      setRoomId(roomId);
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
            remoteStream.onremovetrack = handleRemoveTrackEvent;
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
      if (type === "sender") {
        setReceivingPc((pc) => {
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setSendingPc((pc) => {
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    });
    socket.on("hang-up", () => {
      alert("The other person has ended the call")
      closeVideoCall();
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
          <video autoPlay className="remote-video" ref={remoteVideoRef} />
          {lobby ? (
            <p className="lobby-text"> Waiting to connect you to someone</p>
          ) : null}
          <div className="lower-video-area">
            <button className="hang-up-btn" onClick={hangUpCall}>
              Hang up
            </button>
            <video autoPlay className="local-video" ref={localVideoRef} />
          </div>
        </div>
        <div className="chat-container"></div>
      </div>
    </>
  );
};
