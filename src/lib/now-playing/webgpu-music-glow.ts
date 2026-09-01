/// <reference types="@webgpu/types" />

import { MUSIC_GLOW_BLOBS, hexToRgb, normalizeGlowPalette } from './music-glow';
import musicGlowShader from './music-glow.wgsl?raw';

const BLOB_COUNT = MUSIC_GLOW_BLOBS.length;
const HEADER_FLOATS = 4;
const FLOATS_PER_VEC4 = 4;
const COLOR_OFFSET = HEADER_FLOATS;
const BLOB_OFFSET = COLOR_OFFSET + BLOB_COUNT * FLOATS_PER_VEC4;
const MOTION_OFFSET = BLOB_OFFSET + BLOB_COUNT * FLOATS_PER_VEC4;
const UNIFORM_FLOATS = MOTION_OFFSET + BLOB_COUNT * FLOATS_PER_VEC4;
const TAU = Math.PI * 2;

export const MUSIC_GLOW_WGSL = musicGlowShader;

export function paletteToFloat32(colors: readonly string[]): Float32Array {
	const palette = normalizeGlowPalette(colors);
	const values = new Float32Array(BLOB_COUNT * FLOATS_PER_VEC4);

	palette.forEach((color, index) => {
		const [red, green, blue] = hexToRgb(color);
		const offset = index * FLOATS_PER_VEC4;
		values[offset] = red;
		values[offset + 1] = green;
		values[offset + 2] = blue;
		values[offset + 3] = 1;
	});

	return values;
}

export interface WebGpuMusicGlowRenderer {
	readonly lost: Promise<GPUDeviceLostInfo>;
	setColors(colors: readonly string[]): void;
	setIntensity(intensity: number): void;
	resize(): boolean;
	render(timeSeconds: number): void;
	whenSubmitted(): Promise<void>;
	destroy(): void;
}

class MusicGlowRenderer implements WebGpuMusicGlowRenderer {
	readonly lost: Promise<GPUDeviceLostInfo>;

	#canvas: HTMLCanvasElement;
	#context: GPUCanvasContext;
	#device: GPUDevice;
	#pipeline: GPURenderPipeline;
	#bindGroup: GPUBindGroup;
	#uniformBuffer: GPUBuffer;
	#uniforms = new Float32Array(UNIFORM_FLOATS);
	#currentPalette = new Float32Array(BLOB_COUNT * FLOATS_PER_VEC4);
	#sourcePalette = new Float32Array(BLOB_COUNT * FLOATS_PER_VEC4);
	#targetPalette = new Float32Array(BLOB_COUNT * FLOATS_PER_VEC4);
	#transitionStarted = 0;
	#hasPalette = false;
	#destroyed = false;
	#pixelScale = 0;

