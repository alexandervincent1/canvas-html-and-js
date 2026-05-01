/**
 * Simple Recursive FFT (Cooley-Tukey)
 * For educational use. Assumes input length is a power of 2.
 * @param {Array} input - Array of complex numbers {re, im}
 * @returns {Array} - Array of transformed complex numbers
 */
let timeChart = null;
let magChart = null;
let fftChart = null;
var x = false;
var y = false;
var currentMode = 0;
let showPhase = false;
let currentResult = null;
let isShifted = false;
let useDWT = false;

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
    if (fftChart) fftChart.destroy();

    currentResult = result;

    let data;
    let label;
    let color;

    if (showPhase) {
        data = result.map(c =>
            (Math.hypot(c.re, c.im) > 1e-9)
                ? Math.atan2(c.im, c.re)
                : 0.0
        );
        label = "Phase (rad)";
        color = "green";
    } else {
        data = result.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
        label = "|X(f)|";
        color = "green";
    }

    const N = data.length;
    // Beräknas helt dynamiskt utifrån storleken (t.ex. 64, 128, 256)
    const boundaries = useDWT ? getLevelBoundaries(N) : [];

    // Skapa pluginen lokalt för just denna graf-instans istället för Chart.register()
    const verticalGridlinesPlugin = {
        id: 'verticalGridlines',
        afterDatasetsDraw(chart) {
            if (useDWT) {
                drawLevelLines(chart, boundaries);
            }
        }
    };

    fftChart = new Chart(document.getElementById("magChart"), {
        type: "line",
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            animation: false
        },
        plugins: [verticalGridlinesPlugin] // Använder de uppdaterade gränserna varje gång
    });
}

function updateFFT(result) {
    currentResult = result;

    const n = result.length;
    const half = Math.floor(n / 2);

    let data;
    if (showPhase) {
        // Gauthier: START
        data = result.map(c => (Math.hypot(c.re, c.im) > 1e-9) ? Math.atan2(c.im, c.re) : 0.0);
        // Gauthier: END
        // data = result.map(c => Math.atan2(c.im, c.re));
    } else {
        data = result.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
    }

    if (isShifted) {
        const shifted = [...data.slice(half), ...data.slice(0, half)];
        fftChart.data.datasets[0].data = shifted;
    } else {
        fftChart.data.datasets[0].data = data;
    }

    fftChart.update("none");
}

