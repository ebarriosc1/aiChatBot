const apiKey = process.env.GEMINI_APP_API_KEY;
const GEMINI_GENERATE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

// const DEFAULT_MODEL = 'deepseek-r1:1.5b'; 
// const DEFAULT_MODEL = 'llama3.2:1b'
// const DEFAULT_MODEL = 'deepseek-r1:7b'
// const DEFAULT_MODEL = 'phi4' //Model is performing really well answering question from context
const DEFAULT_MODEL = 'llama3.1:8b' //This model is also performing really well to answer questionms from context. Is also faster


// const { ChromaClient } = require('chromadb');
// const chromaClient = new ChromaClient({ path: '/assets/chroma_db/' }); // Replace with the path
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 5;
let buffer = '';
let inThinkingBlock = false;

let boostedSpeed = 1.0; 
let update;
let animationFrameCount = 0; // Frame-based animation counter
const BASE_FRAME_TIME = 16; // Base frame time for 60fps

$(document).ready(function() {
    let $canvas = $('#blob canvas'),
        canvas = $canvas[0],
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            context: canvas.getContext('webgl2'),
            antialias: true,
            alpha: true
        }),
        simplex = new SimplexNoise();

    renderer.setSize($canvas.width(), $canvas.height());
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    let scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, $canvas.width() / $canvas.height(), 0.1, 1000);

    camera.position.z = 5;

    let geometry = new THREE.SphereGeometry(.8, 128, 128);

    let material = new THREE.MeshPhongMaterial({
        color: 0xE4ECFA,
        shininess: 100
    });

    let lightTop = new THREE.DirectionalLight(0xFFFFFF, .7);
    lightTop.position.set(0, 500, 200);
    lightTop.castShadow = true;
    scene.add(lightTop);

    let lightBottom = new THREE.DirectionalLight(0xFFFFFF, .25);
    lightBottom.position.set(0, -500, 400);
    lightBottom.castShadow = true;
    scene.add(lightBottom);

    let ambientLight = new THREE.AmbientLight(0x798296);
    scene.add(ambientLight);

    let sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    update = () => {
        let currentSpeed = 12; // Increased from 13 to 20 for faster animation
        let currentSpikes = 0.7; // Increased from 0.6 to 0.8 for more pronounced noise
    
        // Frame-based animation timing
        const scaledFrames = animationFrameCount * currentProcessing;
        const time = scaledFrames * BASE_FRAME_TIME * 0.00001 * currentSpeed;
        const spikes = currentSpikes * currentProcessing;
    
        for (let i = 0; i < sphere.geometry.vertices.length; i++) {
            let p = sphere.geometry.vertices[i];
            p.normalize().multiplyScalar(1 + 0.3 * simplex.noise3D(
                p.x * spikes, 
                p.y * spikes, 
                p.z * spikes + time
            ));
        }
    
        sphere.geometry.verticesNeedUpdate = true;
        sphere.geometry.computeVertexNormals();
        sphere.geometry.normalsNeedUpdate = true;
        animationFrameCount++; // Increment frame counter
    };

    function animate() {
        update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});

document.addEventListener('DOMContentLoaded', function () {
    const inputField = document.getElementById("user-input");

    inputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {  
            sendMessage();          
        }
    });
});

function sendMessage() {
    const userInput = document.getElementById("user-input").value;
    if (!userInput.trim()) return;

    // Display user message
    const userMessage = document.createElement("div");
    userMessage.classList.add("message", "user");
    userMessage.textContent = userInput;
    document.getElementById("chat-box").appendChild(userMessage);
    document.getElementById("user-input").value = "";

    // Increase targetProcessing for faster animation during message processing
    animateProcessingEffect(2.5); // Increased from 1.8 to 2.5 for faster animation
    fetchGeminiResponse(userInput);
}

let animationFrameId = null;
let timeoutId = null;
let currentProcessing = 1;
const speed = 0.5; // Adjust speed (1 unit per second)
const revertSpeed = 0.2; // Adjust revert speed
const revertDelay = 150; // Delay before reverting (increased for smoother transition)
let isAnimating = false;
let isReverting = false;
let lastTimestamp = 0;

// FPS monitoring variables
let fpsInterval, lastDrawTime, frameCount, lastSampleTime;
let intervalID;
const maxSamples = 60; // Number of FPS samples to keep
const samples = ['fps']; // Array to store FPS samples


// Start FPS monitoring
function startFpsMonitoring(fps, sampleFreq) {
    fpsInterval = 1000 / fps;
    lastDrawTime = performance.now();
    lastSampleTime = lastDrawTime;
    frameCount = 0;

    intervalID = setInterval(sampleFps, sampleFreq);
}

