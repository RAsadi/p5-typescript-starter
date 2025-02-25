var sunImage;
var moonImage;
var earthImage;
var sunTrailColor;
var earthTrailColor;
var moonTrailColor;
var bodies;
var savedPrevPos = [];
var selectedBody;
var newVelocity;
var shouldRun = true;
var showVel = false;
var showAccel = false;
var showForces = false;
var shiftHeld = false;
var savePrevious = false;
var showText = true;
var selectedInitialState = 0;
var backgroundColorDark;
var backgroundColorLight;
var stars = [];
var starRadii = [];
var starAlpha = [];
var sceneNames = {
    0: "Earth + moon system",
    1: "Two body #1",
    2: "Two body #2",
    3: "Two body at lower right",
    4: "Three body #1",
    5: "Three body #2",
    6: "Three body Figure 8",
};
var numInitialStates = 7;
var numSkips = 1000;
var instructionText = "Instructions:\n" +
    "P to pause/unpause\n" +
    "Right arrow to run a single step of the sim\n" +
    "R to reset sim to original state\n" +
    "A to show acceleration vectors\n" +
    "V to show velocity vectors\n" +
    "F to show force vectors\n" +
    "S to save trails from previous run\n" +
    "C to clear trails (Improves performance if lagging)\n" +
    "+ to move forward through predefined states\n" +
    "- to move backward through predefined states\n" +
    "Shift + click to create new planet\n" +
    "Click + drag on planet to adjust velocity vector\n" +
    "H to hide this text";
