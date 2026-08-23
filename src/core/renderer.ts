import { buildFragmentShader, VERTEX_SHADER } from './shaders';
import type { LoadedFrame } from './loader';
import { MAX_FRAMES } from './types';

export interface RenderState {
  angle: number;      // -1..1 along the parallax axis
  lenticules: number;
  parallax: number;
  interlace: number;
  blend: number;
  sheen: number;
  lens: number;
  axis: 0 | 1;        // 0 = vertical ridges, 1 = horizontal
  fit: 'cover' | 'contain';
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('lenticard: could not create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`lenticard: shader failed to compile - ${log}`);
  }
  return shader;
}

/**
 * Draws the interlaced stack onto a single full-canvas quad. Deliberately raw
 * WebGL: this is one triangle and one fragment shader, and an embeddable widget
 * has no business shipping a scene graph.
 */
export class LenticularRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private textures: WebGLTexture[] = [];
  private frames: LoadedFrame[] = [];
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private frameCount = 0;
  private lost = false;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const attrs: WebGLContextAttributes = {
      alpha: false,
      antialias: false,             // the interlace is anti-aliased in-shader instead
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,  // so toBlob() and frame capture see real pixels
      powerPreference: 'high-performance',
    };
    const gl = (canvas.getContext('webgl', attrs) ||
      canvas.getContext('experimental-webgl', attrs)) as WebGLRenderingContext | null;
    if (!gl) throw new Error('lenticard: WebGL is unavailable');
    this.gl = gl;

    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);

    const quad = new Float32Array([-1, -1, 3, -1, -1, 3]); // one oversized triangle
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  }

  private onLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
  };

  private onRestored = () => {
    this.lost = false;
    this.program = null;
    this.frameCount = 0;
    this.textures = [];
    this.uniforms.clear();
    if (this.frames.length) this.setFrames(this.frames);
  };

  get isLost(): boolean {
    return this.lost;
  }

  /** The frame lookup is unrolled per count, so the program is rebuilt when it changes. */
  private ensureProgram(count: number): void {
    if (this.program && this.frameCount === count) return;
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, buildFragmentShader(count));
    const program = gl.createProgram();
    if (!program) throw new Error('lenticard: could not create program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`lenticard: program failed to link - ${log}`);
    }

    this.program = program;
    this.frameCount = count;
    this.uniforms.clear();
    gl.useProgram(program);

    const loc = gl.getAttribLocation(program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  private uniform(name: string): WebGLUniformLocation | null {
    if (!this.uniforms.has(name)) {
      this.uniforms.set(name, this.gl.getUniformLocation(this.program!, name));
    }
    return this.uniforms.get(name)!;
  }

  setFrames(frames: LoadedFrame[]): void {
    const gl = this.gl;
    const list = frames.slice(0, MAX_FRAMES);
    this.frames = list;
    if (!list.length) return;

    this.ensureProgram(list.length);
    gl.useProgram(this.program);

    for (const texture of this.textures) gl.deleteTexture(texture);
    this.textures = list.map((frame, i) => {
      const texture = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Frames are arbitrary uploads, so assume non-power-of-two: no mipmaps, clamped.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame.source);
      gl.uniform1i(this.uniform(`uTex${i}`), i);
      return texture;
    });
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  /** Per-frame scale that fits an arbitrary image aspect into the card aspect. */
  private fitFor(
    frame: LoadedFrame,
    cardAspect: number,
    mode: 'cover' | 'contain',
  ): [number, number] {
    const aspect = frame.width / frame.height;
    if (!isFinite(aspect) || aspect <= 0) return [1, 1];
    const wider = aspect > cardAspect;
    const crop = wider ? cardAspect / aspect : aspect / cardAspect;
    if (mode === 'cover') return wider ? [crop, 1] : [1, crop];
    return wider ? [1, 1 / crop] : [1 / crop, 1];
  }

  render(state: RenderState): void {
    if (this.lost || !this.program || !this.frames.length) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    const cardAspect = this.width / this.height;
    this.frames.forEach((frame, i) => {
      const [fx, fy] = this.fitFor(frame, cardAspect, state.fit);
      gl.uniform2f(this.uniform(`uFit${i}`), fx, fy);
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      gl.uniform1i(this.uniform(`uTex${i}`), i);
    });

    // One device pixel measured in lenticule widths. The shader widens the frame
    // crossover by this much, which is what keeps a fine interlace out of moire.
    const along = state.axis === 0 ? this.width : this.height;
    const aa = Math.min(0.5, state.lenticules / Math.max(along, 1));

    gl.uniform1f(this.uniform('uCount'), this.frames.length);
    gl.uniform1f(this.uniform('uLpi'), state.lenticules);
    gl.uniform1f(this.uniform('uAngle'), state.angle);
    gl.uniform1f(this.uniform('uParallax'), state.parallax);
    gl.uniform1f(this.uniform('uSpread'), state.interlace);
    gl.uniform1f(this.uniform('uBlend'), state.blend);
    gl.uniform1f(this.uniform('uSheen'), state.sheen);
    gl.uniform1f(this.uniform('uLens'), state.lens);
    gl.uniform1f(this.uniform('uAxis'), state.axis);
    gl.uniform1f(this.uniform('uAA'), aa);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    const gl = this.gl;
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    for (const texture of this.textures) gl.deleteTexture(texture);
    if (this.program) gl.deleteProgram(this.program);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.textures = [];
    this.frames = [];
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