// Sample FPS and update graph
function sampleFps() {
    const now = performance.now();
    if (frameCount > 0) {
        const currentFps = (frameCount / (now - lastSampleTime) * 1000).toFixed(2);
        $("#results").text(currentFps + " fps");

        frameCount = 0;

        // Save the FPS sample for graphing
        samples.push(currentFps);
        if (samples.length > maxSamples + 1) {
            samples.splice(1, samples.length - (maxSamples + 1));
        }
        graph.load({ columns: [samples] });
    }
    lastSampleTime = now;
}

// Updated animateProcessingEffect function with smooth transitions
function animateProcessingEffect(targetProcessing = 2.5, duration = 1.5) {
    if (isAnimating) return;
    isAnimating = true;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (timeoutId) clearTimeout(timeoutId);

    let startTime = performance.now();
    let initialProcessing = currentProcessing;

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateStep(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        let deltaTime = timestamp - lastTimestamp;
        deltaTime = Math.min(deltaTime, 100); // Cap deltaTime
        lastTimestamp = timestamp;

        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / (duration * 1000), 1);

        // Apply easing function to progress
        const easedProgress = easeInOutCubic(progress);

        if (!isReverting) {
            currentProcessing = initialProcessing + 
                (targetProcessing - initialProcessing) * easedProgress;
        } else {
            currentProcessing = targetProcessing - 
                (targetProcessing - 1) * easedProgress;
        }

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animateStep);
        } else {
            if (!isReverting) {
                isReverting = true;
                startTime = performance.now();
                timeoutId = setTimeout(() => {
                    animationFrameId = requestAnimationFrame(animateStep);
                }, revertDelay);
            } else {
                isAnimating = false;
                isReverting = false;
                currentProcessing = 1; // Ensure final reset
            }
        }
    }

    animationFrameId = requestAnimationFrame(animateStep);
}

// Start FPS monitoring (e.g., 60 FPS target, sample every 1 second)
startFpsMonitoring(60, 1000);

// Example usage
animateProcessingEffect();

// Embedding and context handling
async function loadEmbeddings() {
    const response = await fetch('/assets/embeddings_nomic.json');
    return await response.json();
}

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

async function generateEmbedding(text) {
    const response = await fetch(OLLAMA_EMBED_API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: 'all-minilm',
            input: text,
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data)

    // Validate the response structure
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('Invalid response structure from embedding API');
    }

    return data.data[0].embedding;
}
async function findRelevantChunks(input, topK = 3) {
    const embeddings = await loadEmbeddings();
    const inputLower = input.toLowerCase();

    // Keyword matching
    const keywordMatches = embeddings.documents
        .map((doc, index) => ({
            id: embeddings.ids[index],
            document: doc,
            score: doc.toLowerCase().includes(inputLower) ? 1 : 0
        }))
        .filter(match => match.score > 0);

    if (keywordMatches.length === 0) {
        try {
            // Fallback to embedding similarity
            const inputEmbedding = await generateEmbedding(input);
            return embeddings.ids
                .map((id, index) => ({
                    id,
                    document: embeddings.documents[index],
                    score: cosineSimilarity(inputEmbedding, embeddings.embeddings[index])
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
        } catch (error) {
            console.error('Error generating embedding:', error);
            return []; // Return an empty array if embedding generation fails
        }
    }

    return keywordMatches.slice(0, topK);
}

// Main response functionz
// Main response function
async function fetchGeminiResponse(input) {
    const botMessage = document.createElement("div");
    botMessage.classList.add("message", "bot");
    document.getElementById("chat-box").appendChild(botMessage);

    try {
        // Update conversation history
        conversationHistory.push({ role: "user", content: input });
        if (conversationHistory.length > MAX_HISTORY_LENGTH) {
            conversationHistory.shift();
        }  

        //Load resume context
        const resumeContext = await loadEmbeddings()

        // Build conversation history context
        const historyContext = conversationHistory
            .map(entry => `${entry.role}: ${entry.content}`)
            .join('\n');

        // Build prompt
        const prompt = `You are Esteban Barrios' career assistant. Follow these rules:
            1. For resume-specific questions (skills, experience, education), use ONLY this context:
            ${resumeContext.documents}
            
            2. For general career questions (projects, philosophy, aspirations), answer naturally
            
            3. Keep answers concise (1-3 sentences)
            
            4. If unsure, ask for clarification
            
            CONVERSATION HISTORY:
            ${historyContext}
            
            CURRENT QUESTION: ${input}
            
            ANSWER:`
        ;
        console.log("Prompt sent to Gemini:", prompt);

        // Send request to Gemini API
        const response = await fetch(GEMINI_GENERATE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ text: prompt.trim() }] 
                }]
            }),
        });

        // Handle non-OK response (e.g., invalid API key, quota exceeded)
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        // Parse JSON response
        const data = await response.json();
        console.log("Gemini API Response:", data);

        // Extract response text safely
        let fullResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

        // Display response
        botMessage.textContent = fullResponse.trim();
        document.getElementById("chat-box").scrollTop = document.getElementById("chat-box").scrollHeight;

        // Add bot response to history
        conversationHistory.push({ role: "assistant", content: fullResponse });

    } catch (error) {
        console.error("Error fetching response from Gemini API:", error);
        botMessage.textContent = "Error: " + error.message;
    }
}


