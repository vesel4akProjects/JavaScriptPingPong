const SCREEN_WIDTH = 900;
const SCREEN_HEIGHT = 500;
const BACKGROUND_COLOR = "#412C84";
const PADDLE_COLOR = "#04346C";
const BALL_COLOR = "#A60000";
const BALL_MAX_SPEED = 20;
const MAX_ANGLE = Math.PI / 3
const TARGET_SCORE = 10;

const player = {
    x: 20,
    y: SCREEN_HEIGHT / 2 - 50,
    width: 20,
    height: 100
};

const opponent = {
    x: SCREEN_WIDTH - 35,
    y: SCREEN_HEIGHT / 2 - 50,
    width: 10,
    height: 50
};

const ball = {
    x: SCREEN_WIDTH / 2 - 10,
    y: SCREEN_HEIGHT / 2 - 10,
    width: 25,
    height: 25
};

let playerSpeed = 0;
let opponentSpeed = 30;
let ballDx = -5;
let ballDy = 0;
let playerScore = 0;
let opponentScore = 0;
let gameIsOver = false;
let victoryText = "";
let endText = "";
let scoreTime = 0;
const pauseLen = 1500;

const particles = [];
const powerUps = [];
let powerUpActive = null;
let powerUpTimer = 0;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverlay = document.getElementById("gameOverlay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartBtn");

document.addEventListener('keydown', (e) => {
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        playerSpeed = -7;
    } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
        playerSpeed = 7;
    } else if (e.key === "r" || e.key === "R") {
        if (gameIsOver) restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        playerSpeed = 0;
    } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
        playerSpeed = 0;
    }
});

restartButton.addEventListener('click', restartGame);

function movePlayer() {
    player.y += playerSpeed;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > SCREEN_HEIGHT) player.y = SCREEN_HEIGHT - player.height;
}

function moveAI() {
    if (ball.x > SCREEN_WIDTH / 3 && ballDx > 0) {
        let predictedY = ball.y + (ballDy * (SCREEN_WIDTH - ball.x) / ballDx);
        predictedY = Math.max(opponent.height / 2, Math.min(SCREEN_HEIGHT - opponent.height / 2, predictedY));
        const targetY = predictedY - opponent.height / 2;

        if (opponent.y + opponent.height / 2 < targetY - 5) {
            opponent.y += Math.min(opponentSpeed, targetY - (opponent.y + opponent.height / 2));
        } else if (opponent.y + opponent.height / 2 > targetY + 5) {
            opponent.y -= Math.min(opponentSpeed, (opponent.y + opponent.height / 2) - targetY);
        }
    }
}

function moveBall(dx, dy) {
    const speedIncrease = 1.02;

    if (ball.y <= 0) {
        dy = Math.abs(dy);
        playsound("wall");
    } else if (ball.y + ball.height >= SCREEN_HEIGHT) {
        dy = -Math.abs(dy);
        playsound("wall");
    }

    if (isColliding(ball, player) && dx < 0) {
        playsound("pong");
        const hitPos = (ball.y + ball.height / 2 - (player.y + player.height / 2)) / (player.height / 2);
        const angle = hitPos * MAX_ANGLE;
        const currentSpeed = Math.sqrt(dx * dx + dy * dy);
        const newSpeed = Math.min(BALL_MAX_SPEED, currentSpeed * speedIncrease);
        dx = newSpeed * Math.cos(angle);
        dy = newSpeed * Math.sin(angle);

        if (powerUpActive === "player") {
            dx *= 1.3;
            powerUpActive = null;
        }
    }

    if (isColliding(ball, opponent) && dx > 0) {
        playsound("pong");
        const hitPos = (ball.y + ball.height / 2 - (opponent.y + opponent.height / 2)) / (opponent.height / 2);
        const angle = Math.PI - hitPos * MAX_ANGLE;
        const currentSpeed = Math.sqrt(dx * dx + dy * dy);
        const newSpeed = Math.min(BALL_MAX_SPEED, currentSpeed * speedIncrease);
        dx = newSpeed * Math.cos(angle);
        dy = newSpeed * Math.sin(angle);

        if (powerUpActive === "opponent") {
            dx *= 1.3;
            powerUpActive = null;
        }
    }

    for (let i = 0; i < powerUps.length; i++) {
        const powerUp = powerUps[i];
        if (isColliding(ball, powerUp.rect)) {
            playsound("powerUp");
            if (Math.random() > 0.3) {
                powerUpActive = dx < 0 ? "player" : "opponent";
            } else {
                dx *= 0.7;
                dy *= 0.7;
            }
            powerUps.splice(i, 1);
            break;
        }
    }

    const now = Date.now();
    if (now - scoreTime > pauseLen && !gameIsOver) {
        ball.x += dx;
        ball.y += dy;
    }

    return { dx, dy };
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function restartBall() {
    ball.x = SCREEN_WIDTH / 2 - ball.width / 2;
    ball.y = SCREEN_HEIGHT / 2 - ball.height / 2;
    let angle = Math.random() * Math.PI / 2 - Math.PI / 4;

    if (Math.random() > 0.5) {
        angle += Math.PI;
    }

    const speed = Math.random() * 2 + 5;
    ballDx = speed * Math.cos(angle);
    ballDy = speed * Math.sin(angle);
}

function spawnPowerUp() {
    if (powerUps.length < 2 && Math.random() < 0.01) {
        const powerUp = {
            rect: {
                x: Math.random() * (SCREEN_WIDTH - 200) + 100,
                y: Math.random() * (SCREEN_HEIGHT - 200) + 100,
                width: 20,
                height: 20
            },
            type: Math.random() > 0.3 ? "good" : "bad",
            spawnTime: Date.now()
        };
        powerUps.push(powerUp);
    }
}

function updatePowerUps() {
    const currentTime = Date.now();
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (currentTime - powerUps[i].spawnTime > 10000) {
            powerUps.splice(i, 1);
        }
    }
}

