import {vec2} from 'gl-matrix';

export function cubicBezier(x1:number,y1:number,x2:number,y2:number,t:number) {
    const result = vec2.create();
    t = clamp(t,0,1);

    const p0 = vec2.fromValues(0,0);
    const p1 = vec2.fromValues(x1,y1);
    const p2 = vec2.fromValues(x2,y2);
    const p3 = vec2.fromValues(1,1);

    vec2.scale(result, p0, Math.pow(1 - t, 3));
    vec2.scaleAndAdd(result, result, p1, 3 * Math.pow(1 - t, 2) * t);
    vec2.scaleAndAdd(result, result, p2, 3 * (1 - t) * Math.pow(t, 2));
    vec2.scaleAndAdd(result, result, p3, Math.pow(t, 3));

    return result;
}

export function clamp(value:number,min:number,max:number){
    if(value < min){
        return min;
    } else if(value > max){
        return max;
    } else {
        return value;
    }
}