function plotTimeDomain(samples) {
    if (timeChart) timeChart.destroy();
    timeChart = null;

    // Skapa en plugin som garanterar att våra rektanglar och handtag ritas SIST
    const customDrawPlugin = {
        id: 'customDraw',
        afterDraw(chart) {
            if (chart.customDrawFunction) {
                chart.customDrawFunction();
            }
        }
    };

    timeChart = new Chart(document.getElementById("timeChart"), {
        type: "line",
        data: {
            labels: samples.map((_, i) => i),
            datasets: [{
                label: "x(t)",
                data: samples,
                borderColor: "blue",
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            animation: false,
            onHover: () => { }
        },
        plugins: [customDrawPlugin] // Laddar pluginen lokalt
    });

    makeTimeChartInteractive();
}

function makeTimeChartInteractive() {
    const canvas = document.getElementById("timeChart");

    let activePoint = null;
    let isUpdating = false;
    let selectionStart = null;
    let selectionEnd = null;
    let selectedPoints = [];
    let isSelecting = false;
    let isDraggingSelected = false;
    let dragStartY = null;
    let originalValues = [];

    let handleX = null;
    let handleY = null;

    function drawSelectionRectangle() {
        const ctx = canvas.getContext("2d");
        // Obs: Inget timeChart.draw() här inne längre för att undvika infinite loops!

        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        const w = Math.abs(selectionEnd.x - selectionStart.x);
        const h = Math.abs(selectionEnd.y - selectionStart.y);

        ctx.strokeStyle = "rgba(0, 150, 255, 0.8)";
        ctx.fillStyle = "rgba(0, 150, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);
    }

    function drawSelectedHighlight() {
        if (selectedPoints.length === 0) return;

        const ctx = canvas.getContext("2d");
        const meta = timeChart.getDatasetMeta(0);

        let minX = Infinity, maxX = -Infinity, avgY = 0;
        selectedPoints.forEach(i => {
            const point = meta.data[i];
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            avgY += point.y;
        });
        avgY /= selectedPoints.length;

        handleX = (minX + maxX) / 2;
        handleY = avgY;

        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(handleX - 10, handleY - 10, 20, 20);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 5;
        ctx.strokeRect(handleX - 10, handleY - 10, 20, 20);

        ctx.beginPath();
        ctx.moveTo(handleX, handleY - 6);
        ctx.lineTo(handleX - 4, handleY - 2);
        ctx.lineTo(handleX + 4, handleY - 2);
        ctx.closePath();
        ctx.fillStyle = "white";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(handleX, handleY + 6);
        ctx.lineTo(handleX - 4, handleY + 2);
        ctx.lineTo(handleX + 4, handleY + 2);
        ctx.closePath();
        ctx.fill();
    }

    // Koppla våra rit-funktioner till timeChart så pluginen kan utlösa dem automatiskt
    timeChart.customDrawFunction = () => {
        if (isSelecting && selectionStart && selectionEnd) drawSelectionRectangle();
        if (selectedPoints.length > 0) drawSelectedHighlight();
    };

    function getPointsInsideRectangle() {
        const points = [];

        const x1 = Math.min(selectionStart.x, selectionEnd.x);
        const x2 = Math.max(selectionStart.x, selectionEnd.x);
        const y1 = Math.min(selectionStart.y, selectionEnd.y);
        const y2 = Math.max(selectionStart.y, selectionEnd.y);

        const meta = timeChart.getDatasetMeta(0);

        meta.data.forEach((point, index) => {
            if (point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2) {
                points.push(index);
            }
        });

        return points;
    }

    canvas.addEventListener("mousedown", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Shift + klick = rektangel-select
        if (event.shiftKey) {
            selectionStart = { x: mouseX, y: mouseY };
            selectionEnd = null;
            isSelecting = true;
            selectedPoints = [];
            return;
        }

        // Kolla om vi klickar på handtaget
        if (selectedPoints.length > 0 && handleX !== null) {
            const dist = Math.sqrt((handleX - mouseX) ** 2 + (handleY - mouseY) ** 2);
            if (dist < 15) {
                isDraggingSelected = true;
                dragStartY = mouseY;
                originalValues = selectedPoints.map(idx => timeChart.data.datasets[0].data[idx]);
                return;
            }
            // Klickade utanför handtaget - avmarkera
            selectedPoints = [];
            handleX = null;
            handleY = null;
            timeChart.update("none"); // Ändrad till .update()
        }

        // Single-point drag    
        const points = timeChart.getElementsAtEventForMode(
            event,
            "nearest",
            { intersect: true },
            false
        );
        if (points.length) activePoint = points[0];
    });

    // --- Mouse Move ---
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseY = event.clientY - rect.top;

        // 1. Rectangle-select mode
        if (isSelecting) {
            selectionEnd = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
            timeChart.update("none"); // Utlöser redraw -> plugin ritar ut formen
            return;
        }

        // 2. Multi-drag mode - behåll relativ position
        if (isDraggingSelected && selectedPoints.length > 0) {
            const yScale = timeChart.scales.y;
            const deltaValue = yScale.getValueForPixel(mouseY) - yScale.getValueForPixel(dragStartY);

            selectedPoints.forEach((idx, j) => {
                timeChart.data.datasets[0].data[idx] = originalValues[j] + deltaValue;
            });

            timeChart.update("none"); // Utlöser redraw -> plugin ritar handtaget
            
            const samples = timeChart.data.datasets[0].data.slice(0, -1);
            const signal = samples.map(v => ({ re: v, im: 0 }));
            
            const result = useDWT 
                ? discreteHaarWaveletTransform(signal.map(c => c.re)).map(v => ({ re: v, im: 0 }))
                : fft(signal);
                
            updateFFT(result);

            return;
        }

        // 3. Single-point drag
        if (!activePoint) return;
        if (isUpdating) return;

        isUpdating = true;

        requestAnimationFrame(() => {
            if (!activePoint) {
                isUpdating = false;
                return;
            }

            const yScale = timeChart.scales.y;
            const newValue = yScale.getValueForPixel(mouseY);
            const data = timeChart.data.datasets[0].data;

            data[activePoint.index] = newValue;

            // Synka loop-punkterna
            if (activePoint.index === 0) data[data.length - 1] = newValue;
            if (activePoint.index === data.length - 1) data[0] = newValue;

            timeChart.update("none");
            const samples = data.slice(0, -1);
            const signal = samples.map(v => ({ re: v, im: 0 }));
            
            const result = useDWT 
                ? discreteHaarWaveletTransform(signal.map(c => c.re)).map(v => ({ re: v, im: 0 }))
                : fft(signal);
                
            updateFFT(result);

            isUpdating = false;
        });
    });


    canvas.addEventListener("mouseup", () => {
        if (isSelecting && selectionEnd) {
            selectedPoints = getPointsInsideRectangle();
            console.log("Valda punkter:", selectedPoints.length);
            timeChart.update("none"); // Ändrad till .update()
        }
        isSelecting = false;
        isDraggingSelected = false;
        activePoint = null;
        dragStartY = null;
    });
}

