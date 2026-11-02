import { precision, variants, type Variant, type Precision } from './model';

export type Glyph =
	'tensor' | 'matrix' | 'conv' | 'state' | 'gate' | 'norm' | 'sum' | 'bank' | 'wave' | 'stack';
export type Status = 'source' | 'nvfp4' | 'bf16' | 'mixed';
export interface Topic {
	id: string;
	title: string;
	short: string;
	body: string;
	formula?: string;
	facts?: string[];
	status: Status;
	glyph: Glyph;
	rows: string[][];
	edges: [string, string, ('feedback' | 'data')?][];
	source: { url: string; label: string };
}
export const statusText: Record<Status, string> = {
	source: 'Original precision',
	nvfp4: 'Changed · NVFP4',
	bf16: 'Retained · BF16',
	mixed: 'Contains changed projections'
};

/** Architecture of the exact checkpoints used by the recipes, not a generic Transformer. */
export function createExplorer(variant: Variant, layer: number) {
	const config = variants[variant];
	const tiny = variant === 'tiny';
	const hidden = tiny ? 1536 : 2560,
		heads = tiny ? 16 : 32,
		expertWidth = tiny ? 512 : 768;
	const kind = precision(variant, layer);
	const attention = (layer + 1) % config.attentionGroup === 0 ? 'mla' : 'kda';
	const revision = tiny
		? '3c9578f641b6745abf2d1239dc8419726f37c0e2'
		: '77e851a4675a93181c30f50426507d076cc55a1b';
	const base = `https://huggingface.co/inclusionAI/Ming-3.0-audio-${variant}/blob/${revision}/`;
	const sources = {
		decoder: { url: base + 'modeling_bailing_moe_v3.py', label: 'Thinker implementation' },
		audio: { url: base + 'modeling_bailing_moe_v3_audio.py', label: 'Audio implementation' },
		processor: { url: base + 'processing_bailing_moe_v3_audio.py', label: 'Audio processor' },
		talker: { url: base + 'talker/inference.py', label: 'Talker implementation' },
		flow: { url: base + 'talker/talker_module/dit.py', label: 'Flow transformer' },
		cfm: { url: base + 'talker/talker_module/cfm.py', label: 'Flow sampler' },
		aggregator: { url: base + 'talker/talker_module/aggregator.py', label: 'Latent aggregator' },
		vae: { url: base + 'talker/AudioVAE/vae_modules.py', label: 'AudioVAE implementation' },
		quant: {
			url: 'https://github.com/twangodev/ming3-nvfp4/blob/main/docs/reproduction.md',
			label: 'Our quantization recipe'
		}
	};
	const topics: Record<string, Topic> = {};
	type Options = Partial<Omit<Topic, 'id' | 'title' | 'body' | 'rows'>>;
	function add(
		id: string,
		title: string,
		body: string,
		rows: string[][] = [],
		options: Options = {}
	) {
		const edges: Topic['edges'] = [];
		for (let i = 1; i < rows.length; i++)
			for (const a of rows[i - 1]) for (const b of rows[i]) edges.push([a, b]);
		topics[id] = {
			id,
			title,
			short: title,
			body,
			rows,
			edges,
			status: 'source',
			glyph: 'tensor',
			source: sources.decoder,
			...options
		};
	}
	function leaf(
		id: string,
		title: string,
		body: string,
		glyph: Glyph = 'tensor',
		options: Options = {}
	) {
		add(id, title, body, [], { glyph, ...options });
	}

	add(
		'model',
		'Ming 3 Audio',
		'Audio and text enter the Thinker together. Its decoder predicts a text response; the separate, optional Talker can turn that response into speech.',
		[['audio', 'text'], ['decoder'], ['head'], ['speech']],
		{
			status: 'mixed',
			glyph: 'stack',
			edges: [
				['audio', 'decoder'],
				['text', 'decoder'],
				['decoder', 'head'],
				['head', 'speech']
			],
			source: sources.audio
		}
	);
	add(
		'audio',
		'Audio input',
		'A Whisper-style encoder turns a recording into features. A convolutional projector reduces the sequence length and maps those features into the Thinker’s token width.',
		[['mel'], ['encoder'], ['projector'], ['audio-insert']],
		{
			glyph: 'wave',
			source: sources.audio,
			facts: ['128 mel bands', '32 encoder blocks', 'All audio weights unchanged']
		}
	);
	leaf(
		'mel',
		'Log-mel features',
		'The processor loads mono audio at 16 kHz and computes a 128-band log-mel spectrogram. Time becomes a sequence of spectral frames; the encoder reads these rather than raw samples.',
		'wave',
		{ source: sources.processor, facts: ['Audio chunks: up to 3,000 mel frames'] }
	);
	add(
		'encoder',
		'Audio encoder',
		'Two convolutions extract local patterns. Position embeddings and 32 bidirectional attention blocks then let each frame use the surrounding audio.',
		[['audio-convs'], ['audio-position'], ['audio-block'], ['audio-final-norm']],
		{
			glyph: 'stack',
			source: sources.audio,
			facts: ['32 blocks · width 1,280 · 20 heads', 'The encoder is not causal']
		}
	);
	add(
		'audio-convs',
		'Audio convolutions',
		'A first convolution maps 128 mel channels to 1,280 features. The second halves the frame rate. Both use GELU activations.',
		[['audio-conv1'], ['audio-conv2']],
		{ glyph: 'conv', source: sources.audio }
	);
	leaf(
		'audio-conv1',
		'Conv 1 + GELU',
		'A three-frame convolution learns short acoustic patterns across the mel channels.',
		'conv',
		{ source: sources.audio, facts: ['128 → 1,280 channels', 'Kernel 3 · stride 1'] }
	);
	leaf(
		'audio-conv2',
		'Conv 2 + GELU',
		'Another three-frame convolution reduces the number of time steps by about half.',
		'conv',
		{ source: sources.audio, facts: ['1,280 → 1,280 channels', 'Kernel 3 · stride 2'] }
	);
	leaf(
		'audio-position',
		'Position embeddings',
		'Add a learned position vector to each audio frame so the encoder can distinguish where it occurs in the chunk.',
		'tensor',
		{ source: sources.audio }
	);
	add(
		'audio-block',
		'Audio encoder block ×32',
		'Each Whisper-style block has pre-normalized self-attention and a two-layer GELU feed-forward network, with a residual addition after each.',
		[['layernorm'], ['audio-attention'], ['residual'], ['audio-ffn']],
		{ short: 'Encoder block ×32', glyph: 'stack', source: sources.audio }
	);
	add(
		'audio-attention',
		'Audio self-attention',
		'Queries, keys, and values come from the audio frames. Softmax attention mixes information across the chunk without a causal mask.',
		[['audio-qkv'], ['audio-softmax'], ['audio-output']],
		{
			short: 'Self-attention',
			glyph: 'matrix',
			source: sources.audio,
			facts: ['20 attention heads']
		}
	);
	leaf(
		'audio-qkv',
		'Q / K / V projections',
		'Three learned maps produce queries, keys, and values from the normalized encoder features.',
		'matrix',
		{ source: sources.audio }
	);
	leaf(
		'audio-softmax',
		'Frame attention',
		'Compare every query with the keys, normalize the scores with softmax, and take a weighted sum of values. Future frames in the same chunk are visible.',
		'matrix',
		{ source: sources.audio, formula: 'softmax(QKᵀ / √d) V' }
	);
	leaf(
		'audio-output',
		'Output projection',
		'Join the attention heads and map their output back to the encoder width before the residual addition.',
		'matrix',
		{ source: sources.audio, facts: ['Output width: 1,280'] }
	);
	add(
		'audio-ffn',
		'Audio feed-forward',
		'The Whisper block expands each frame, applies GELU, and projects it back, then adds its residual input.',
		[['audio-expand'], ['gelu'], ['audio-contract'], ['residual']],
		{ glyph: 'matrix', source: sources.audio }
	);
	leaf(
		'audio-expand',
		'Expand',
		'The first feed-forward linear map expands the encoder feature width by four.',
		'matrix',
		{ source: sources.audio, facts: ['1,280 → 5,120'] }
	);
	leaf(
		'audio-contract',
		'Contract',
		'The second linear map returns the activated features to the encoder width.',
		'matrix',
		{ source: sources.audio, facts: ['5,120 → 1,280'] }
	);
	leaf(
		'gelu',
		'GELU',
		'A smooth nonlinear activation lets the network learn more than a chain of linear maps.',
		'gate',
		{ source: sources.audio, formula: 'GELU(x) = x · Φ(x)' }
	);
	leaf(
		'layernorm',
		'LayerNorm',
		'Subtract the feature mean, divide by its standard deviation, then apply learned scale and bias. This is the normalization used in the audio encoder.',
		'norm',
		{ source: sources.audio }
	);
	leaf(
		'audio-final-norm',
		'Final LayerNorm',
		'Normalize the final encoder features before the projector receives them.',
		'norm',
		{ source: sources.audio }
	);
	add(
		'projector',
		'Audio projector',
		'Three stride-two convolutions reduce the encoder sequence by another factor of eight. A final linear map produces one Thinker-width vector per audio token.',
		[['downsample-1'], ['downsample-2'], ['downsample-3'], ['audio-linear'], ['audio-l2']],
		{
			glyph: 'conv',
			source: sources.audio,
			facts: [
				`1,280 → ${hidden.toLocaleString()} channels`,
				'About 16× fewer steps than the original mel sequence'
			]
		}
	);
	for (let i = 1; i <= 3; i++)
		leaf(
			`downsample-${i}`,
			`Downsample ${i}`,
			'Apply a kernel-three, stride-two convolution with padding one, followed by GELU. Each stage approximately halves the time axis.',
			'conv',
			{ source: sources.audio, facts: [`${i === 1 ? 1280 : hidden} → ${hidden} channels`] }
		);
	leaf(
		'audio-linear',
		'Project features',
		'Transpose from channel-first to time-first and apply the final learned linear map.',
		'matrix',
		{ source: sources.audio, facts: [`${hidden} → ${hidden}`] }
	);
	leaf(
		'audio-l2',
		'Normalize audio vectors',
		'Both checkpoint configurations enable norm_query_embeds. L2-normalize each projected audio vector before inserting it into the text embedding sequence.',
		'norm',
		{ source: sources.audio, formula: 'audio_token = projected / ‖projected‖₂' }
	);
	leaf(
		'audio-insert',
		'Insert audio tokens',
		'Replace the audio placeholder embeddings in the prompt with the projected features. The Thinker then receives a single sequence containing audio features and text-token embeddings.',
		'tensor',
		{ source: sources.audio }
	);
	add(
		'text',
		'Text input',
		'The tokenizer converts the conversation into token IDs. A learned embedding table maps each ID to a Thinker-width vector; audio placeholders are filled from the audio path.',
		[['tokenizer'], ['embedding'], ['audio-insert']],
		{ source: sources.processor }
	);
	leaf(
		'tokenizer',
		'Tokenizer + chat template',
		'Format roles, special tokens, and the generation prompt, then encode text into token IDs. Thinking mode and decoding settings affect behavior, but are not weight quantization.',
		'tensor',
		{ source: sources.processor }
	);
	leaf(
		'embedding',
		'Embedding lookup',
		'Select one learned vector for each token ID. These weights are separate from the final text head and remain unchanged.',
		'matrix',
		{
			facts: [
				`157,184 tokens × ${hidden.toLocaleString()} features`,
				'Input and output weights are not tied'
			]
		}
	);

	add(
		'decoder',
		`Thinker · ${config.layers} layers`,
		`The first ${config.dense} ${config.dense === 1 ? 'layer uses' : 'layers use'} a dense feed-forward block. The rest use a routed MoE. ${config.attentionGroup - 1} KDA layers alternate with one MLA layer in each group.`,
		[['norm'], ['attention'], ['residual'], ['feedforward']],
		{
			glyph: 'stack',
			status: 'mixed',
			facts: [
				`Layer ${layer} selected · ${attention.toUpperCase()}`,
				`Hidden width ${hidden.toLocaleString()} · ${heads} heads`,
				'128K configured maximum positions'
			],
			edges: [
				['norm', 'attention'],
				['attention', 'residual'],
				['residual', 'feedforward']
			]
		}
	);
	add(
		'attention',
		`${attention.toUpperCase()} attention`,
		attention === 'kda'
			? 'This layer uses Kimi Delta Attention: a fixed-size recurrent memory with learned, channel-wise forgetting and delta-rule writes.'
			: 'This layer uses multi-head latent attention: low-rank key/value projections followed by causal softmax attention.',
		[[attention]],
		{ glyph: attention === 'kda' ? 'state' : 'matrix' }
	);
	add(
		'norm',
		'RMSNorm',
		'Normalize the root-mean-square feature magnitude, then apply a learned scale. Thinker layers do this before attention and before the feed-forward block.',
		[['rms-reduce'], ['rms-scale']],
		{
			glyph: 'norm',
			formula: 'RMSNorm(x) = w ⊙ x / √(mean(x²) + ε)',
			facts: ['ε = 10⁻⁶', 'No subtraction of the feature mean']
		}
	);
	leaf(
		'rms-reduce',
		'Measure magnitude',
		'Compute the mean square across features in float32 and take its reciprocal square root, with epsilon for numerical stability.',
		'norm',
		{ formula: 'r = 1 / √(mean(x²) + ε)' }
	);
	leaf(
		'rms-scale',
		'Normalize + scale',
		'Multiply each feature by the shared inverse magnitude and its learned per-feature weight, then return the expected activation dtype.',
		'matrix',
		{ formula: 'y = w ⊙ (x · r)' }
	);
	leaf(
		'residual',
		'Residual addition',
		'Add the block’s transformed output to its input. This preserves a direct information path through the decoder. There is one addition after attention and another after feed-forward.',
		'sum',
		{ formula: 'next = input + block(input)' }
	);
	add(
		'feedforward',
		'Feed-forward block',
		'Normalize the post-attention residual stream, compute a dense or MoE update, then add that update back to the residual stream.',
		[['norm'], [kind === 'source' ? 'dense' : 'moe'], ['residual']],
		{ glyph: 'bank', status: kind === 'nvfp4' ? 'mixed' : 'source' }
	);

	add(
		'kda',
		'Kimi Delta Attention',
		'Instead of storing every past token as a key/value pair, KDA updates a matrix memory for each head. Queries read that memory; keys and values correct it. The attention weights and state were not quantized.',
		[['kda-qkv', 'kda-decay', 'kda-beta'], ['kda-state', 'kda-cache'], ['kda-output']],
		{
			short: 'KDA',
			glyph: 'state',
			facts: [
				`${heads} heads · 128 channels per head`,
				'Three short convolutions · kernel 4',
				'No RoPE in this KDA implementation'
			],
			edges: [
				['kda-qkv', 'kda-state'],
				['kda-decay', 'kda-state'],
				['kda-beta', 'kda-state'],
				['kda-state', 'kda-output'],
				['kda-state', 'kda-cache'],
				['kda-cache', 'kda-state', 'feedback']
			]
		}
	);
	add(
		'kda-qkv',
		'Queries, keys, values',
		'Three independent projections read the input. Each passes through its own short convolution and SiLU; queries and keys are then L2-normalized inside the KDA kernel.',
		[['kda-q', 'kda-k', 'kda-v']],
		{ short: 'Q / K / V', glyph: 'matrix' }
	);
	for (const [key, name] of [
		['q', 'Query'],
		['k', 'Key'],
		['v', 'Value']
	]) {
		add(
			`kda-${key}`,
			`${name} path`,
			key === 'q'
				? 'The query chooses what to read from recurrent memory.'
				: key === 'k'
					? 'The key addresses the memory location to correct.'
					: 'The value supplies the content to write into memory.',
			[[`kda-${key}-proj`], [`kda-${key}-conv`], ...(key === 'v' ? [] : [['l2norm']])],
			{ glyph: 'matrix' }
		);
		leaf(
			`kda-${key}-proj`,
			`${name} projection`,
			`A learned linear map produces ${heads * 128} features, reshaped into ${heads} heads of 128 channels.`,
			'matrix',
			{ facts: [`${hidden} → ${heads * 128}`, `${key}_proj · original precision`] }
		);
		leaf(
			`kda-${key}-conv`,
			'Short conv + SiLU',
			'A causal depthwise convolution mixes the current position with three previous positions, independently per channel. SiLU adds a nonlinearity. The convolution history is cached during decoding.',
			'conv',
			{ facts: ['Kernel 4 · one filter per channel'], formula: 'SiLU(Conv1d(projection(x)))' }
		);
	}
	leaf(
		'l2norm',
		'L2 normalization',
		'Normalize each query or key vector to unit length before the recurrent update. This controls the scale of memory reads and writes.',
		'norm',
		{ formula: 'q̂ = q / ‖q‖₂; k̂ = k / ‖k‖₂' }
	);
	add(
		'kda-decay',
		'Channel-wise decay',
		'The input predicts a separate forgetting rate for every key channel. Learned time-scale parameters shape the decay. Ming enables the safe-gate path with a lower bound of −5.',
		[['kda-f'], ['kda-time'], ['kda-alpha']],
		{ short: 'Decay α', glyph: 'gate' }
	);
	leaf(
		'kda-f',
		'Decay projection',
		'f_proj maps the input to one decay-control value per head channel. Both checkpoints use a direct projection, not the optional low-rank branch.',
		'matrix',
		{ facts: [`${hidden} → ${heads * 128}`] }
	);
	leaf(
		'kda-time',
		'A_log + dt_bias',
		'A learned per-head time scale and per-channel bias parameterize the decay gate. These parameters retain their source float32 representation.',
		'gate',
		{ facts: ['A_log: one per head', 'dt_bias: one per head channel'] }
	);
	leaf(
		'kda-alpha',
		'Forget old state',
		'Convert the predicted controls into a decay factor for each key channel. Different channels can retain or forget information at different rates.',
		'gate',
		{ formula: 'S̄ₜ = diag(αₜ) Sₜ₋₁' }
	);
	leaf(
		'kda-beta',
		'Write strength β',
		'b_proj produces one value per head, followed by sigmoid. This scalar controls how strongly the new value corrects the memory’s prediction.',
		'gate',
		{ formula: 'β = sigmoid(b_proj(x))', facts: [`${hidden} → ${heads} gates`] }
	);
	add(
		'kda-state',
		'Delta-rule memory',
		'First decay the old memory. Read its prediction at the new key, calculate the error against the new value, and write a correction. The query then reads the updated memory.',
		[['state-decay'], ['state-error'], ['state-write'], ['state-read']],
		{
			short: 'Read / write state',
			glyph: 'state',
			facts: [
				'Conceptual per-token recurrence',
				'128 × 128 matrix per head; independent of context length'
			]
		}
	);
	leaf(
		'state-decay',
		'Decay memory',
		'Apply the channel-wise forgetting gate to the previous key-by-value memory matrix.',
		'state',
		{ formula: 'S̄ₜ = diag(αₜ) Sₜ₋₁' }
	);
	leaf(
		'state-error',
		'Predict + compare',
		'Read the decayed memory using the new key. Subtract that prediction from the new value to find the information that needs updating.',
		'sum',
		{ formula: 'eₜ = vₜ − S̄ₜᵀ kₜ' }
	);
	leaf(
		'state-write',
		'Write correction',
		'The outer product of the key and value error updates the memory. β controls the update strength.',
		'state',
		{ formula: 'Sₜ = S̄ₜ + βₜ kₜ eₜᵀ' }
	);
	leaf(
		'state-read',
		'Read with query',
		'Read the updated matrix using the query. The implementation also applies the attention scale; the equation shows the core read operation.',
		'matrix',
		{ formula: 'oₜ ∝ Sₜᵀ qₜ' }
	);
	leaf(
		'kda-cache',
		'Recurrent cache',
		'Keep the final memory matrix and the three short-convolution histories. The reference code uses fused recurrent execution for sequences of at most 64 tokens, and chunked execution for longer sequences.',
		'state',
		{ facts: ['Fixed state size per KDA layer', 'This is not an NVFP4 KV cache'] }
	);
	add(
		'kda-output',
		'Gated output',
		'Normalize each head’s memory read, multiply it by a sigmoid gate predicted from the input, then project the joined heads back to the residual width.',
		[['kda-output-gate', 'kda-head-norm'], ['kda-output-product'], ['kda-out-proj']],
		{ glyph: 'gate' }
	);
	leaf(
		'kda-output-gate',
		'Output sigmoid gate',
		'g_proj supplies one gate per head channel. This is a separate control from the decay gate, write-strength gate, MoE router, and expert gate projection.',
		'gate',
		{ formula: 'gate = sigmoid(g_proj(x))' }
	);
	leaf(
		'kda-head-norm',
		'Head RMSNorm',
		'Normalize each 128-channel head before applying the output gate. The implementation fuses the normalization and gating operations.',
		'norm',
		{ formula: 'normalized = RMSNorm(o)' }
	);
	leaf(
		'kda-output-product',
		'Apply output gate',
		'Multiply the normalized memory read by its sigmoid gate, independently per channel.',
		'gate',
		{ formula: 'gated = RMSNorm(o) ⊙ sigmoid(g)' }
	);
	leaf(
		'kda-out-proj',
		'Output projection',
		'Concatenate the gated head outputs and map them back to the Thinker hidden width.',
		'matrix',
		{ facts: [`${heads * 128} → ${hidden}`, 'o_proj · original precision'] }
	);

	add(
		'mla',
		'Multi-head latent attention',
		'Compress the key/value input through a shared low-rank representation, reconstruct per-head keys and values, add rotary position information, and run causal softmax attention.',
		[['mla-query', 'mla-kv'], ['rope', 'mla-cache'], ['mla-softmax'], ['mla-output']],
		{
			short: 'MLA',
			glyph: 'matrix',
			facts: [
				`${heads} heads · Q/K width 192 · V width 128`,
				'KV latent width 512',
				tiny ? 'Query bottleneck: 256' : 'Direct query projection'
			],
			edges: [
				['mla-query', 'rope'],
				['mla-kv', 'rope'],
				['rope', 'mla-cache'],
				['rope', 'mla-softmax'],
				['mla-cache', 'mla-softmax'],
				['mla-softmax', 'mla-output']
			]
		}
	);
	add(
		'mla-query',
		'Query path',
		tiny
			? 'Tiny compresses the input to 256 query features, normalizes them, and expands to per-head queries.'
			: 'Flash projects directly from the hidden state to per-head queries; it has no query low-rank bottleneck.',
		tiny ? [['mla-q-down'], ['mla-q-norm'], ['mla-q-up']] : [['mla-q-up']],
		{ glyph: 'matrix' }
	);
	leaf(
		'mla-q-down',
		'Query compression',
		'A learned linear map creates Tiny’s 256-dimensional query bottleneck.',
		'matrix',
		{ facts: ['q_a_proj · 1,536 → 256'] }
	);
	leaf(
		'mla-q-norm',
		'Query RMSNorm',
		'Normalize the compressed query representation before expanding it into attention heads.',
		'norm',
		{ facts: ['Width 256'] }
	);
	leaf(
		'mla-q-up',
		'Per-head queries',
		`Produce ${heads} query heads, each with 128 non-rotary channels and 64 rotary channels.`,
		'matrix',
		{ facts: [tiny ? 'q_b_proj · 256 → 3,072' : 'q_proj · 2,560 → 6,144'] }
	);
	add(
		'mla-kv',
		'Key/value path',
		'One projection produces a 512-wide latent plus a 64-wide positional key. Normalize the latent and expand it into the non-rotary keys and values for each head.',
		[['mla-kv-down'], ['mla-kv-norm'], ['mla-kv-up']],
		{ glyph: 'matrix' }
	);
	leaf(
		'mla-kv-down',
		'KV compression',
		'Split the projection into a 512-dimensional shared KV latent and a 64-dimensional rotary key branch.',
		'matrix',
		{ facts: [`kv_a_proj_with_mqa · ${hidden} → 576`] }
	);
	leaf(
		'mla-kv-norm',
		'KV RMSNorm',
		'Normalize the 512-dimensional KV latent before reconstructing per-head keys and values.',
		'norm'
	);
	leaf(
		'mla-kv-up',
		'Reconstruct K / V',
		'Expand the normalized latent. Each head gets 128 non-rotary key channels and 128 value channels; the rotary key branch is shared across heads.',
		'matrix',
		{ facts: [`kv_b_proj · 512 → ${heads * 256}`] }
	);
	add(
		'rope',
		'Rotary positions',
		'Rotate pairs of query/key channels according to token position. Only the 64 rotary channels are rotated; 128 content channels are left unchanged.',
		[['rope-frequencies'], ['rope-rotate']],
		{ glyph: 'gate', facts: ['Interleaved pairs · θ = 6,000,000'] }
	);
	leaf(
		'rope-frequencies',
		'Position frequencies',
		'Use inverse frequencies at different scales to turn the token index into rotation angles.',
		'tensor',
		{ formula: 'angle(position, i) = position / θ^(2i/d)' }
	);
	leaf(
		'rope-rotate',
		'Rotate Q / K pairs',
		'Apply sine/cosine rotations to each pair of positional channels in Q and K. Their dot product now carries relative-position information.',
		'gate',
		{ formula: '(a, b) → (a cos θ − b sin θ, a sin θ + b cos θ)' }
	);
	leaf(
		'mla-cache',
		'MLA cache',
		'Reuse past attention keys and values during generation. The pinned Transformers implementation caches reconstructed K/V tensors. A serving backend may use a different layout; the low-rank projection alone does not prove a compressed cache.',
		'state',
		{ facts: ['Not quantized by this recipe', 'Cache grows with the token history'] }
	);
	add(
		'mla-softmax',
		'Causal attention',
		'Compare queries with present and past keys, hide future positions, normalize scores, and mix the values.',
		[['attention-scores'], ['causal-softmax'], ['value-mix']],
		{ glyph: 'matrix' }
	);
	leaf(
		'attention-scores',
		'QKᵀ scores',
		'Each query scores keys by a scaled dot product.',
		'matrix',
		{ formula: 'scores = QKᵀ / √192' }
	);
	leaf(
		'causal-softmax',
		'Mask + softmax',
		'Mask future positions before softmax so a token can only use its own position and earlier ones. The normalized scores form attention weights.',
		'gate'
	);
	leaf(
		'value-mix',
		'Weighted values',
		'Multiply the attention weights by the value vectors and sum over positions.',
		'matrix',
		{ formula: 'output = softmax(scores + mask) V' }
	);
	add(
		'mla-output',
		'Gated MLA output',
		'A learned sigmoid gate scales each attention head. The joined heads then pass through the dense output projection.',
		[['mla-gate'], ['mla-dense']],
		{ glyph: 'gate' }
	);
	leaf(
		'mla-gate',
		'Head-wise gate',
		'g_proj predicts one sigmoid gate per head, broadcast over that head’s 128 value channels.',
		'gate',
		{ facts: [`${heads} gates per token`] }
	);
	leaf(
		'mla-dense',
		'Output projection',
		'Return the concatenated head outputs to the residual width.',
		'matrix',
		{ facts: [`dense · ${heads * 128} → ${hidden}`] }
	);

	add(
		'moe',
		'Mixture of experts',
		'The router dispatches each token to eight experts. Their weighted outputs are summed, and one shared expert processes every token alongside them.',
		[['router'], ['experts', 'shared'], ['expert-sum']],
		{
			glyph: 'bank',
			status: kind === 'nvfp4' ? 'mixed' : 'source',
			edges: [
				['router', 'experts'],
				['experts', 'expert-sum'],
				['shared', 'expert-sum']
			]
		}
	);
	add(
		'router',
		'Grouped top-8 router',
		'Score every expert, use the learned routing bias to choose groups and experts, then weight the chosen experts using the original sigmoid scores. Router arithmetic stays float32.',
		[['router-scores'], ['router-groups'], ['router-topk'], ['router-weights']],
		{
			short: 'Router',
			glyph: 'gate',
			facts: [
				`${config.experts} experts · 8 groups · retain 4 groups`,
				'8 experts selected per token'
			]
		}
	);
	leaf(
		'router-scores',
		'Expert scores',
		'A float32 linear map produces one logit per expert. Sigmoid converts logits into scores; these are not a softmax over the full bank.',
		'matrix',
		{ formula: 's = sigmoid(Wrouter x)', facts: [`${hidden} → ${config.experts}`] }
	);
	leaf(
		'router-groups',
		'Choose four groups',
		'Add the expert bias for selection. Score each of eight groups by summing its two highest biased expert scores, then keep the best four groups.',
		'bank'
	);
	leaf(
		'router-topk',
		'Choose eight experts',
		'Mask experts outside those four groups and choose the top eight biased scores. Each chosen expert receives the same token vector.',
		'bank'
	);
	leaf(
		'router-weights',
		'Mixing weights',
		'Gather the unbiased sigmoid scores for the selected experts, normalize their sum, then multiply by 2.5. The bias influences selection, not these mixing weights.',
		'gate',
		{ formula: 'wᵢ = 2.5 · sᵢ / Σselected sⱼ' }
	);
	add(
		'experts',
		`${config.experts} routed experts`,
		`Each expert is its own SwiGLU network. Eight run for each token. ${kind === 'bf16' ? `Layer ${layer} is one of Tiny’s seven retained BF16 expert layers.` : kind === 'source' ? 'The selected decoder layer is dense; routed experts begin after the initial dense layers.' : 'Only the three linear projections inside these routed experts were quantized.'}`,
		[['expert'], ['expert-sum']],
		{
			short: `${config.experts} experts`,
			glyph: 'bank',
			status: kind,
			facts: [
				'Tiles represent the bank, not live routing',
				`Expert intermediate width: ${expertWidth}`
			]
		}
	);
	leaf(
		'expert-sum',
		'Combine experts',
		'Weight the eight routed outputs by the router’s mixing weights, sum them, and add the unweighted shared-expert output. The decoder then adds its residual connection.',
		'sum',
		{ formula: 'MoE(x) = Σselected wᵢ Eᵢ(x) + Eshared(x)' }
	);
	function ffn(id: string, title: string, width: number, status: Precision, limit: number | null) {
		add(
			id,
			title,
			`Two parallel projections create a gate and an expanded value. After SiLU${limit ? ' and activation clipping' : ''}, multiply them element by element and project back.`,
			[[`${id}-gate`, `${id}-up`], [`${id}-activation`], [`${id}-multiply`], [`${id}-down`]],
			{
				glyph: 'matrix',
				status: status === 'nvfp4' ? 'mixed' : status,
				formula: limit
					? 'MLP(x) = Wdown [min(SiLU(Wgate x), c) ⊙ clamp(Wup x, −c, c)]'
					: 'MLP(x) = Wdown [SiLU(Wgate x) ⊙ (Wup x)]',
				facts: [
					`${hidden} → ${width} → ${hidden}`,
					limit
						? `This layer clips SwiGLU activations at ${limit}`
						: 'No SwiGLU clipping in this layer'
				],
				edges: [
					[`${id}-gate`, `${id}-activation`],
					[`${id}-activation`, `${id}-multiply`],
					[`${id}-up`, `${id}-multiply`],
					[`${id}-multiply`, `${id}-down`]
				]
			}
		);
		for (const p of ['gate', 'up', 'down']) {
			const dims = p === 'down' ? `${width} → ${hidden}` : `${hidden} → ${width}`;
			add(
				`${id}-${p}`,
				`${p[0].toUpperCase() + p.slice(1)} projection`,
				p === 'gate'
					? 'A learned feature gate for the expert. It does not choose which expert runs; that is the router’s job.'
					: p === 'up'
						? 'Expand the token into the intermediate feature space that the gate will modulate.'
						: 'Map the gated intermediate features back to the residual width.',
				[[`${id}-${p}-weights`, `${id}-${p}-inputs`], [`${id}-${p}-product`]],
				{
					short: `${p[0].toUpperCase() + p.slice(1)} projection`,
					glyph: 'matrix',
					status,
					facts: [
						`${p}_proj · ${dims}`,
						status === 'nvfp4'
							? 'Weights and input activations: NVFP4'
							: status === 'bf16'
								? 'Routed expert retained in BF16'
								: 'Unchanged linear weights'
					]
				}
			);
			leaf(
				`${id}-${p}-weights`,
				'Weights',
				status === 'nvfp4'
					? 'Model Optimizer calibrates and packs these weights in NVFP4. Two four-bit values share each stored byte, with block and global scales.'
					: 'These projection weights keep their source BF16 values. They were excluded from the four-bit conversion.',
				'matrix',
				{
					status,
					source: status === 'nvfp4' ? sources.quant : sources.decoder,
					facts: [
						status === 'nvfp4'
							? 'Packed weights + weight_scale + weight_scale_2'
							: 'Unchanged source tensor'
					]
				}
			);
			leaf(
				`${id}-${p}-inputs`,
				'Input activations',
				status === 'nvfp4'
					? 'Quantize the linear input to NVFP4 at execution time using calibrated scales. Flash pools activation-scale inputs across experts; each expert retains separate weight scales.'
					: 'The input to this linear is not converted to NVFP4 by our recipe.',
				'tensor',
				{ status, source: sources.quant }
			);
			leaf(
				`${id}-${p}-product`,
				'Linear operation',
				'Multiply the input by the learned weight matrix. Quantization changes the representation used by the selected linears; it does not turn the entire residual stream, SiLU, routing, or accumulation into four-bit values.',
				'matrix',
				{
					status,
					formula: 'y = x Wᵀ',
					facts: [dims],
					source: status === 'nvfp4' ? sources.quant : sources.decoder
				}
			);
		}
		leaf(
			`${id}-activation`,
			limit ? 'SiLU + clipping' : 'SiLU gate',
			limit
				? `Apply SiLU to the gate, cap it at ${limit}, and clamp the up branch to [−${limit}, ${limit}] before multiplying. This is part of the original Flash checkpoint, not our quantization change.`
				: 'Multiply each gate value by its sigmoid. This smooth nonlinear gate controls which intermediate features pass through.',
			'gate',
			{ formula: 'SiLU(g) = g · sigmoid(g)' }
		);
		leaf(
			`${id}-multiply`,
			'Element-wise product',
			'Multiply the activated gate and the up-projection output channel by channel. This operation itself is not one of the quantized linear modules.',
			'gate',
			{ formula: 'intermediate = gate ⊙ up' }
		);
	}
	ffn('expert', 'One routed expert', expertWidth, kind, !tiny && layer >= 35 ? 4 : null);
	ffn(
		'shared',
		'Shared expert',
		expertWidth,
		'source',
		!tiny && layer >= 34 ? (layer >= 40 ? 7 : 5) : null
	);
	topics.shared.body =
		'One shared expert processes every token without top-k selection. Its three projections keep their original precision. ' +
		topics.shared.body;
	ffn('dense', 'Dense feed-forward', tiny ? 4608 : 6144, 'source', null);
	topics.dense.body =
		`Used in the first ${config.dense} decoder ${config.dense === 1 ? 'layer' : 'layers'}, with no router or expert bank. ` +
		topics.dense.body;
	add(
		'head',
		'Text output',
		'After the decoder stack, normalize the hidden states and score the vocabulary. The generation policy chooses the next token and repeats.',
		[['norm'], ['lm-head'], ['generation']],
		{ source: sources.audio }
	);
	leaf(
		'lm-head',
		'Vocabulary projection',
		'An untied linear head maps each hidden vector to one logit per vocabulary token. These weights were not quantized.',
		'matrix',
		{ source: sources.audio, facts: [`${hidden} → 157,184 logits`] }
	);
	leaf(
		'generation',
		'Decode next token',
		'A decoding policy selects the next token and appends it to the sequence. Our benchmarks used greedy decoding with thinking disabled; generation settings are separate from the architecture.',
		'tensor',
		{ source: sources.quant }
	);

	add(
		'speech',
		'Optional speech output',
		'The official Talker receives text, normalizes it, and generates continuous audio latents. AudioVAE decodes them into a waveform. This is a separate speech model, not a direct projection of Thinker hidden states.',
		[['speech-text', 'voice'], ['talker'], ['vae']],
		{
			glyph: 'wave',
			source: sources.talker,
			facts: ['All speech components unchanged', 'Speech output was not evaluated'],
			edges: [
				['speech-text', 'talker'],
				['voice', 'talker'],
				['talker', 'vae']
			]
		}
	);
	leaf(
		'speech-text',
		'Prepare speech text',
		'Split text into fragments, apply the language-aware Talker normalizer where appropriate, preserve supported paralinguistic tags, and tokenize with the Talker’s own tokenizer.',
		'tensor',
		{ source: sources.talker }
	);
	add(
		'voice',
		'Voice conditioning',
		'Use a built-in voice instruction or provide reference audio. Reference mode can supply a speaker embedding and, for continuation, reference audio latents.',
		[['speaker'], ['voice-projection'], ['vae-encoder']],
		{ glyph: 'wave', source: sources.talker, edges: [['speaker', 'voice-projection']] }
	);
	leaf(
		'speaker',
		'Speaker encoder',
		'The reference-audio path extracts acoustic features and uses the bundled CAMPPlus speaker encoder to produce a 192-dimensional speaker embedding.',
		'wave',
		{ source: sources.talker }
	);
	leaf(
		'voice-projection',
		'Speaker projection',
		'spk_head maps the reference speaker embedding to the Talker’s 896-dimensional input space.',
		'matrix',
		{ source: sources.talker, facts: ['192 → 896'] }
	);
	add(
		'talker',
		'Talker autoregression',
		'A Qwen2 decoder conditions a flow model that creates the next 64-channel audio latent. An aggregator turns that latent into the next decoder input. A stop head decides when speech is complete.',
		[['talker-decoder'], ['flow', 'stop-head'], ['aggregator']],
		{
			glyph: 'stack',
			source: sources.talker,
			facts: ['Own decoder: 24 layers · width 896', 'One latent patch per generation step'],
			edges: [
				['talker-decoder', 'flow'],
				['talker-decoder', 'stop-head'],
				['flow', 'aggregator'],
				['aggregator', 'talker-decoder', 'feedback']
			]
		}
	);
	add(
		'talker-decoder',
		'Talker decoder ×24',
		'The speech model uses a separate dense Qwen2 decoder with grouped-query attention, rotary positions, RMSNorm, and SwiGLU. It does not use the Thinker’s KDA/MoE layers.',
		[['talker-norm'], ['talker-attn'], ['talker-residual'], ['talker-ffn']],
		{
			short: 'Talker decoder',
			glyph: 'stack',
			source: sources.talker,
			facts: ['24 layers · width 896', '14 query heads · 2 KV heads', 'FFN width 4,864']
		}
	);
	leaf(
		'talker-norm',
		'Speech RMSNorm',
		'Normalize the speech decoder stream before attention and before the dense feed-forward block.',
		'norm',
		{ source: sources.talker }
	);
	add(
		'talker-attn',
		'Grouped-query attention',
		'Project queries, keys, and values, apply rotary positions to Q/K, and use causal softmax attention. Seven query heads share each key/value head.',
		[['talker-qkv'], ['talker-rope'], ['talker-mix']],
		{ short: 'GQA attention', glyph: 'matrix', source: sources.talker }
	);
	leaf(
		'talker-qkv',
		'Speech Q / K / V',
		'Form 14 query heads and two key/value heads, each 64 channels wide. The smaller KV head count reduces cache size.',
		'matrix',
		{ source: sources.talker }
	);
	leaf(
		'talker-rope',
		'Speech rotary positions',
		'Rotate query/key pairs by their position using the Talker’s rotary base of 1,000,000.',
		'gate',
		{ source: sources.talker }
	);
	leaf(
		'talker-mix',
		'Causal mix + output',
		'Apply the causal mask, softmax the scaled query/key scores, combine values, and project back to 896 features.',
		'matrix',
		{ source: sources.talker }
	);
	leaf(
		'talker-residual',
		'Speech residual',
		'Add attention or feed-forward output back to the incoming speech decoder stream.',
		'sum',
		{ source: sources.talker }
	);
	add(
		'talker-ffn',
		'Speech SwiGLU',
		'Expand from 896 to 4,864 features through parallel gate and up projections, apply SiLU and multiplication, then return to 896 features.',
		[['talker-gate', 'talker-up'], ['talker-product'], ['talker-down']],
		{ glyph: 'matrix', source: sources.talker }
	);
	for (const p of ['gate', 'up', 'down'])
		leaf(
			`talker-${p}`,
			`${p[0].toUpperCase() + p.slice(1)} projection`,
			`The Talker’s ${p} projection is an unchanged dense linear map.`,
			'matrix',
			{ source: sources.talker, facts: [p === 'down' ? '4,864 → 896' : '896 → 4,864'] }
		);
	leaf(
		'talker-product',
		'SiLU × up',
		'Apply SiLU to the gate branch and multiply it with the up branch before the down projection.',
		'gate',
		{ source: sources.talker }
	);
	add(
		'flow',
		'Conditional flow model',
		'Start with noise and predict updates conditioned on the Talker hidden state and previous audio latent. The sampler integrates these updates to generate the next latent.',
		[['flow-input', 'flow-condition'], ['dit'], ['flow-sampler']],
		{
			glyph: 'state',
			source: sources.cfm,
			facts: ['64 latent channels', 'Default configuration: 10 sampling steps']
		}
	);
	leaf(
		'flow-input',
		'Noise + history',
		'Concatenate the previous latent with the current noisy latent, then project 64 channels to the flow transformer’s 1,024-wide feature space.',
		'tensor',
		{ source: sources.flow }
	);
	leaf(
		'flow-condition',
		'Time + text condition',
		'Embed the sampling timestep and project the Talker’s 896-wide hidden state to 1,024 features. Add them and prepend the result as a conditioning token.',
		'tensor',
		{ source: sources.flow }
	);
	add(
		'dit',
		'Flow transformer ×8',
		'Eight transformer blocks process the conditioning token and latent sequence. The final projection predicts a 64-channel update for the generated latent.',
		[['dit-position'], ['dit-block'], ['dit-output']],
		{
			short: 'DiT ×8',
			glyph: 'stack',
			source: sources.flow,
			facts: ['Width 1,024 · 16 heads · MLP ratio 4']
		}
	);
	leaf(
		'dit-position',
		'Latent rotary positions',
		'Compute rotary position embeddings for the conditioning, history, and current latent sequence.',
		'gate',
		{ source: sources.flow }
	);
	add(
		'dit-block',
		'Flow transformer block',
		'A pre-normalized attention sublayer and a pre-normalized feed-forward sublayer each add a residual update.',
		[['dit-norm'], ['dit-attn'], ['dit-mlp']],
		{ glyph: 'stack', source: sources.flow }
	);
	leaf(
		'dit-norm',
		'Block normalization',
		'RMSNorm normalizes the 1,024-wide flow features before attention and again before the MLP. The epsilon is 10⁻⁶.',
		'norm',
		{ source: sources.flow }
	);
	leaf(
		'dit-attn',
		'Latent attention',
		'Sixteen attention heads exchange information between the condition, history, and noisy latent tokens using rotary positions.',
		'matrix',
		{ source: sources.flow }
	);
	leaf(
		'dit-mlp',
		'Flow MLP + residual',
		'A linear map expands from 1,024 to 4,096 features. GELU with a tanh approximation provides the nonlinearity; a second linear map returns to 1,024. Add the result to the residual input.',
		'matrix',
		{ source: sources.flow }
	);
	leaf(
		'dit-output',
		'Latent update',
		'Normalize and project the transformer output to 64 channels for the current latent patch.',
		'matrix',
		{ source: sources.flow }
	);
	leaf(
		'flow-sampler',
		'Integrate flow',
		'Evaluate conditioned and unconditioned predictions for guidance, then integrate the predicted update over the sampling schedule. Optional stochastic noise is controlled separately by the synthesis settings.',
		'state',
		{ source: sources.cfm, formula: 'xnext = x + Δt · guided_update (+ optional noise)' }
	);
	add(
		'aggregator',
		'Latent feedback',
		'Map generated 64-channel latents into the next 896-channel Talker input. A learned summary token collects the information through eight transformer blocks.',
		[['agg-project'], ['agg-summary'], ['agg-blocks'], ['agg-output']],
		{ glyph: 'stack', source: sources.aggregator, facts: ['8 blocks · width 1,024 · 16 heads'] }
	);
	leaf(
		'agg-project',
		'Embed latent',
		'Project the 64-channel latent to 1,024 features.',
		'matrix',
		{ source: sources.aggregator }
	);
	leaf(
		'agg-summary',
		'Summary token + RoPE',
		'Prepend a learned summary token and add rotary position information to attention.',
		'tensor',
		{ source: sources.aggregator }
	);
	add(
		'agg-blocks',
		'Aggregator blocks ×8',
		'Use eight blocks of the same transformer-block family as the flow model. Attention collects the latent information into the summary token.',
		[['dit-block']],
		{ glyph: 'stack', source: sources.aggregator }
	);
	leaf(
		'agg-output',
		'Next decoder input',
		'The final projection maps to 896 features, and the summary-token output becomes the next Talker decoder embedding.',
		'matrix',
		{ source: sources.aggregator }
	);
	leaf(
		'stop-head',
		'Stop prediction',
		'A two-class head reads the Talker hidden state. The reference generation loop stops when the stop probability exceeds 0.5 after the initial steps, or reaches its step limit.',
		'gate',
		{ source: sources.talker, facts: ['896 → 2 logits'] }
	);
	add(
		'vae',
		'AudioVAE',
		'Generated continuous latents enter the decoder to become audio. A separate encoder converts reference waveforms into latents for voice continuation.',
		[['vae-encoder', 'vae-decoder']],
		{
			glyph: 'wave',
			source: sources.vae,
			facts: ['64 latent channels', '44.1 kHz output', 'Encoder and decoder are distinct paths'],
			edges: []
		}
	);
	add(
		'vae-encoder',
		'Reference audio encoder',
		'Split the waveform into frames, encode them with a Qwen2 backbone, aggregate four-frame patches, and predict latent-distribution parameters.',
		[['vae-frames'], ['vae-encode-backbone'], ['vae-patches'], ['vae-distribution']],
		{ glyph: 'wave', source: sources.vae }
	);
	leaf(
		'vae-frames',
		'Waveform frames',
		'Frame the 44.1 kHz waveform into 882-sample windows with an 882-sample hop. Linear projections map each frame into 896 features.',
		'wave',
		{ source: sources.vae, facts: ['20 ms per frame'] }
	);
	add(
		'vae-encode-backbone',
		'VAE encoder ×24',
		'The encoder uses a 24-layer, 896-wide Qwen2 backbone. Its configuration uses 14 query heads, two KV heads, and a local window of 64 frames.',
		[['talker-attn'], ['talker-ffn']],
		{ glyph: 'stack', source: sources.vae }
	);
	leaf(
		'vae-patches',
		'Patch aggregation',
		'Group four frames, append a learned summary token, and run a separate four-layer Qwen2 aggregator. Keep its summary output for each patch.',
		'stack',
		{ source: sources.vae }
	);
	leaf(
		'vae-distribution',
		'Latent parameters',
		'A final linear map predicts mean and log-variance for a 64-dimensional latent distribution. The reference inference helper samples from that distribution.',
		'matrix',
		{ source: sources.vae, facts: ['128 output parameters per patch'] }
	);
	add(
		'vae-decoder',
		'Waveform decoder',
		'Project a 64-channel latent into 896 features, upsample it by four, process it through a Qwen2 decoder, and reconstruct audio with an inverse-STFT head.',
		[['vae-latent-proj'], ['vae-upsample'], ['vae-decode-backbone'], ['istft']],
		{ glyph: 'wave', source: sources.vae }
	);
	leaf(
		'vae-latent-proj',
		'Latent projection',
		'Map each 64-channel audio latent to the decoder’s 896-wide feature space.',
		'matrix',
		{ source: sources.vae }
	);
	leaf(
		'vae-upsample',
		'Upsample ×4',
		'Linearly interpolate the latent features to restore four frame positions per latent. Streaming inference keeps interpolation state between chunks.',
		'conv',
		{ source: sources.vae }
	);
	add(
		'vae-decode-backbone',
		'VAE decoder ×24',
		'A separate 24-layer, 896-wide Qwen2 backbone converts upsampled features into frame representations. The local attention window is 64 frames.',
		[['talker-attn'], ['talker-ffn']],
		{ glyph: 'stack', source: sources.vae }
	);
	leaf(
		'istft',
		'Inverse STFT',
		'An output head predicts spectral components and reconstructs the waveform by inverse short-time Fourier transform with overlap between frames.',
		'wave',
		{ source: sources.vae, facts: ['FFT size 3,528 · hop 882', '44,100 samples / second'] }
	);

	add(
		'mtp',
		'Auxiliary next-token predictor',
		'Both checkpoints include one additional MTP layer after the main decoder stack. It combines shifted token embeddings with hidden states. The audio wrapper supplies inputs_embeds, so this auxiliary branch is skipped in our evaluated path and its weights are preserved.',
		[['mtp-input'], ['mtp-attention'], ['mtp-moe'], ['mtp-norm']],
		{
			short: 'Auxiliary MTP',
			glyph: 'stack',
			facts: [
				'1 auxiliary layer · not part of the main 24 / 42 layers',
				'Excluded from quantization and the evaluated forward path'
			]
		}
	);
	leaf(
		'mtp-input',
		'Combine inputs',
		'Normalize the shifted token embedding and previous hidden state separately, concatenate them, then project from twice the hidden width back to the hidden width.',
		'matrix',
		{ facts: [`${2 * hidden} → ${hidden}`] }
	);
	add(
		'mtp-attention',
		'MTP attention',
		'The auxiliary layer uses MLA with pre-normalization and a residual connection. Its attention stays unchanged.',
		[['mla']],
		{ glyph: 'matrix' }
	);
	add(
		'mtp-moe',
		'MTP experts',
		'The auxiliary layer has its own routed MoE and shared expert. All of those expert weights remain at source precision; they are outside the base-layer quantization selection.',
		[['router'], ['mtp-expert', 'mtp-shared'], ['expert-sum']],
		{
			glyph: 'bank',
			facts: [`${config.experts} routed experts · top 8 · 1 shared`],
			edges: [
				['router', 'mtp-expert'],
				['mtp-expert', 'expert-sum'],
				['mtp-shared', 'expert-sum']
			]
		}
	);
	ffn('mtp-expert', 'Unchanged MTP expert', expertWidth, 'source', null);
	ffn('mtp-shared', 'MTP shared expert', expertWidth, 'source', null);
	leaf(
		'mtp-norm',
		'MTP final norm',
		'Apply final RMSNorm to the auxiliary output. The model’s main text predictions still come from the main decoder output.',
		'norm'
	);
	return topics;
}
