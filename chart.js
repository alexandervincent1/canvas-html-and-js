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
    fftChart = null;

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
    timeChart = null;

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
            animation: false,
            onHover: () => {}
        }
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

        // Rita om grafen
        timeChart.draw();

        // Rita rektangeln
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

        // Hitta mittpunkt för handtag
        let minX = Infinity, maxX = -Infinity, avgY = 0;
        selectedPoints.forEach(i => {
            const point = meta.data[i];
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            avgY += point.y;
        });
        avgY /= selectedPoints.length;

        // Spara handtagets position
        handleX = (minX + maxX) / 2;
        handleY = avgY;

        // Rita handtag (en ruta i mitten)
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(handleX - 10, handleY - 10, 20, 20);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 5;
        ctx.strokeRect(handleX - 10, handleY - 10, 20, 20);

        // Rita pilar upp/ner
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
            timeChart.draw();
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
            drawSelectionRectangle();
            return;
        }

        // 2. Multi-drag mode - behåll relativ position
        if (isDraggingSelected && selectedPoints.length > 0) {
            const yScale = timeChart.scales.y;
            const deltaValue = yScale.getValueForPixel(mouseY) - yScale.getValueForPixel(dragStartY);

            selectedPoints.forEach((idx, j) => {
                timeChart.data.datasets[0].data[idx] = originalValues[j] + deltaValue;
            });

            timeChart.update("none");
            drawSelectedHighlight();

            const samples = timeChart.data.datasets[0].data;
            const signal = samples.map(v => ({ re: v, im: 0 }));
            const result = fft(signal);
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

            timeChart.data.datasets[0].data[activePoint.index] = newValue;
            timeChart.update("none");
            const samples = timeChart.data.datasets[0].data;
            const signal = samples.map(v => ({ re: v, im: 0 }));
            const result = fft(signal);
            updateFFT(result);

            isUpdating = false;
        });
    });


    canvas.addEventListener("mouseup", () => {
        if (isSelecting && selectionEnd) {
            selectedPoints = getPointsInsideRectangle();
            console.log("Valda punkter:", selectedPoints.length);
            timeChart.draw();
            drawSelectedHighlight();
        }
        isSelecting = false;
        isDraggingSelected = false;
        activePoint = null;
        dragStartY = null;
    });
}


function reset() {
    timeChart.destroy();
    fftChart.destroy();
    fftChart = null;
    timeChart = null;

}

function generateNewSine() {
    let N = Number(document.getElementById("choosePoints").value);
    if (N == 0) {
        N = 64;
    }
    let samples = generateSine(5, N, N);
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


function generateFromFormula() {
    const formula = document.getElementById("formulaInput").value;
    const f = new Function("x", ...Object.keys(scope), "return " + formula);

    let N = Number(document.getElementById("choosePoints").value);
    if (N == 0) {
        N = 64;
    }
    const samples = [];

    for (let i = 0; i < N; i++) {
        const x = i / N * 2 * Math.PI;
        samples.push(f(x, ...Object.values(scope)));
    }

    const signal = samples.map(v => ({ re: v, im: 0 }));
    const result = fft(signal);

    plotTimeDomain(samples);
    plotFFT(result);
}