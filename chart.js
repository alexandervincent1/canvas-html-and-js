// const xValues = ["Italy", "France", "Spain", "USA", "Argentina"];
// const yValues = [55, 49, 44, 24, 15];
// const barColors = ["red", "green", "blue", "orange", "brown"];

// const xVärden = ["Jan", "Feb", "Mar"]
// const yVärden = [10, 20, 30]



// function MyCanvas() {
//     const myChart = new Chart("myCanvas", {
//         type: "bar",
//         data: {
//             labels: xValues,
//             datasets: [{
//                 backgroundColor: barColors,
//                 data: yValues
//             }]
//         },
//         options: {

//         }
//     });
// }





// function computeFFT(samples) {
//     const fft = new FFT(samples.length, 1024);
//     fft.forward(samples);
//     return Array.from(fft.spectrum);
// }


// function plotMagnitude (magnitudes){
//     new Chart(document.getElementById("magChart"), {
//         type:"line",
//         data:{
//             labels: magnitudes.map((_,i)=>i),
//             datasets:[{
//                 label: "|X(f)|",
//                 data: magnitudes
//             }]
//         }
//     })
// }


/**
 * Simple Recursive FFT (Cooley-Tukey)
 * For educational use. Assumes input length is a power of 2.
 * @param {Array} input - Array of complex numbers {re, im}
 * @returns {Array} - Array of transformed complex numbers
 */
let timeChart = null;
let magChart = null;
let fftChart = null;

function generateSine(frequency, sampleRate, sampleCount) {
    const samples = [];
    for (let n = 0; n < sampleCount; n++) {
        const t = n / sampleRate;
        samples.push(Math.sin(2 * Math.PI * frequency * t))
    }
    return samples;
}
function fft(input) {
    const n = input.length;
    if (n <= 1) return input; // Base case

    // 1. Split into even and odd indices (Divide)
    const even = fft(input.filter((_, i) => i % 2 === 0));
    const odd = fft(input.filter((_, i) => i % 2 !== 0));

    const combined = new Array(n);
    for (let k = 0; k < n / 2; k++) {
        // 2. Calculate the Twiddle Factor (The core rotation)
        const angle = -2 * Math.PI * k / n;
        const twiddle = {
            re: Math.cos(angle),
            im: Math.sin(angle)
        };

        // 3. Complex multiplication: twiddle * odd[k]
        const t = {
            re: twiddle.re * odd[k].re - twiddle.im * odd[k].im,
            im: twiddle.re * odd[k].im + twiddle.im * odd[k].re
        };

        // 4. Butterfly operation (Combine)
        combined[k] = { re: even[k].re + t.re, im: even[k].im + t.im };
        combined[k + n / 2] = { re: even[k].re - t.re, im: even[k].im - t.im };
    }
    return combined;
}



function plotFFT(result) {
    const magnitudes = result.map(c => Math.sqrt(c.re * c.re + c.im * c.im));

    fftChart = new Chart(document.getElementById("magChart"), {
        type: "line",
        data: {
            labels: magnitudes.map((_, i) => i),
            datasets: [{
                label: "|X(f)|",
                data: magnitudes,
                borderColor: "red",
                borderWidth: 1,
                pointRadius: 0
            }]
        }
    });
}

function updateFFT(result) {
    const magnitudes = result.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
    fftChart.data.datasets[0].data = magnitudes;
    fftChart.update("none");
}

function plotTimeDomain(samples) {
    if (timeChart) timeChart.destroy();

    timeChart = new Chart(document.getElementById("timeChart"), {
        type: "line",
        data: {
            labels: samples.map((_, i) => i),
            datasets: [{
                label: "x(t)",
                data: samples,
                borderColor: "blue",
                borderWidth: 1,
                pointRadius: 6,   // gör punkterna klickbara
                pointHoverRadius: 7
            }]
        },
        options: {
            animation: false
        }
    });

    makeTimeChartInteractive();
}




function makeTimeChartInteractive() {
    const canvas = document.getElementById("timeChart");
    let activePoint = null;
    let isUpdating = false;

    canvas.addEventListener("mousedown", (event) => {
        const points = timeChart.getElementsAtEventForMode(
            event,
            "nearest",
            { intersect: true },
            false
        );
        if (points.length) activePoint = points[0];
    });

    canvas.addEventListener("mousemove", (event) => {
        if (!activePoint) return;
        if (isUpdating) return;

        isUpdating = true;

        requestAnimationFrame(() => {
            if (!activePoint) {
                isUpdating = false;
                return;
            }

            const yScale = timeChart.scales.y;
            const rect = canvas.getBoundingClientRect();
            const yPixel = event.clientY - rect.top;
            const newValue = yScale.getValueForPixel(yPixel);

            timeChart.data.datasets[0].data[activePoint.index] = newValue;
            timeChart.update("none");

            // Uppdatera FFT
            const samples = timeChart.data.datasets[0].data;
            const signal = samples.map(v => ({ re: v, im: 0 }));
            const result = fft(signal);
            updateFFT(result);

            isUpdating = false;
        });
    });

    canvas.addEventListener("mouseup", () => {
        activePoint = null;
    });
}


function reset() {
    timeChart.destroy();
    fftChart.destroy();
    fftChart = null;
    timeChart = null;

}

function generateNewSine() {
    let samples = generateSine(5, 64, 64);
    let signal = samples.map(v => ({ re: v, im: 0 }));
    let result = fft(signal);
    plotTimeDomain(samples);
    plotFFT(result);
}

const scope = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    exp: Math.exp,
    sqrt: Math.sqrt,
    pi: Math.PI,
    e: Math.E
};


function generateFromFormula (){
    const formula = document.getElementById("formulaInput").value;
    const f = new Function ("x", ...Object.keys(scope), "return " + formula);
    const N = 64;
    const samples = [];
    //generea samples alltså dragbara punkter
    for (let i = 0; i < N; i++) {
        const x = i / N * 2 * Math.PI;
        samples.push(f(x, ...Object.values(scope)));
    }
    
    const signal = samples.map(v => ({ re: v, im: 0 }));

    // kör FFT
    const result = fft(signal);

    plotTimeDomain(samples);
    plotFFT(result);   // skapar grafen första gången
    

}