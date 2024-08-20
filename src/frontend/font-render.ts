export class FontRender {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;

    constructor () {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");

        if(!this.ctx){
            console.error('ctx 생성 실패');
        }
    }

    putText(str: string, fontSize = 18): void {
        if(!this.ctx){
            return;
        }

        this.ctx.font = `${fontSize}px sans-serif`;

        const textMetrices = this.ctx.measureText(str);

        const width = textMetrices.width;
        const height = fontSize;

        this.canvas.width = width;
        this.canvas.height = height;

        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.fillStyle = 'rgba(0,0,0,0)'
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.fillStyle = 'black';
        this.ctx.fillText(str, width/2,height/2);
    }
}