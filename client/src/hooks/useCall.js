import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket.js';

// Public STUN server — enough to discover a usable address on most home/office networks.
// A strict corporate or mobile NAT may still fail to connect a direct peer-to-peer path;
// add a TURN server here (e.g. a self-hosted coturn, or a paid TURN provider) if that
// matters for your deployment. The server-side signaling relay (see
// server/src/sockets/index.js) never sees or touches the actual audio/video either way.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const idle = { status: 'idle', video: true, incoming: null, micOn: true, camOn: true };

/**
 * Peer-to-peer audio/video calling for the interview room, signaled over the same Socket.IO
 * connection useInterviewRoom keeps alive (see the `call-*` events there and on the server).
 * Call state and media streams are kept out of Redux deliberately — MediaStream/
 * RTCPeerConnection objects aren't serializable and don't belong in a store.
 */
export default function useCall() {
  const [call, setCall] = useState(idle);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCall(idle);
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) getSocket()?.emit('call-ice-candidate', { candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      setRemoteStream((prev) => {
        const stream = prev || new MediaStream();
        if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
        return stream;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return; // event from a connection we've already torn down
      if (pc.connectionState === 'failed') {
        toast.error('The call connection failed — this can happen on some networks (VPN, strict NAT).');
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup]);

  const getMedia = useCallback(async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: Boolean(video) });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      const message =
        err.name === 'NotAllowedError'
          ? 'Camera/microphone access was blocked. Allow it in your browser and try again.'
          : err.name === 'NotFoundError'
            ? 'No camera or microphone was found on this device.'
            : 'Could not access your camera or microphone.';
      throw new Error(message);
    }
  }, []);

  const startCall = useCallback(
    async (video) => {
      if (call.status !== 'idle') return;
      setCall((c) => ({ ...c, status: 'calling', video }));
      try {
        const stream = await getMedia(video);
        const pc = createPeerConnection();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket()?.emit('call-offer', { sdp: offer, video });
      } catch (err) {
        toast.error(err.message || 'Could not start the call');
        cleanup();
      }
    },
    [call.status, getMedia, createPeerConnection, cleanup]
  );

  const acceptCall = useCallback(async () => {
    const incoming = call.incoming;
    if (!incoming) return;
    try {
      const stream = await getMedia(incoming.video);
      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
      pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
      pendingCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket()?.emit('call-answer', { sdp: answer });
      setCall((c) => ({ ...c, status: 'connected', video: incoming.video, incoming: null }));
    } catch (err) {
      toast.error(err.message || 'Could not join the call');
      getSocket()?.emit('call-end', { reason: 'error' });
      cleanup();
    }
  }, [call.incoming, getMedia, createPeerConnection, cleanup]);

  const declineCall = useCallback(() => {
    getSocket()?.emit('call-end', { reason: 'declined' });
    setCall(idle);
  }, []);

  const endCall = useCallback(() => {
    if (call.status === 'idle') return;
    getSocket()?.emit('call-end', { reason: 'hangup' });
    cleanup();
  }, [call.status, cleanup]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCall((c) => ({ ...c, micOn: track.enabled }));
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCall((c) => ({ ...c, camOn: track.enabled }));
  }, []);

  // Wire up the signaling listeners. Re-subscribes whenever call.status changes so the
  // closures below (the busy check in particular) always see the current status.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onOffer = ({ sdp, video, from }) => {
      if (call.status !== 'idle') {
        socket.emit('call-end', { reason: 'busy' });
        return;
      }
      setCall((c) => ({ ...c, status: 'ringing', video, incoming: { sdp, video, from } }));
    };

    const onAnswer = async ({ sdp }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
      pendingCandidatesRef.current = [];
      setCall((c) => ({ ...c, status: 'connected' }));
    };

    const onIceCandidate = ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    };

    const onEnd = ({ reason }) => {
      if (reason === 'declined') toast.error('Call declined');
      else if (reason === 'busy') toast.error('They are already on another call');
      else if (reason === 'peer-left' && call.status !== 'idle') toast.error('The call ended — the other participant left');
      cleanup();
    };

    socket.on('call-offer', onOffer);
    socket.on('call-answer', onAnswer);
    socket.on('call-ice-candidate', onIceCandidate);
    socket.on('call-end', onEnd);

    return () => {
      socket.off('call-offer', onOffer);
      socket.off('call-answer', onAnswer);
      socket.off('call-ice-candidate', onIceCandidate);
      socket.off('call-end', onEnd);
    };
  }, [call.status, cleanup]);

  // Stop the camera/mic and close the connection if the room is left mid-call.
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    call,
    localStream,
    remoteStream,
    callActions: { startCall, acceptCall, declineCall, endCall, toggleMic, toggleCam },
  };
}
