import React, { useRef, useEffect } from 'react';

/**
 * QuantumCoreShader
 * WebGL Fragment Shader para el fondo de la pantalla de inicio de Aura3D.
 * Renderiza el núcleo abisal (#03050c), anillos de energía orbitales cuánticos,
 * polvo de partículas en suspensión e interactividad sutil con el ratón a 60 FPS sin carga en la CPU.
 */
export const QuantumCoreShader: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    let animId: number;

    const syncSize = () => {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    window.addEventListener('resize', syncSize);
    syncSize();

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      #define PI 3.14159265359

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);

        // Abyssal deep background gradient #03050c to #070a14
        vec3 colAbyssal = vec3(0.012, 0.020, 0.047);
        vec3 colDeep    = vec3(0.027, 0.039, 0.078);
        vec3 col = mix(colAbyssal, colDeep, dist * 0.85);

        // Accent Palette: Cyan #00e5ff, Phosphor Green #00ff9d, Violet #8c38ff
        vec3 colCyan   = vec3(0.0, 0.898, 1.0);
        vec3 colGreen  = vec3(0.0, 1.0, 0.615);
        vec3 colViolet = vec3(0.55, 0.22, 1.0);

        // Subtle mouse influence
        vec2 m = (u_mouse - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * 0.12;
        vec2 p = uv - m;
        float pDist = length(p);
        float pAngle = atan(p.y, p.x);

        float px = 1.0 / min(u_resolution.x, u_resolution.y);

        // 1. Quantum Orbital Energy Rings
        for (float i = 1.0; i <= 3.0; i += 1.0) {
          float speed = (i == 2.0) ? -0.15 : (0.12 * i);
          float ringRadius = 0.32 + i * 0.14 + sin(u_time * 0.4 + i) * 0.02;
          
          vec2 ringP = vec2(
            p.x * cos(i * 0.8) - p.y * sin(i * 0.8),
            (p.x * sin(i * 0.8) + p.y * cos(i * 0.8)) * (0.85 + i * 0.08)
          );
          float rDist = length(ringP);
          float ringDiff = abs(rDist - ringRadius);
          
          float stroke = smoothstep(px * 1.5, 0.0, ringDiff);
          float glow = (px * 1.2 / (ringDiff + px * 2.0)) * smoothstep(px * 16.0, 0.0, ringDiff);

          vec3 ringCol = mix(colCyan, colViolet, 0.5 + 0.5 * sin(pAngle + u_time * speed));
          col += stroke * vec3(0.9, 0.95, 1.0) * 0.75;
          col += glow * ringCol * 0.40;
        }

        // 2. Parallax Quantum Dust Particles
        for (float i = 0.0; i < 28.0; i += 1.0) {
          float seed = i * 14.37;
          float baseA = seed + u_time * 0.03 * (mod(i, 2.0) == 0.0 ? 1.0 : -0.8);
          float baseR = 0.18 + fract(sin(seed) * 43758.5) * 0.65;
          baseR += 0.025 * sin(u_time * 1.2 + i);
          
          vec2 particlePos = vec2(cos(baseA), sin(baseA)) * baseR;
          float pD = length(p - particlePos);
          
          float particleSpark = smoothstep(px * 2.6, 0.0, pD);
          float particleGlow  = (px * 0.6 / (pD + px * 1.8)) * smoothstep(px * 8.0, 0.0, pD);
          
          vec3 pCol = (mod(i, 3.0) < 1.0) ? colCyan : ((mod(i, 3.0) < 2.0) ? colGreen : colViolet);
          col += (particleSpark * 1.2 + particleGlow * 0.6) * pCol;
        }

        // 3. Central Quantum Core Void
        float coreRadius = 0.185;
        float coreDiff = abs(pDist - coreRadius);

        // Titanium hairline bevel ring
        float coreBevel = smoothstep(px * 1.2, 0.0, coreDiff);
        col += coreBevel * vec3(0.85, 0.92, 1.0) * 0.5;

        // Ambient focal bloom
        float coreBloom = (px * 0.8 / (coreDiff + px * 2.5)) * smoothstep(px * 10.0, 0.0, coreDiff);
        col += coreBloom * colCyan * 0.4;

        // Deep void gravity pull
        if (pDist < coreRadius) {
          float voidFalloff = smoothstep(coreRadius, coreRadius - px * 3.0, pDist);
          col = mix(col, vec3(0.012, 0.016, 0.027), voidFalloff);
          
          // Micro reticle center pulse
          float centerDot = smoothstep(px * 2.0, 0.0, pDist);
          col += centerDot * colCyan * (0.3 + 0.4 * abs(sin(u_time * 2.0)));
        }

        // Gentle global vignette
        col *= (1.0 - smoothstep(0.4, 1.3, dist) * 0.45);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vs);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = window.innerHeight - e.clientY;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const render = (t: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouseX, mouseY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      {/* Dynamic WebGL Shader Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-75"
        style={{ display: 'block' }}
      />
      {/* Ambient Depth Vignette & Radial Diffusion Glows */}
      <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] rounded-full bg-purple-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-[600px] h-[450px] rounded-full bg-pink-500/10 blur-[160px] pointer-events-none" />
    </div>
  );
};
