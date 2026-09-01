struct Uniforms {
  resolution: vec2<f32>,
  time: f32,
  intensity: f32,
  colors: array<vec4<f32>, 6>,
  blobs: array<vec4<f32>, 6>,
  motion: array<vec4<f32>, 6>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );

  var output: VertexOutput;
  output.position = vec4<f32>(positions[index], 0.0, 1.0);
  return output;
}

fn hash(position: vec2<f32>) -> f32 {
  return fract(sin(dot(position, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

// Signal generation stays isolated so a sampled audio waveform can replace it later.
fn sampleWaveform(position: f32, phase: f32) -> f32 {
  let angle = position * 6.2831853;
  return sin(angle + phase * 0.24) * 0.7 + sin(angle * 2.0 - phase * 0.17) * 0.3;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var density = 0.0;
  var colorSum = vec3<f32>(0.0);
  let fieldSize = min(uniforms.resolution.x, uniforms.resolution.y) * 0.90;

  for (var index = 0u; index < 6u; index += 1u) {
    let ordinal = f32(index);
    let color = uniforms.colors[index];
    let blob = uniforms.blobs[index];
    let movement = uniforms.motion[index];
    let phase = uniforms.time * movement.z * 1.12 + blob.w;
    let drift = vec2<f32>(
      sin(phase) * movement.x + sin(phase * 0.47 + blob.w * 1.7) * movement.x * 0.28,
      cos(phase * 0.89 + blob.w) * movement.y + cos(phase * 0.41 - blob.w) * movement.y * 0.24,
    ) * 0.42;
    let center = uniforms.resolution * 0.5
      + (blob.xy - vec2<f32>(0.5)) * fieldSize
      + drift;
    let delta = input.position.xy - center;
    let angle = atan2(delta.y, delta.x);
    let morph = uniforms.time * movement.w * 1.08 + blob.w * 1.37;
    let contour = 1.0
      + sin(angle * 3.0 + morph) * 0.095
      + sin(angle * 5.0 - morph * 0.73) * 0.045;
    let audio = sampleWaveform(ordinal / 6.0, uniforms.time);
    let breathing = 1.0 + sin(morph * 0.63 + blob.w) * 0.025;
    let radius = blob.z * (0.50 + audio * 0.009) * contour * breathing;
    let normalizedDistance = length(delta) / max(radius, 1.0);
    let body = exp(-normalizedDistance * normalizedDistance * 2.15);
    let aura = exp(-normalizedDistance * normalizedDistance * 0.70);
    let field = (body * 0.95 + aura * 0.05) * color.a;

    density += field;
    colorSum += color.rgb * field;
  }

  let mixedColor = colorSum / max(density, 0.0001);
  let baseGlow = (1.0 - exp(-density * 0.72)) * uniforms.intensity;
  let grain = hash(floor(input.position.xy)) - 0.5;
  let glow = clamp(baseGlow * (1.0 + grain * 0.16), 0.0, 1.0);
  let colorGrain = vec3<f32>(grain * 0.018);
  let premultiplied = max(mixedColor + colorGrain, vec3<f32>(0.0)) * glow;
  return vec4<f32>(premultiplied, glow);
}
