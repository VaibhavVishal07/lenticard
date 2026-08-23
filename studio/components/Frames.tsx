import { Reorder, useDragControls } from 'motion/react';
import { DotsSixVertical, ImageSquare, X } from '@phosphor-icons/react';
import { useRef, useState, type DragEvent } from 'react';
import { MAX_FRAMES } from '../../src/core/types';

export interface Frame {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

let counter = 0;

async function readFrame(file: File): Promise<Frame> {
  const url = URL.createObjectURL(file);
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`${file.name} is not an image this browser can read`));
    img.src = url;
  });
  return { id: `f${++counter}`, url, name: file.name, ...size };
}

export async function framesFromFiles(files: File[]): Promise<Frame[]> {
  const images = files.filter((file) => file.type.startsWith('image/'));
  return Promise.all(images.map(readFrame));
}

export function frameFromDataUrl(url: string, name: string): Promise<Frame> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        id: `f${++counter}`,
        url,
        name,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.onerror = () => reject(new Error('Could not read the sample image'));
    img.src = url;
  });
}

interface FramesProps {
  frames: Frame[];
  onChange: (frames: Frame[]) => void;
  onAdd: (files: File[]) => void;
  onError: (message: string) => void;
}

export function Frames({ frames, onChange, onAdd, onError }: FramesProps) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const full = frames.length >= MAX_FRAMES;

  function accept(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const room = MAX_FRAMES - frames.length;
    if (room <= 0) {
      onError(`A card holds at most ${MAX_FRAMES} frames.`);
      return;
    }
    if (list.length > room) {
      onError(`Only the first ${room} of those fit — a card holds ${MAX_FRAMES} frames.`);
    }
    onAdd(list.slice(0, room));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    accept(event.dataTransfer.files);
  }

  return (
    <>
      <div
        className="dropzone"
        data-over={over}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') input.current?.click();
        }}
      >
        <ImageSquare size={20} weight="light" aria-hidden />
        <p>{full ? 'Card is full' : 'Drop images, or click to choose'}</p>
        <small>
          {frames.length} of {MAX_FRAMES} frames · the first one reads at full left tilt
        </small>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {frames.length > 0 && (
        <Reorder.Group axis="y" values={frames} onReorder={onChange} className="frames">
          {frames.map((frame, index) => (
            <FrameRow
              key={frame.id}
              frame={frame}
              index={index}
              onRemove={() => onChange(frames.filter((f) => f.id !== frame.id))}
            />
          ))}
        </Reorder.Group>
      )}
    </>
  );
}

function FrameRow({
  frame,
  index,
  onRemove,
}: {
  frame: Frame;
  index: number;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const ratio = frame.width / frame.height;
  const shape = ratio >= 1.15 ? 'landscape' : ratio <= 0.87 ? 'portrait' : 'square';

  return (
    <Reorder.Item
      value={frame}
      className="frame"
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 28px -10px rgba(0,0,0,0.8)' }}
    >
      <span className="grip" onPointerDown={(event) => controls.start(event)} aria-hidden>
        <DotsSixVertical size={15} weight="light" />
      </span>
      <span className="frame-index">{index + 1}</span>
      <img src={frame.url} alt="" />
      <span className="frame-meta">
        <span className="frame-name">{frame.name}</span>
        <span className="frame-sub">
          {frame.width}×{frame.height} · {shape}
        </span>
      </span>
      <button className="icon-btn" onClick={onRemove} aria-label={`Remove ${frame.name}`}>
        <X size={14} weight="light" />
      </button>
    </Reorder.Item>
  );
}
