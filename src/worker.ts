import { pipeline, env } from '@huggingface/transformers';

// Disable local models to force downloading from the Hugging Face Hub
env.allowLocalModels = false;

let generator: any = null;

self.onmessage = async (e) => {
  const { type, messages } = e.data;

  if (type === 'init') {
    try {
      // Using Xenova/Qwen1.5-0.5B-Chat which is a highly capable and small chat model (~350MB)
      // It is guaranteed to exist and work with Transformers.js
      generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
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
        generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
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
        temperature: 0.7,
        do_sample: true,
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
