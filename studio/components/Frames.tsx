import { Reorder } from 'motion/react';
import { DotsSixVertical, ImageSquare, Plus, X } from '@phosphor-icons/react';
import { useRef, useState, type DragEvent } from 'react';
import { MAX_FRAMES } from '../../src/core/types';

export interface Frame {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

/**
 * Where each frame lands as the card turns.
 *
 * A bare ordinal told you nothing — the whole reason the order matters is that
 * the first frame is what someone sees before they have tilted anything.
 */
const POSITION = ['Left tilt', 'Straight on', 'Right tilt', 'Fourth', 'Fifth', 'Sixth'];

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

/**
 * The frames, laid out the way the card reads them.
 *
 * This was a column of grey rows with a grip at the left edge, and it was
 * wrong twice over. The order of these is an angle, not a rank: the first
 * frame is what somebody sees leaning left and the last is what they see
 * leaning right, so a column had you dragging up and down to set something
 * that happens side to side. And the only thing you could take hold of was a
 * twelve-pixel grip — grab the row itself, which is what anybody tries first,
 * and nothing moved.
 *
 * So it is a strip, running the way the sweep runs, and the whole tile is the
 * handle. The grip stays on as a mark, because a thing you can pick up should
 * look like a thing you can pick up.
 */
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

  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop,
  };

  const picker = (
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
  );

  /* Nothing here yet, so the whole panel is the target — there is nothing else
     in it to aim at. */
  if (!frames.length) {
    return (
      <div
        className="fs-empty"
        data-over={over}
        {...dropHandlers}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') input.current?.click();
        }}
      >
        <span className="fs-empty-icon" aria-hidden>
          <ImageSquare size={26} weight="light" />
        </span>
        <p>Drop photos here</p>
        <small>or click to choose — two or three of the same subject works best</small>
        {picker}
      </div>
    );
  }

  /** Move one frame along the strip: the keyboard's version of dragging it. */
  function shift(from: number, to: number) {
    if (to < 0 || to >= frames.length) return;
    const next = [...frames];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  }

  return (
    <div className="fs" data-over={over} {...dropHandlers}>
      <div className="fs-rail">
        <Reorder.Group axis="x" values={frames} onReorder={onChange} className="fs-tiles" as="ul">
          {frames.map((frame, index) => (
            <FrameTile
              key={frame.id}
              frame={frame}
              index={index}
              count={frames.length}
              onRemove={() => onChange(frames.filter((f) => f.id !== frame.id))}
              onShift={(delta) => shift(index, index + delta)}
            />
          ))}
        </Reorder.Group>

        {!full && (
          <button className="fs-add" onClick={() => input.current?.click()}>
            <Plus size={15} weight="bold" />
            <span>Add</span>
          </button>
        )}
        {picker}
      </div>

      {/* What the order of the strip means, said once, under the strip. */}
      <div className="fs-sweep" aria-hidden>
        <span>tilt left</span>
        <span className="fs-sweep-line" />
        <span>tilt right</span>
      </div>

      <p className="fs-note">
        <DotsSixVertical size={13} weight="bold" />
        Drag a frame to reorder{full ? '' : ', or drop more anywhere on the page'}
        <b>
          {frames.length} of {MAX_FRAMES}
        </b>
      </p>
    </div>
  );
}

function FrameTile({
  frame,
  index,
  count,
  onRemove,
  onShift,
}: {
  frame: Frame;
  index: number;
  count: number;
  onRemove: () => void;
  onShift: (delta: number) => void;
}) {
  const ratio = frame.width / frame.height;
  const shape = ratio >= 1.15 ? 'landscape' : ratio <= 0.87 ? 'portrait' : 'square';
  const slot = POSITION[index] ?? `Frame ${index + 1}`;

  return (
    <Reorder.Item
      value={frame}
      className="fs-tile"
      whileDrag={{ scale: 1.06, zIndex: 4 }}
      transition={{ type: 'spring', stiffness: 620, damping: 44 }}
      tabIndex={0}
      aria-label={`${slot}: ${frame.name}. Arrow keys move it along the strip.`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onShift(-1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onShift(1);
        }
      }}
    >
      <span className="fs-shot">
        <img src={frame.url} alt="" draggable={false} />
        <span className="fs-grip" aria-hidden>
          <DotsSixVertical size={13} weight="bold" />
        </span>
        <button
          className="fs-kill"
          /* The tile is the drag handle, so this has to keep the press to
             itself — otherwise removing a frame starts by dragging it. */
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRemove}
          aria-label={`Remove ${frame.name}`}
        >
          <X size={11} weight="bold" />
        </button>
      </span>
      <span className="fs-slot">{slot}</span>
      <span className="fs-sub">{count > 4 ? shape : `${frame.width}×${frame.height}`}</span>
    </Reorder.Item>
  );
}
