import { pipeline, env } from '@huggingface/transformers';

// Disable local models to force downloading from the Hugging Face Hub
env.allowLocalModels = false;

// Optimize WASM threads in case WebGPU is not supported
if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
  env.backends.onnx.wasm.numThreads = Math.min(navigator.hardwareConcurrency, 4);
}

let generator: any = null;

self.onmessage = async (e) => {
  const { type, messages } = e.data;

  if (type === 'init') {
    try {
      // Using onnx-community/Qwen2.5-0.5B-Instruct which is a highly capable and small chat model (~350MB)
      // Qwen2.5 is significantly better at instruction following and roleplay than Qwen1.5
      generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
        dtype: 'q4',
        device: 'webgpu',
        progress_callback: (data: any) => {
          self.postMessage({ type: 'progress', data });
        }
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      console.warn("WebGPU failed, falling back to WASM", err);
      try {
        // Fallback to WASM if WebGPU is not available
        generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
          dtype: 'q4',
          device: 'wasm',
          progress_callback: (data: any) => {
            self.postMessage({ type: 'progress', data });
          }
        });
        self.postMessage({ type: 'ready' });
      } catch (fallbackErr: any) {
        self.postMessage({ type: 'error', error: fallbackErr.message });
      }
    }
  } else if (type === 'generate') {
    try {
      const result = await generator(messages, {
        max_new_tokens: 256,
        do_sample: false, // Greedy decoding for strict instruction following
      });
      
      // Extract just the last assistant message from the chat template output
      const generated = result[0].generated_text;
      const lastMessage = Array.isArray(generated) 
        ? generated[generated.length - 1].content 
        : generated;
        
      self.postMessage({ type: 'complete', text: lastMessage });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }
};