var G = 10;
var fudge = 0.01;
var timeSlider;
var timeSliderMax = 400;
var initialTimeSlider = 100;
var accuracySlider;
var accuracySliderMin = 500;
var accuracySliderMax = 5000;
var initialAccuracySlider = 1000;
var massSliders;
var PointMass = (function () {
    function PointMass(c, image, mass, position, velocity, accel, tint, radiusScaling) {
        if (velocity === void 0) { velocity = createVector(0, 0); }
        if (accel === void 0) { accel = createVector(0, 0); }
        if (tint === void 0) { tint = null; }
        if (radiusScaling === void 0) { radiusScaling = 1.0; }
        this.image = image;
        this.mass = mass;
        this.position = position;
        this.velocity = velocity;
        this.accel = accel;
        this.prev_positions = [];
        this.rotation = 0;
        this.skips = 0;
        this.color = color(c.levels);
        this.alphaColor = color(c.levels);
        this.alphaColor.setAlpha(10);
        this.tint = tint;
        this.radiusScaling = radiusScaling;
    }
    PointMass.prototype.accelFrom = function (other) {
        var scaling = 1 / 10;
        var dist = p5.Vector.mult(p5.Vector.sub(other.position, this.position), scaling);
        var invDist = Math.pow((Math.pow(dist.x, 2) + Math.pow(dist.y, 2) + Math.pow(fudge, 2)), -1);
        var mag = G * other.mass * invDist;
        var normalizedDist = dist.copy().normalize();
        return normalizedDist.mult(mag);
    };
    PointMass.prototype.applyPhysics = function (bodies, deltaTime) {
        var _this = this;
        this.velocity.add(p5.Vector.mult(this.accel, deltaTime / 2));
        var practicalSkips = Math.round((numSkips * accuracySlider.value()) / initialAccuracySlider);
        if (this.skips % practicalSkips == 0) {
            this.rotation += 0.1;
            this.prev_positions.push(this.position.copy());
        }
        this.skips = (this.skips + 1) % practicalSkips;
        this.position.add(p5.Vector.mult(this.velocity, deltaTime));
        this.accel = createVector(0, 0);
        bodies.forEach(function (body) {
            if (body != _this) {
                var new_accel = _this.accelFrom(body);
                _this.accel.add(new_accel);
            }
        });
        this.velocity.add(p5.Vector.mult(this.accel, deltaTime / 2));
    };
    PointMass.prototype.radius = function () {
        return this.mass * 50 * this.radiusScaling;
    };
    PointMass.prototype.overlaps = function (x, y) {
        var mouseVec = createVector(x, y);
        var deltaPos = this.position.dist(mouseVec);
        return deltaPos < this.radius();
    };
    PointMass.prototype.renderTrails = function () {
        var _this = this;
        push();
        noFill();
        stroke(this.color);
        beginShape();
        this.prev_positions.forEach(function (pos) { return vertex(pos.x, pos.y); });
        endShape();
        if (showVel) {
            var normalizedVel = this.velocity.copy().normalize();
            var scalingFactor = Math.min(Math.max(this.velocity.mag() * 75, 50), 100);
            line(this.position.x, this.position.y, this.position.x + this.velocity.x * 100, this.position.y + this.velocity.y * 100);
        }
        if (showAccel) {
            drawingContext.setLineDash([5, 5]);
            var normalizedAcc = this.accel.copy().normalize();
            var scalingFactor = Math.min(Math.max(this.accel.mag() * 1000, 40), 100);
            line(this.position.x, this.position.y, this.position.x + normalizedAcc.x * scalingFactor, this.position.y + normalizedAcc.y * scalingFactor);
        }
        if (showForces) {
            drawingContext.setLineDash([5, 5]);
            bodies.forEach(function (body) {
                var f = _this.accelFrom(body);
                f.normalize();
                var scalingFactor = Math.min(Math.max(f.mag() * 1000, 40), 100);
                line(_this.position.x, _this.position.y, _this.position.x + f.x * scalingFactor, _this.position.y + f.y * scalingFactor);
            });
        }
        pop();
    };
    PointMass.prototype.renderGlow = function () {
        push();
        noStroke();
        var lerpFactor = 2 / this.radius();
        for (var i = 0; i < this.radius(); i++) {
            this.alphaColor.setAlpha(lerp(1, 255, lerpFactor));
            fill(this.alphaColor);
            circle(this.position.x, this.position.y, i * 1.5);
        }
        this.alphaColor.setAlpha(255);
        pop();
    };
    PointMass.prototype.render = function () {
        push();
        fill(this.color);
        var imageSize = this.radius();
        angleMode(DEGREES);
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        if (this.tint != null) {
            tint(this.tint);
        }
        image(this.image, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
        pop();
    };
    return PointMass;
}());
function reset() {
    if (selectedInitialState == 0) {
        var earthMass = 2;
        var moonMass = 0.5;
        bodies = [
            new PointMass(earthTrailColor, earthImage, earthMass, createVector(width / 2, height / 2 - 40), createVector(0.75, 0)),
            new PointMass(moonTrailColor, moonImage, moonMass, createVector(width / 2, height / 2 + 138), createVector(-3, 0)),
        ];
    }
    else if (selectedInitialState == 1) {
        var masses = 1;
        bodies = [
            new PointMass(sunTrailColor, sunImage, masses, createVector(width / 2 + 100, height / 2), createVector(-0.2, 0.6)),
            new PointMass(earthTrailColor, earthImage, masses, createVector(width / 2 - 100, height / 2), createVector(0.2, -0.6)),
        ];
    }
    else if (selectedInitialState == 2) {
        bodies = [
            new PointMass(sunTrailColor, sunImage, 1, createVector(width / 2 + 100, height / 2), createVector(0, 1)),
            new PointMass(earthTrailColor, earthImage, 1, createVector(width / 2 - 100, height / 2), createVector(0, -1)),
        ];
    }
    else if (selectedInitialState == 3) {
        var f8Pos = createVector(0.97000436 * 300, -0.24308753 * 300);
        var f8Vel = createVector(-0.93240737 / 2, 0.86473146 / 2);
        var masses = 1;
        bodies = [
            new PointMass(sunTrailColor, sunImage, masses, createVector(width / 2, height / 2), f8Vel),
            new PointMass(earthTrailColor, earthImage, masses, createVector(width / 2 + f8Pos.x, height / 2 - f8Pos.y), p5.Vector.mult(f8Vel, -1)),
        ];
    }
    else if (selectedInitialState == 4) {
        var masses = 1.0;
        var r = 100;
        var v = 1.0;
        angleMode(DEGREES);
        bodies = [
            new PointMass(sunTrailColor, sunImage, masses, createVector(width / 2, height / 2 + r), createVector(v, 0)),
            new PointMass(earthTrailColor, earthImage, masses, createVector(width / 2 + sin(60) * r, height / 2 - cos(60) * r), createVector(-cos(60) * v, -sin(60) * v)),
            new PointMass(moonTrailColor, moonImage, masses, createVector(width / 2 - sin(60) * r, height / 2 - cos(60) * r), createVector(-cos(60) * v, sin(60) * v)),
        ];
    }
    else if (selectedInitialState == 5) {
        var f8Pos = createVector(0.97000436 * 300, -0.24308753 * 300);
        var f8Vel = createVector(-0.93240737, 0.86473146);
        var masses = 1;
        bodies = [
            new PointMass(sunTrailColor, sunImage, masses, createVector(width / 2, height / 2), f8Vel),
            new PointMass(earthTrailColor, earthImage, masses, createVector(width / 2 + f8Pos.x, height / 2 - f8Pos.y), p5.Vector.div(f8Vel, -2)),
            new PointMass(moonTrailColor, moonImage, masses, createVector(width / 2 - f8Pos.x, height / 2 + f8Pos.y), p5.Vector.div(f8Vel, -2)),
        ];
    }
    else if (selectedInitialState == 6) {
        var f8Pos = createVector(0.97000436 * 300, -0.24308753 * 300);
        var f8Vel = createVector(-0.93240737, 0.86473146);
        var masses = 0.3;
        bodies = [
            new PointMass(sunTrailColor, sunImage, masses, createVector(width / 2, height / 2), f8Vel, createVector(0, 0), null, 3),
            new PointMass(earthTrailColor, earthImage, masses, createVector(width / 2 + f8Pos.x, height / 2 - f8Pos.y), p5.Vector.div(f8Vel, -2), createVector(0, 0), null, 3),
            new PointMass(moonTrailColor, moonImage, masses, createVector(width / 2 - f8Pos.x, height / 2 + f8Pos.y), p5.Vector.div(f8Vel, -2), createVector(0, 0), null, 3),
        ];
    }
}
function setup() {
    console.log("🚀 - Setup initialized - P5 is running");
    frameRate(240);
    createCanvas(windowWidth, windowHeight);
    timeSlider = createSlider(1, timeSliderMax, initialTimeSlider, 0);
    timeSlider.position(10, windowHeight - windowHeight / 10);
    timeSlider.style("width", "100px");
    accuracySlider = createSlider(accuracySliderMin, accuracySliderMax, initialAccuracySlider, 0);
    accuracySlider.position(10, windowHeight - windowHeight / 6);
    accuracySlider.style("width", "100px");
    textFont("Roboto");
    textSize(16);
    backgroundColorDark = color(9 / 1.75, 26 / 1.75, 41 / 1.75);
    backgroundColorLight = color(21 / 1.75, 47 / 1.75, 68 / 1.75);
    generateStars();
    reset();
}
function generateStars() {
    stars = [];
    starRadii = [];
    starAlpha = [];
    for (var i = 0; i < 100; i++) {
        stars.push(createVector(random(0, windowWidth), random(0, windowHeight)));
        starRadii.push(random(1, 6));
        starAlpha.push(random(1, 200));
    }
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
function drawBackground() {
    var starColor = color(255, 255, 255);
    push();
    translate(windowWidth / 2, windowHeight / 2);
    var ratio = windowHeight / windowWidth;
    for (var x = windowWidth * 2; x >= 0; x -= 100) {
        var c = lerpColor(backgroundColorDark, backgroundColorLight, x / windowWidth);
        noStroke();
        fill(c);
        ellipse(0, 0, x, x * ratio);
    }
    pop();
    push();
    noStroke();
    stars.forEach(function (star, idx) {
        starColor.setAlpha(starAlpha[idx]);
        fill(starColor);
        circle(star.x, star.y, starRadii[idx]);
    });
    pop();
}
function draw() {
    drawBackground();
    if (showText) {
        push();
        fill(255);
        stroke(255);
        text(instructionText, 10, 10, windowWidth / 4, windowHeight);
        pop();
    }
    push();
    var fps = frameRate();
    fill(255);
    stroke(255);
    text("FPS: " + fps.toFixed(2), 10, height - 10);
    text("Simulation speed", 10, windowHeight - windowHeight / 10 - 10);
    text("Simulation accuracy", 10, windowHeight - windowHeight / 6 - 10);
    textAlign(CENTER);
    text("Scene: " + sceneNames[selectedInitialState], windowWidth / 2, 20);
    pop();
    bodies.forEach(function (body) {
        body.renderGlow();
    });
    bodies.forEach(function (body) {
        body.renderTrails();
    });
    bodies.forEach(function (body) {
        body.render();
    });
    savedPrevPos.forEach(function (prev) {
        push();
        prev.color.setAlpha(90);
        stroke(prev.color);
        noFill();
        beginShape();
        prev.prev_positions.forEach(function (pos) { return vertex(pos.x, pos.y); });
        endShape();
        pop();
    });
    if (shouldRun) {
        runStep();
    }
    if (newVelocity != null) {
        push();
        stroke(bodies[selectedBody].color);
        line(bodies[selectedBody].position.x, bodies[selectedBody].position.y, bodies[selectedBody].position.x + newVelocity.x, bodies[selectedBody].position.y + newVelocity.y);
        pop();
    }
}
function runStep() {
    var deltaTime = 10 *
        timeSlider.value() *
        (accuracySlider.value() / initialAccuracySlider);
    var accuracy = 1 / accuracySlider.value();
    for (var i = 0; i < deltaTime; i++) {
        bodies.forEach(function (body) { return body.applyPhysics(bodies, accuracy); });
    }
}
function mousePressed() {
    if (shiftHeld) {
        var c = color(random(255), random(255), random(255));
        bodies.push(new PointMass(c, moonImage, 1, createVector(mouseX, mouseY), createVector(0, 0), createVector(0, 0), c));
    }
    else {
        bodies.forEach(function (body) {
            if (body.overlaps(mouseX, mouseY)) {
                selectedBody = bodies.indexOf(body);
            }
        });
    }
}
function mouseDragged() {
    if (selectedBody != null) {
        var mouseVec = createVector(mouseX, mouseY);
        newVelocity = p5.Vector.sub(mouseVec, bodies[selectedBody].position);
    }
}
function mouseReleased() {
    if (selectedBody != null) {
        if (newVelocity != null) {
            bodies[selectedBody].velocity = p5.Vector.div(newVelocity, 100);
        }
        selectedBody = null;
        newVelocity = null;
    }
}
function keyPressed() {
    if (keyCode === RIGHT_ARROW) {
        runStep();
    }
    else if (keyCode === SHIFT) {
        shiftHeld = true;
    }
    else if (keyCode === 187) {
        selectedInitialState = (selectedInitialState + 1) % numInitialStates;
        generateStars();
        reset();
    }
    else if (keyCode === 189) {
        selectedInitialState =
            selectedInitialState === 0
                ? numInitialStates - 1
                : selectedInitialState - 1;
        generateStars();
        reset();
    }
    if (key === "p") {
        shouldRun = !shouldRun;
    }
    else if (key === "r") {
        if (savePrevious) {
            savedPrevPos = bodies;
        }
        reset();
    }
    else if (key === "a") {
        showAccel = !showAccel;
    }
    else if (key === "v") {
        showVel = !showVel;
    }
    else if (key === "s") {
        savePrevious = !savePrevious;
    }
    else if (key === "f") {
        showForces = !showForces;
    }
    else if (key === "c") {
        bodies.forEach(function (body) {
            body.prev_positions = [];
        });
    }
    else if (key === "h") {
        showText = !showText;
    }
}
function keyReleased() {
    if (keyCode === SHIFT) {
        shiftHeld = false;
    }
}
function preload() {
    sunTrailColor = color(240, 150, 55);
    earthTrailColor = color(137, 227, 228);
    moonTrailColor = color(238, 252, 252);
    sunImage = loadImage("images/sun.png");
    moonImage = loadImage("images/moon.png");
    earthImage = loadImage("images/earth.png");
}
//# sourceMappingURL=build.js.map