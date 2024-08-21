export class AudioRender {
    audioCtx: AudioContext;
    source: AudioBufferSourceNode | null = null;
    audioBuffer: AudioBuffer | null = null;
    constructor(){
        this.audioCtx = new AudioContext();
        this.source = this.audioCtx.createBufferSource();


        document.getElementById('audio-test')?.addEventListener('click',()=>{
            this.playAudioBuffer();
        });

        document.getElementById('audio-test2')?.addEventListener('click',()=>{
            this.pauseAudioBuffer();
        });
    }

    async putAudioSource(file: File){
        try{
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            this.audioBuffer = await this.decodeAudioData(arrayBuffer);
        }catch(e){
            console.error('Error decoding audio data: ', e);
        }
    }

    readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = () => {
                reject(new Error('Error reading file as ArrayBuffer'));
            };
            reader.readAsArrayBuffer(file);
        });
    }
    
    decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        return new Promise((resolve, reject) => {
            this.audioCtx.decodeAudioData(arrayBuffer, (audioBuffer) => {
                resolve(audioBuffer);
            }, (error) => {
                reject(new Error('Error decoding audio data'));
            });
        });
    }

    playAudioBuffer(time = 0) {
        this.source = this.audioCtx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.audioCtx.destination);
        this.source.start(time);
    }

    pauseAudioBuffer() {
        if(!this.source){
            return;
        }

        this.source?.stop();
    }

    getAudioDestination() {
        if(!this.audioCtx || !this.source){
            return;
        }

        this.source = this.audioCtx.createBufferSource();
        this.source.buffer = this.audioBuffer;

        const audioDestination = this.audioCtx.createMediaStreamDestination();
        this.source.connect(audioDestination);
        this.source.start(0);

        return audioDestination;
    }
}