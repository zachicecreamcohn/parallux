import { useEffect, useRef, useState } from 'react';
import { Group, Select, Slider, Switch, Text } from '@mantine/core';
import { CrosshairPosition, GridOverlay, Point, StageSize } from '../../shared/interfaces';
import { useStore } from '../../context/StoreContext';
import { bilerp, defaultCorners, drawGrid, getCalibrationPoints, gridDivisions, hitTestCorner, CalibrationScreenPoint } from './gridUtils';
import CalibrationOverlay from './CalibrationOverlay';

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
  crosshair?: CrosshairPosition;
  calibrationPoint?: { canvasX: number; canvasY: number } | null;
  calibrationProgress?: string;
  onCalibrationPointsReady?: (points: CalibrationScreenPoint[]) => void;
}

export default function CameraFeed({ stageSize, crosshair, calibrationPoint, calibrationProgress, onCalibrationPointsReady }: Props) {
  const cameras = useCameras();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crosshairCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [videoDims, setVideoDims] = useState({ w: 640, h: 480 });

  const [gridOverlay, setGridOverlay] = useStore('gridOverlay');

  const [showGrid, setShowGrid] = useState(true);
const [gridVerticalOffset, setGridVerticalOffset] = useState(0);

  const handleVerticalOffsetChange = (value: number) => {
    const corners = getCorners();
    const delta = value - gridVerticalOffset;
    const shifted: GridOverlay = {
      topLeft: { ...corners.topLeft, y: corners.topLeft.y + delta },
      topRight: { ...corners.topRight, y: corners.topRight.y + delta },
      bottomLeft: { ...corners.bottomLeft, y: corners.bottomLeft.y + delta },
      bottomRight: { ...corners.bottomRight, y: corners.bottomRight.y + delta },
    };
    setGridVerticalOffset(value);
    setGridOverlay(shifted);
  };
  const draggingCorner = useRef<keyof GridOverlay | null>(null);
  const pendingCorners = useRef<GridOverlay | null>(null);
  const [selectedCorner, setSelectedCorner] = useState<keyof GridOverlay | null>(null);
  // Keep selectedCorner accessible in keydown handler without stale closure
  const selectedCornerRef = useRef<keyof GridOverlay | null>(null);
  selectedCornerRef.current = selectedCorner;

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
    if (!showGrid) { ctx.clearRect(0, 0, videoDims.w, videoDims.h); return; }
    const { cols, rows } = gridDivisions(stageSize);
    drawGrid(ctx, getCorners(), videoDims.w, videoDims.h, cols, rows, selectedCorner);
  }, [gridOverlay, videoDims, stageSize, selectedCorner, showGrid]);

  useEffect(() => {
    if (!onCalibrationPointsReady) return;
    const corners = getCorners();
    const points = getCalibrationPoints(corners, videoDims.w, videoDims.h);
    onCalibrationPointsReady(points);
  }, [gridOverlay, videoDims, onCalibrationPointsReady]);

  useEffect(() => {
    const canvas = crosshairCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!crosshair) return;
    const corners = getCorners();
    const mapped = bilerp(corners.topLeft, corners.topRight, corners.bottomLeft, corners.bottomRight, crosshair.x, crosshair.y);
    const cx = mapped.x * videoDims.w;
    const cy = mapped.y * videoDims.h;
    const R = 12;
    const L = 20;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - L, cy);
    ctx.lineTo(cx + L, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - L);
    ctx.lineTo(cx, cy + L);
    ctx.stroke();
    ctx.restore();
  }, [crosshair, videoDims]);

  const canvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = videoDims.w / rect.width;
    const scaleY = videoDims.h / rect.height;
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [ex, ey] = canvasCoords(e);
    const hit = hitTestCorner(ex, ey, getCorners(), videoDims.w, videoDims.h);
    draggingCorner.current = hit;
    setSelectedCorner(hit);
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
    if (ctx) drawGrid(ctx, updated, w, h, cols, rows, draggingCorner.current);
    pendingCorners.current = updated;
  };

  // Keyboard nudge — 1px step at normal speed, 10px with Shift
  useEffect(() => {
    const STEP = 1;
    const BIG_STEP = 10;
    const handleKeyDown = (e: KeyboardEvent) => {
      const corner = selectedCornerRef.current;
      if (!corner) return;
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      if (!dirs[e.key]) return;
      e.preventDefault();
      const step = (e.shiftKey ? BIG_STEP : STEP) / videoDims.w;
      const [dx, dy] = dirs[e.key];
      const corners = pendingCorners.current ?? getCorners();
      const p = corners[corner];
      const updated: GridOverlay = {
        ...corners,
        [corner]: {
          x: Math.max(0, Math.min(1, p.x + dx * step)),
          y: Math.max(0, Math.min(1, p.y + dy * step * (videoDims.w / videoDims.h))),
        },
      };
      pendingCorners.current = updated;
      const ctx = canvasRef.current?.getContext('2d');
      const { cols, rows } = gridDivisions(stageSize);
      if (ctx) drawGrid(ctx, updated, videoDims.w, videoDims.h, cols, rows, corner);
      setGridOverlay(updated);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoDims, stageSize, gridOverlay]);
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
        <canvas
          ref={crosshairCanvasRef}
          width={videoDims.w}
          height={videoDims.h}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
          }}
        />
        <CalibrationOverlay
          width={videoDims.w}
          height={videoDims.h}
          currentPoint={calibrationPoint ?? null}
          progress={calibrationProgress ?? ''}
        />
      </div>

      <Switch
        label="Show grid"
        checked={showGrid}
        onChange={(e) => setShowGrid(e.currentTarget.checked)}
        mt="xs"
      />
      <Group align="center" gap="sm" mt="xs" style={{ maxWidth: 500 }}>
        <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>Grid Vertical Offset</Text>
        <Slider
          min={-0.5}
          max={0.5}
          step={0.005}
          value={gridVerticalOffset}
          onChange={handleVerticalOffsetChange}
          style={{ flex: 1 }}
          label={(v) => `${(v * 100).toFixed(1)}%`}
        />
      </Group>
    </>
  );
}