export default function VideoCall({ roomName, height = 500 }) {
  const url = `https://meet.jit.si/${roomName}`;
  return (
    <div style={{ marginTop: 10 }}>
      <iframe
        title="Jitsi Video"
        src={url}
        allow="camera; microphone; fullscreen; display-capture"
        style={{ width: "100%", height, border: "1px solid #ccc" }}
      />
    </div>
  );
}
