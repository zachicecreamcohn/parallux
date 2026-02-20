import { useEffect, useRef, useState } from 'react';
import { Select, Text } from '@mantine/core';
import { GridOverlay, Point, StageSize } from '../../shared/interfaces';
import { useStore } from '../../context/StoreContext';
import { defaultCorners, drawGrid, gridDivisions, hitTestCorner } from './gridUtils';

function useCameras() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((all) => {
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    });
  }, []);
  return devices;
}

interface Props {
  stageSize: StageSize;
}

export default function CameraFeed({ stageSize }: Props) {
  const cameras = useCameras();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [videoDims, setVideoDims] = useState({ w: 640, h: 480 });

  const [gridOverlay, setGridOverlay] = useStore('gridOverlay');

  const draggingCorner = useRef<keyof GridOverlay | null>(null);
  const pendingCorners = useRef<GridOverlay | null>(null);

  useEffect(() => {
    if (cameras.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(cameras[0].deviceId);
    }
  }, [cameras]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      });

    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [selectedDeviceId]);

  const handleVideoMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setVideoDims({ w: v.videoWidth, h: v.videoHeight });
  };

  const getCorners = (): GridOverlay => {
    if (gridOverlay && Object.keys(gridOverlay).length === 4) return gridOverlay as GridOverlay;
    return defaultCorners(videoDims.w, videoDims.h, stageSize);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { cols, rows } = gridDivisions(stageSize);
    drawGrid(ctx, getCorners(), videoDims.w, videoDims.h, cols, rows);
  }, [gridOverlay, videoDims, stageSize]);

  const canvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = videoDims.w / rect.width;
    const scaleY = videoDims.h / rect.height;
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [ex, ey] = canvasCoords(e);
    draggingCorner.current = hitTestCorner(ex, ey, getCorners(), videoDims.w, videoDims.h);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingCorner.current) return;
    const [ex, ey] = canvasCoords(e);
    const { w, h } = videoDims;
    const newPoint: Point = {
      x: Math.max(0, Math.min(1, ex / w)),
      y: Math.max(0, Math.min(1, ey / h)),
    };
    const updated: GridOverlay = { ...getCorners(), [draggingCorner.current]: newPoint };
    const ctx = canvasRef.current?.getContext('2d');
    const { cols, rows } = gridDivisions(stageSize);
    if (ctx) drawGrid(ctx, updated, w, h, cols, rows);
    pendingCorners.current = updated;
  };

  const handleMouseUp = () => {
    if (draggingCorner.current && pendingCorners.current) {
      setGridOverlay(pendingCorners.current);
      pendingCorners.current = null;
    }
    draggingCorner.current = null;
  };

  const cameraOptions = cameras.map((d, i) => ({
    value: d.deviceId,
    label: d.label || `Camera ${i + 1}`,
  }));

  return (
    <>
      {cameras.length === 0 ? (
        <Text c="dimmed">No cameras detected.</Text>
      ) : (
        <Select
          label="Camera"
          data={cameraOptions}
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          style={{ maxWidth: 320 }}
        />
      )}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoMetadata}
          style={{ display: 'block', maxWidth: '100%', background: '#000' }}
        />
        <canvas
          ref={canvasRef}
          width={videoDims.w}
          height={videoDims.h}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            cursor: 'crosshair',
          }}
        />
      </div>
    </>
  );
}