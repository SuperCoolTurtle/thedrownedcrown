import { InferenceConfig, ProgressCallback, VoiceId } from './types';

interface TtsSessionOptions {
    voiceId: VoiceId;
    progress?: ProgressCallback;
    logger?: (text: string) => void;
    /**
     * These are the option paths to a PUBLIC directory or server endpoint
     * which can retrieve the relevant WASMs to use PiperTTS models.
     * The defaults can be viewed in ./fixtures constants
     * onnxWasm: {@link ONNX_BASE}
     * piperData/piperWASM: {@link WASM_BASE}
    */
    wasmPaths?: {
        onnxWasm: string;
        piperData: string;
        piperWasm: string;
    };
    /**
     * Allow loading local models. Defaults to true for better offline support.
     * Set to false if you want to restrict model loading to remote sources only.
     */
    allowLocalModels?: boolean;
    /**
     * Fallback strategy when CDN is unreachable.
     * 'cdn' - Only use CDN (default behavior)
     * 'local' - Only use local paths
     * 'auto' - Try CDN first, fallback to local
     */
    fallbackStrategy?: 'cdn' | 'local' | 'auto';
}
export declare class TtsSession {
    #private;
    static WASM_LOCATIONS: {
        onnxWasm: string;
        piperData: string;
        piperWasm: string;
    };
    static _instance: TtsSession | null;
    ready: boolean;
    voiceId: VoiceId;
    waitReady: Promise<void> | boolean;
    constructor({ voiceId, progress, logger, wasmPaths, allowLocalModels, fallbackStrategy, }: TtsSessionOptions);
    static create(options: TtsSessionOptions): Promise<TtsSession>;
    init(allowLocalModels?: boolean, fallbackStrategy?: 'cdn' | 'local' | 'auto'): Promise<void>;
    predict(text: string): Promise<Blob>;
}
/**
 * Run text to speech inference in new worker thread. Fetches the model
 * first, if it has not yet been saved to opfs yet.
 */
export declare function predict(config: InferenceConfig, callback?: ProgressCallback): Promise<Blob>;
export {};
