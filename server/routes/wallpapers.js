import express from 'express';

const router = express.Router();

/**
 * POST /api/wallpapers/generate
 * Endpoint opcional de backend para integración con Replicate / Flux / SDXL
 */
router.post('/generate', async (req, res) => {
  const { prompt, negativePrompt, width, height, seed } = req.body;
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    // Si no hay token de Replicate configurado, retornamos indicación para que el cliente use el fallback directo
    return res.status(200).json({
      success: false,
      message: 'No REPLICATE_API_TOKEN set. Use client direct AI generator.',
    });
  }

  try {
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: replicateToken });

    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: width || 1344,
          height: height || 768,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          seed: seed || Math.floor(Math.random() * 1000000),
        },
      }
    );

    const url = Array.isArray(output) ? output[0] : output;
    return res.json({ success: true, url });
  } catch (error) {
    console.error('[Wallpaper Route Error]', error);
    return res.status(500).json({ success: false, error: 'Generation failed on backend' });
  }
});

export default router;
