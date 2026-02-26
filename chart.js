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

// function Canvas() {

//     // 1. Hämta canvas-elementet
//     const canvasTvå = document.getElementById("Canvas");

//     // 2. Hämta rit-contexten
//     const ctx = canvasTvå.getContext("2d");

//     // 3. Skapa grafen
//     const chart = new Chart(ctx, {
//         type: "line",
//         data: {
//             labels: xVärden,
//             datasets: [{
//                 backgroundColor: 'blue',
//                 data: yVärden,
//                 borderWidth: 5,
//                 pointRadius: 10,
//                 pointHoverRadius: 15
                
//             }]
//         },
//         options: {
//             scales: {
//                 y:{
//                     min : 0,
//                     max:100
//                 }
//             }
//         }
//     });

//     // 4. Variabel för aktiv punkt
//     let activePoint = null;

//     // 5. Klicka på punkt
//     canvasTvå.addEventListener('mousedown', function(event) {
//         const points = chart.getElementsAtEventForMode(
//             event,
//             'nearest',
//             { intersect: true },
//             false
//         );
//         if (points.length) {
//             activePoint = points[0];
//         }
//     });

//     // 6. Dra punkt
//     let isUpdating = false;

//     canvasTvå.addEventListener('mousemove', function(event) {
//         if (!activePoint) return;

//         if (!isUpdating) {
//             isUpdating = true;

//             requestAnimationFrame(() => {
//                 // Kolla igen om activePoint fortfarande finns
//                 if (!activePoint) {
//                     isUpdating = false;
//                     return;
//                 }

//                 const yScale = chart.scales.y;

//                 const rect = canvasTvå.getBoundingClientRect();
//                 const yPixel = event.clientY - rect.top;

//                 const newValue = yScale.getValueForPixel(yPixel);

//                 chart.data.datasets[activePoint.datasetIndex].data[activePoint.index] = newValue;
//                 chart.update('none');

//                 isUpdating = false;
//             });
//         }
//     });

//     // 7. Släpp punkt
//     canvasTvå.addEventListener('mouseup', function() {
//         activePoint = null;
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

function generateSine(frequency, sampleRate, sampleCount) {
    const samples = [];
    for (let n = 0; n < sampleCount; n++){
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
    
    new Chart(document.getElementById("magChart"), {
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


function plotTimeDomain(samples) {
    const a = new Chart(document.getElementById("timeChart"), {
        type: "line",
        data: {
            labels: samples.map((_, i) => i),
            datasets: [{
                label: "x(t)",
                data: samples,
                borderColor: "blue",
                borderWidth: 1,
                pointRadius: 0
            }]
        },
        options: {
        }
    });
}