function reset() {
    if (timeChart) {
        timeChart.destroy();
        timeChart = null;
    }
    if (fftChart) {
        fftChart.destroy();
        fftChart = null;
    }
    currentResult = null;
    showPhase = false;
    isShifted = false;
    selectedPoints = [];
    document.getElementById("waveCount").textContent = "Waves: 0";
}

function generateNewSine() {
    let N = Number(document.getElementById("choosePoints").value);
    if (N == 0) N = 64;
    N = Math.pow(2, Math.round(Math.log2(N)));

    let samples = generateSine(5, N, N + 1);
    let signal = samples.slice(0, -1);
    
    let result = useDWT 
        ? discreteHaarWaveletTransform(signal).map(v => ({ re: v, im: 0 }))
        : fft(signal.map(v => ({ re: v, im: 0 })));
    
    plotTimeDomain(samples);
    plotFFT(result);
    countWaves(result);
}


const scope = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    exp: Math.exp,
    sqrt: Math.sqrt,
    pi: Math.PI,
    e: Math.E,
    sawtooth: (x) => 2 * (x / (2 * Math.PI) - Math.floor(0.5 + x / (2 * Math.PI))),
    square: (x) => Math.sin(x) >= 0 ? 1 : -1
};


function generateFromFormula() {
    const formula = document.getElementById("formulaInput").value;
    const f = new Function("x", ...Object.keys(scope), "return " + formula);

    let N = Number(document.getElementById("choosePoints").value);
    if (N == 0) {
        N = 64;
    }
    N = Math.pow(2, Math.round(Math.log2(N)));

    const samples = [];

    for (let i = 0; i <= N; i++) {
        const x = i / N * 2 * Math.PI;
        samples.push(f(x, ...Object.values(scope)));
    }

    const signal = samples.slice(0, -1).map(v => ({ re: v, im: 0 }));
       const result = useDWT 
        ? discreteHaarWaveletTransform(signal.map(c => c.re)).map(v => ({ re: v, im: 0 }))
        : fft(signal);

    plotTimeDomain(samples);
    plotFFT(result);
    countWaves(result);
}

function flipHalf() {
    const data = fftChart.data.datasets[0].data;
    const n = data.length;
    const half = Math.floor(n / 2);

    if (!isShifted) {
        // Shift: flytta högra halvan till vänster (negativa frekvenser)
        const shifted = [...data.slice(half), ...data.slice(0, half)];
        const labels = [];
        for (let i = -half; i < half; i++) labels.push(i);

        fftChart.data.datasets[0].data = shifted;
        fftChart.data.labels = labels;
    } else {
        // Unshift: flytta tillbaka
        const unshifted = [...data.slice(half), ...data.slice(0, half)];
        const labels = [];
        for (let i = 0; i < n; i++) labels.push(i);

        fftChart.data.datasets[0].data = unshifted;
        fftChart.data.labels = labels;
    }

    isShifted = !isShifted;
    fftChart.update("none");
}

async function loadWavFile() {
    const fileInput = document.getElementById("wavFile");
    const file = fileInput.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const rawSamples = audioBuffer.getChannelData(0);

    let N = Number(document.getElementById("choosePoints").value);
    if (N == 0) {
        N = 64;
    }
    N = Math.pow(2, Math.round(Math.log2(N)));
    N = Math.min(N, rawSamples.length);

    const samples = [];
    for (let i = 0; i <= N; i++) {
        samples.push(rawSamples[i % N]);
    }

    const signal = samples.slice(0, -1).map(v => ({ re: v, im: 0 }));
        const result = useDWT 
        ? discreteHaarWaveletTransform(signal.map(c => c.re)).map(v => ({ re: v, im: 0 }))
        : fft(signal);

    plotTimeDomain(samples);
    plotFFT(result);
    countWaves(result);
}
function togglePhase() {
    if (!currentResult) return;

    showPhase = !showPhase;

    const n = currentResult.length;
    const half = Math.floor(n / 2);

    let data;
    if (showPhase) {
        // Gauthier: START
        data = currentResult.map(c => (Math.hypot(c.re, c.im) > 1e-9) ? Math.atan2(c.im, c.re) : 0.0);
        // Gauthier: END
        fftChart.data.datasets[0].label = "Phase (rad)";
        fftChart.data.datasets[0].borderColor = "green";
    } else {
        data = currentResult.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
        fftChart.data.datasets[0].label = "|X(f)|";
        fftChart.data.datasets[0].borderColor = "green";
    }

    if (isShifted) {
        data = [...data.slice(half), ...data.slice(0, half)];
    }

    fftChart.data.datasets[0].data = data;
    fftChart.update("none");
}

