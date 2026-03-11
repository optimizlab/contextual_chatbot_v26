import { pipeline, env } from '@huggingface/transformers';

// Disable local models to force downloading from the Hugging Face Hub
env.allowLocalModels = false;

// Optimize WASM threads in case WebGPU is not supported
if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
  env.backends.onnx.wasm.numThreads = Math.min(navigator.hardwareConcurrency, 4);
}

let generator: any = null;

const fileProgress = new Map<string, { loaded: number, total: number }>();
let lastTime = performance.now();
let lastLoaded = 0;
let currentSpeed = 0;
let currentEta = 0;

const handleProgress = (data: any) => {
  if (data.status === 'downloading') {
    fileProgress.set(data.file, { loaded: data.loaded, total: data.total });
    
    let totalLoaded = 0;
    let totalSize = 0;
    fileProgress.forEach((val) => {
      totalLoaded += val.loaded;
      totalSize += val.total || 0;
    });

    const now = performance.now();
    const timeDiff = (now - lastTime) / 1000;
    
    if (timeDiff >= 0.25) { // Update speed every 250ms
      const bytesDiff = totalLoaded - lastLoaded;
      currentSpeed = bytesDiff / timeDiff;
      const remainingBytes = totalSize - totalLoaded;
      currentEta = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
      
      lastTime = now;
      lastLoaded = totalLoaded;
    }
    
    self.postMessage({ 
      type: 'progress', 
      data: { 
        ...data, 
        overallLoaded: totalLoaded,
        overallTotal: totalSize,
        speed: currentSpeed, 
        eta: currentEta 
      } 
    });
  } else {
    self.postMessage({ type: 'progress', data });
  }
};

self.onmessage = async (e) => {
  const { type, messages, modelId } = e.data;

  if (type === 'init') {
    try {
      const targetModel = modelId || 'onnx-community/Qwen2.5-0.5B-Instruct';
      // Using the selected model
      generator = await pipeline('text-generation', targetModel, {
        dtype: 'q4',
        device: 'webgpu',
        progress_callback: handleProgress
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      console.warn("WebGPU failed, falling back to WASM", err);
      try {
        const targetModel = modelId || 'onnx-community/Qwen2.5-0.5B-Instruct';
        // Fallback to WASM if WebGPU is not available
        generator = await pipeline('text-generation', targetModel, {
          dtype: 'q4',
          device: 'wasm',
          progress_callback: handleProgress
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
