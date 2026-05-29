import { useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      })
      .then((stream) => {
        const v = videoRef.current!;
        v.srcObject = stream;
        v.onloadedmetadata = () => v.play().then(() => setCameraReady(true));
      })
      .catch(() => setError('Camera access denied.'));
  }, []);

  return { videoRef, cameraReady, error };
}