function countWaves(result) {
    const magnitudes = result.map(c => Math.sqrt(c.re * c.re + c.im * c.im));

    // Hitta index med högsta magnitud (skippa index 0 som är DC)
    let maxIndex = 1;
    for (let i = 2; i < magnitudes.length / 2; i++) {
        if (magnitudes[i] > magnitudes[maxIndex]) {
            maxIndex = i;
        }
    }

    document.getElementById("waveCount").textContent = "Waves: " + maxIndex;
}


function discreteHaarWaveletTransform(input) {
    // This function assumes that input.length=2^n, n>1
    const output = new Array(input.length);

    for (let length = input.length / 2; ; length = length / 2) {
        // length is the current length of the working area of the output array.
        // length starts at half of the array size and every iteration is halved until it is 1.
        for (let i = 0; i < length; ++i) {
            const sum = input[i * 2] + input[i * 2 + 1];
            const difference = input[i * 2] - input[i * 2 + 1];
            output[i] = sum;
            output[length + i] = difference;
        }
        if (length == 1) {
            return output;
        }

        // Swap arrays to do next iteration
        for (let i = 0; i < length; i++) {
            input[i] = output[i];
        }
    }
}


function toggleTransform() {
    useDWT = !useDWT;
    
    // Göm/visa Flip Half och Toggle Phase
    document.getElementById("flipHalfBtn").style.display = useDWT ? "none" : "block";
    document.getElementById("togglePhaseBtn").style.display = useDWT ? "none" : "block";
    
    // Göm/visa Level Slider (bars för DWT)
    const levelControl = document.getElementById("levelControlContainer");
    if (levelControl) {
        levelControl.style.display = useDWT ? "block" : "none";
    }
    
    // Byt knapptext
    const btn = document.getElementById("switchDWT");
    btn.textContent = useDWT ? "Switch to FFT" : " Switch to DWT";
    
    if (currentMode === 1) generateNewSine();
    if (currentMode === 2) generateFromFormula();
    if (currentMode === 3) loadWavFile();
}


function getLevelBoundaries(N) {
    const boundaries = [];
    
    let pos = N / 2;
    boundaries.push(pos);
    
    let remaining = N / 4;
    while (remaining >= 1) {
        pos += remaining;
        boundaries.push(pos);
        remaining = remaining / 2;
    }
    
    return boundaries;
}
function drawLevelLines(chart, boundaries) {
    const ctx = chart.ctx;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    ctx.save();
    ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    
    boundaries.forEach(dataIndex => {
        const x = xScale.getPixelForValue(dataIndex);

        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
    });

    ctx.setLineDash([]);
    ctx.restore();
}

// slider

const levelInput = document.getElementById("levelInput");
const levelSlider = document.getElementById("levelSlider");

// När man skriver i input-fältet
levelInput.addEventListener("input", () => {
    // Tillåt att fältet tillfälligt raderas (så man hinner skriva en ny siffra)
    if (levelInput.value === "") return;

    let L = Math.round(Number(levelInput.value));

    // Begränsa till 1–20
    if (L < 1) L = 1;
    if (L > 20) L = 20;

    levelInput.value = L;
    levelSlider.value = L;

    updateResolution(L);
});

// Om användaren klickar bort från fältet och det är tomt, återställ till 1
levelInput.addEventListener("blur", () => {
    if (levelInput.value === "") {
        levelInput.value = 1;
        levelSlider.value = 1;
        updateResolution(1);
    }
});

// När man drar i slidern
levelSlider.addEventListener("input", () => {
    const L = Number(levelSlider.value);
    levelInput.value = L;

    updateResolution(L);
});

function updateResolution(L) {
    const N = 2 ** L;   // <-- ANTAL PIXLAR

    // Generera ny signal
    const samples = generateSine(5, N, N + 1);
    const signal = samples.slice(0, -1).map(v => ({ re: v, im: 0 }));

    const result = useDWT
        ? discreteHaarWaveletTransform(signal.map(c => c.re)).map(v => ({ re: v, im: 0 }))
        : fft(signal);

    plotTimeDomain(samples);
    plotFFT(result);
}
