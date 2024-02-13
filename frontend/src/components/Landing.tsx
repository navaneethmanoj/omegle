import { useEffect, useRef, useState } from "react";
import { Room } from "./Room";
import { Navbar } from "./Navbar";

export const Landing = () => {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<null | MediaStreamTrack>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<null | MediaStreamTrack>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getCam = async () => {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    setLocalVideoTrack(videoTrack);
    setLocalAudioTrack(audioTrack);
    if (!videoRef.current) return;
    videoRef.current.srcObject = new MediaStream([videoTrack, audioTrack]);
    // videoRef.current.play()
  };
  const handleHangup = () => {
    setJoined(false)
  }
  const handleJoin = () => {
    if(name === ""){
      alert("Name is required")
    } else {
      setJoined(true)
    }
  }
  useEffect(() => {
    if (videoRef && videoRef.current) {
      getCam();
    }
  }, [videoRef,joined]);

  if (!joined) {
    return (
      <>
        <Navbar />
        <div className="landing">
          <video autoPlay ref={videoRef} width={600}></video>
            <input
              type="text"
              onChange={(e) => setName(e.target.value)}
              value={name}
              className="name-input"
              placeholder="Enter your name"
            />
            <button className="join-btn" onClick={handleJoin}>Join room</button>
        </div>
      </>
    );
  }

  return (
    <Room
      name={name}
      localAudioTrack={localAudioTrack}
      localVideoTrack={localVideoTrack}
      onHangup={handleHangup}
    />
  );
};