function playsound(type) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch(type) {
            case "pong":
                oscillator.frequency.value = 800; // Высокий тон для удара
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;

            case "wall":
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.08;
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.08);
                break;

            case "score":
                oscillator.frequency.value = 1200;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.15;
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;

            case "powerUp":

                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.3);
                oscillator.type = 'sine';
                gainNode.gain.value = 0.12;
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;

            default:
                oscillator.frequency.value = 440;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.05;
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
        }

    } catch (error) {
        console.log("Звук:", type);
    }
}


function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            dx: Math.random() * 4 - 2,
            dy: Math.random() * 2 - 2,
            live: 30,
            color: color,
            size: Math.random() * 2 + 2
        });
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.live--;

        if (particle.live <= 0) {
            particles.splice(i, 1);
        } else {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.dy += 0.3;
            const alpha = particle.live / 30;
            ctx.fillStyle = `rgba(${particle.color[0]},${particle.color[1]},${particle.color[2]},${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawGame() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = "#218555";
    for (let y = 0; y < SCREEN_HEIGHT; y += 20) {
        ctx.fillRect(SCREEN_WIDTH / 2 - 2, y, 4, 10);
    }

    ctx.fillStyle = "#920031";
    ctx.font = "42px Arial";
    ctx.textAlign = "center";
    ctx.fillText(playerScore.toString(), SCREEN_WIDTH / 4, 50);
    ctx.fillText(opponentScore.toString(), SCREEN_WIDTH / 4 * 3, 50);

    ctx.fillStyle = PADDLE_COLOR;
    drawRoundedRect(player.x, player.y, player.width, player.height, 3);
    drawRoundedRect(opponent.x, opponent.y, opponent.width, opponent.height, 3);

    ctx.fillStyle = BALL_COLOR;
    drawRoundedRect(ball.x, ball.y, ball.width, ball.height, ball.width / 2);

    if (Math.abs(ballDx) > 8) {
        ctx.fillStyle = 'rgba(121,209,111,0.2)';
        drawRoundedRect(ball.x - 5, ball.y - 5, ball.width + 10, ball.height + 10, (ball.width + 10) / 2);
    }

    for (const powerUp of powerUps) {
        ctx.fillStyle = powerUp.type === "good" ? '#ff0000' : '#00ff09';
        drawRoundedRect(powerUp.rect.x, powerUp.rect.y, powerUp.rect.width, powerUp.rect.height, 4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(powerUp.rect.x, powerUp.rect.y, powerUp.rect.width, powerUp.rect.height);
    }

    drawParticles();

    if (powerUpActive) {
        ctx.fillStyle = "#42ff49";
        ctx.font = "18px Arial";
        ctx.fillText('POWER UP IS ACTIVE', SCREEN_WIDTH / 2, 80);
    }

    if (gameIsOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        ctx.fillStyle = "#FFFC00";
        ctx.font = "42px Arial";
        ctx.fillText(endText, SCREEN_WIDTH / 2, 150);
        ctx.font = "18px Arial";
        ctx.fillText("PRESS R TO RESTART", SCREEN_WIDTH / 2, 200);
        const statText = `score: ${playerScore}-${opponentScore}`;
        ctx.fillText(statText, SCREEN_WIDTH / 2, 250);
    }

    ctx.fillStyle = "#659A00";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`FPS:${Math.round(fps)}`, 20, SCREEN_HEIGHT - 20);
}

function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function restartGame() {
    gameIsOver = false;
    playerScore = 0;
    opponentScore = 0;
    restartBall();
    powerUps.length = 0;
    particles.length = 0;
    gameOverlay.style.display = "none";
}

let lastTime = 0;
let fps = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    fps = 1000 / deltaTime;

    if (!gameIsOver) {
        movePlayer();
        moveAI();
        const newSpeeds = moveBall(ballDx, ballDy);
        ballDx = newSpeeds.dx;
        ballDy = newSpeeds.dy;
        spawnPowerUp();
        updatePowerUps();
    }

    if (ball.x + ball.width <= 0) {
        opponentScore++;
        createParticles(ball.x, ball.y + ball.height / 2, [121, 8, 170]);
        if (opponentScore === TARGET_SCORE) {
            gameIsOver = true;
            endText = 'YOU ARE LOSER';
            playsound("loser");
            gameOverText.textContent = endText;
            gameOverlay.style.display = 'flex';
        }
        playsound("score");
        restartBall();
        scoreTime = Date.now();
    } else if (ball.x >= SCREEN_WIDTH) {
        playerScore++;
        createParticles(ball.x + ball.width, ball.y + ball.height / 2, [121, 8, 170]);
        if (playerScore === TARGET_SCORE) {
            gameIsOver = true;
            endText = 'YOU ARE WINER';
            playsound("winner")
            gameOverText.textContent = endText;
            gameOverlay.style.display = 'flex';
        }
        playsound("score");
        restartBall();
        scoreTime = Date.now();
    }

    drawGame();
    requestAnimationFrame(gameLoop);
}

restartBall();
requestAnimationFrame(gameLoop);