// Validation function
function validateResponse(response) {
    const requiredKeywords = ["python", "sql", "bigquery", "physics", "analyst"];
    const hasResumeContent = requiredKeywords.some(kw => response.toLowerCase().includes(kw));
    
    return {
        isValid: hasResumeContent || response.includes("I don't know") || response.includes("clarify"),
        message: hasResumeContent ? response : "I can only answer based on my resume. Ask about my skills or experience!"
    };
}


document.addEventListener("DOMContentLoaded", function () {
    var width, height, largeHeader, canvas, ctx, points, target, animateHeader = true;

    initHeader();
    initAnimation();
    addListeners();

    function initHeader() {
        width = window.innerWidth;
        height = window.innerHeight;
        target = {x: width / 2, y: height / 2};

        largeHeader = document.getElementById('large-header');
        if (!largeHeader) {
            console.error('large-header element not found');
            return;
        }
        largeHeader.style.height = height + 'px';

        canvas = document.getElementById('demo-canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');

        points = [];
        for (var x = 0; x < width; x = x + width / 20) {
            for (var y = 0; y < height; y = y + height / 20) {
                var px = x + Math.random() * width / 20;
                var py = y + Math.random() * height / 20;
                var p = {x: px, originX: px, y: py, originY: py};
                points.push(p);
            }
        }

        for (var i = 0; i < points.length; i++) {
            var closest = [];
            var p1 = points[i];
            for (var j = 0; j < points.length; j++) {
                var p2 = points[j];
                if (!(p1 == p2)) {
                    var placed = false;
                    for (var k = 0; k < 5; k++) {
                        if (!placed) {
                            if (closest[k] == undefined) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }
                    for (var k = 0; k < 5; k++) {
                        if (!placed) {
                            if (getDistance(p1, p2) < getDistance(p1, closest[k])) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }
                }
            }
            p1.closest = closest;
        }

        for (var i in points) {
            var c = new Circle(points[i], 2 + Math.random() * 2, 'rgba(255,255,255,1)');
            points[i].circle = c;
        }
    }

    function addListeners() {
        if (!('ontouchstart' in window)) {
            window.addEventListener('mousemove', mouseMove);
        }
        window.addEventListener('scroll', scrollCheck);
        window.addEventListener('resize', resize);
    }

    function mouseMove(e) {
        var posx = posy = 0;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        } else if (e.clientX || e.clientY) {
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        target.x = posx;
        target.y = posy;
    }

    function scrollCheck() {
        if (document.body.scrollTop > height) animateHeader = false;
        else animateHeader = true;
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        largeHeader.style.height = height + 'px';
        canvas.width = width;
        canvas.height = height;
    }

    function initAnimation() {
        animate();
        for (var i in points) {
            shiftPoint(points[i]);
        }
    }

    function animate() {
        if (animateHeader) {
            ctx.clearRect(0, 0, width, height);
            for (var i in points) {
                if (Math.abs(getDistance(target, points[i])) < 4000) {
                    points[i].active = 0.3;
                    points[i].circle.active = 0.6;
                } else if (Math.abs(getDistance(target, points[i])) < 20000) {
                    points[i].active = 0.1;
                    points[i].circle.active = 0.3;
                } else if (Math.abs(getDistance(target, points[i])) < 40000) {
                    points[i].active = 0.02;
                    points[i].circle.active = 0.1;
                } else {
                    points[i].active = 0;
                    points[i].circle.active = 0;
                }
                drawLines(points[i]);
                points[i].circle.draw();
            }
        }
        requestAnimationFrame(animate);
    }

    function shiftPoint(p) {
        gsap.to(p, {
            duration: 1 + 1 * Math.random(),
            x: p.originX - 50 + Math.random() * 100,
            y: p.originY - 50 + Math.random() * 100,
            ease: "circ.inOut",
            onComplete: function () {
                shiftPoint(p);
            }
        });
    }

    function drawLines(p) {
        if (!p.active) return;
        for (var i in p.closest) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.closest[i].x, p.closest[i].y);
            ctx.strokeStyle = 'rgba(156,217,249,' + p.active + ')';
            ctx.stroke();
        }
    }

    function Circle(pos, rad, color) {
        var _this = this;

        (function () {
            _this.pos = pos || null;
            _this.radius = rad || null;
            _this.color = color || null;
        })();

        this.draw = function () {
            if (!_this.active) return;
            ctx.beginPath();
            ctx.arc(_this.pos.x, _this.pos.y, _this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(156,217,249,' + _this.active + ')';
            ctx.fill();
        };
    }

    function getDistance(p1, p2) {
        return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    }
});