	constructor(
		canvas: HTMLCanvasElement,
		context: GPUCanvasContext,
		device: GPUDevice,
		pipeline: GPURenderPipeline,
		bindGroup: GPUBindGroup,
		uniformBuffer: GPUBuffer
	) {
		this.#canvas = canvas;
		this.#context = context;
		this.#device = device;
		this.#pipeline = pipeline;
		this.#bindGroup = bindGroup;
		this.#uniformBuffer = uniformBuffer;
		this.lost = device.lost;

		MUSIC_GLOW_BLOBS.forEach((blob, index) => {
			const blobOffset = BLOB_OFFSET + index * FLOATS_PER_VEC4;
			const motionOffset = MOTION_OFFSET + index * FLOATS_PER_VEC4;

			this.#uniforms.set(
				[blob.x / 100, blob.y / 100, 0, (blob.delay / blob.duration) * TAU],
				blobOffset
			);
			this.#uniforms.set([0, 0, TAU / blob.duration, TAU / blob.morphDuration], motionOffset);
		});
	}

	setColors(colors: readonly string[]): void {
		const nextPalette = paletteToFloat32(colors);
		if (!this.#hasPalette) {
			this.#currentPalette.set(nextPalette);
			this.#sourcePalette.set(nextPalette);
			this.#targetPalette.set(nextPalette);
			this.#hasPalette = true;
			return;
		}

		this.#updatePalette(performance.now());
		this.#sourcePalette.set(this.#currentPalette);
		this.#targetPalette.set(nextPalette);
		this.#transitionStarted = performance.now();
	}

	setIntensity(intensity: number): void {
		this.#uniforms[3] = Math.max(0, Math.min(intensity, 1));
	}

	resize(): boolean {
		const bounds = this.#canvas.getBoundingClientRect();
		if (bounds.width <= 0 || bounds.height <= 0) return false;

		// The shader is intentionally soft, so CSS-pixel resolution stays crisp while avoiding
		// unnecessary fragment work on high-density displays.
		const dpr = Math.min(window.devicePixelRatio || 1, 1);
		if (dpr !== this.#pixelScale) {
			MUSIC_GLOW_BLOBS.forEach((blob, index) => {
				const blobOffset = BLOB_OFFSET + index * FLOATS_PER_VEC4;
				const motionOffset = MOTION_OFFSET + index * FLOATS_PER_VEC4;
				const horizontalDrift = Math.max(
					Math.abs(blob.drift[0]),
					Math.abs(blob.drift[2]),
					Math.abs(blob.drift[4]),
					Math.abs(blob.drift[6])
				);
				const verticalDrift = Math.max(
					Math.abs(blob.drift[1]),
					Math.abs(blob.drift[3]),
					Math.abs(blob.drift[5]),
					Math.abs(blob.drift[7])
				);

				this.#uniforms[blobOffset + 2] = blob.size * dpr;
				this.#uniforms[motionOffset] = horizontalDrift * dpr;
				this.#uniforms[motionOffset + 1] = verticalDrift * dpr;
			});
			this.#pixelScale = dpr;
		}
		const width = Math.max(1, Math.round(bounds.width * dpr));
		const height = Math.max(1, Math.round(bounds.height * dpr));
		if (this.#canvas.width !== width || this.#canvas.height !== height) {
			this.#canvas.width = width;
			this.#canvas.height = height;
		}

		this.#uniforms[0] = width;
		this.#uniforms[1] = height;
		return true;
	}

	render(timeSeconds: number): void {
		if (this.#destroyed || !this.resize()) return;

		this.#uniforms[2] = timeSeconds;
		this.#updatePalette(performance.now());
		this.#uniforms.set(this.#currentPalette, COLOR_OFFSET);
		this.#device.queue.writeBuffer(this.#uniformBuffer, 0, this.#uniforms);

		const encoder = this.#device.createCommandEncoder({ label: 'music glow frame' });
		const pass = encoder.beginRenderPass({
			label: 'music glow pass',
			colorAttachments: [
				{
					view: this.#context.getCurrentTexture().createView(),
					clearValue: { r: 0, g: 0, b: 0, a: 0 },
					loadOp: 'clear',
					storeOp: 'store'
				}
			]
		});
		pass.setPipeline(this.#pipeline);
		pass.setBindGroup(0, this.#bindGroup);
		pass.draw(3);
		pass.end();
		this.#device.queue.submit([encoder.finish()]);
	}

	whenSubmitted(): Promise<void> {
		return this.#device.queue.onSubmittedWorkDone();
	}

	destroy(): void {
		if (this.#destroyed) return;
		this.#destroyed = true;
		this.#context.unconfigure();
		this.#uniformBuffer.destroy();
		this.#device.destroy();
	}

	#updatePalette(now: number): void {
		if (this.#transitionStarted === 0) return;

		const progress = Math.min((now - this.#transitionStarted) / 1500, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		for (let index = 0; index < this.#currentPalette.length; index += 1) {
			this.#currentPalette[index] =
				this.#sourcePalette[index] +
				(this.#targetPalette[index] - this.#sourcePalette[index]) * eased;
		}

		if (progress === 1) this.#transitionStarted = 0;
	}
}

export async function createWebGpuMusicGlow(
	canvas: HTMLCanvasElement
): Promise<WebGpuMusicGlowRenderer> {
	if (!navigator.gpu) throw new Error('WebGPU is unavailable');

	let adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
	adapter ??= await navigator.gpu.requestAdapter();
	if (!adapter) throw new Error('No WebGPU adapter is available');

	const device = await adapter.requestDevice({ label: 'music glow device' });
	const context = canvas.getContext('webgpu');
	if (!context) {
		device.destroy();
		throw new Error('Unable to create a WebGPU canvas context');
	}

	const format = navigator.gpu.getPreferredCanvasFormat();
	context.configure({ device, format, alphaMode: 'premultiplied' });

	const shader = device.createShaderModule({ label: 'music glow shader', code: MUSIC_GLOW_WGSL });
	const compilation = await shader.getCompilationInfo();
	const errors = compilation.messages.filter((message) => message.type === 'error');
	if (errors.length > 0) {
		context.unconfigure();
		device.destroy();
		throw new Error(errors.map((error) => error.message).join('\n'));
	}

	const pipeline = await device.createRenderPipelineAsync({
		label: 'music glow pipeline',
		layout: 'auto',
		vertex: { module: shader, entryPoint: 'vertexMain' },
		fragment: {
			module: shader,
			entryPoint: 'fragmentMain',
			targets: [{ format }]
		},
		primitive: { topology: 'triangle-list' }
	});
	const uniformBuffer = device.createBuffer({
		label: 'music glow uniforms',
		size: UNIFORM_FLOATS * Float32Array.BYTES_PER_ELEMENT,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	const bindGroup = device.createBindGroup({
		label: 'music glow bind group',
		layout: pipeline.getBindGroupLayout(0),
		entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
	});

	return new MusicGlowRenderer(canvas, context, device, pipeline, bindGroup, uniformBuffer);
}
