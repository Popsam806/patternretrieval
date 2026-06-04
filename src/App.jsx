import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

import agentSprite from './assets/agent.png'; 

const PatternRetrieval = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
  const [showSplash, setShowSplash] = useState(true);
  const [agentLoaded, setAgentLoaded] = useState(false);
  const agentImageRef = useRef(new Image());

  const isGameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const triggerGameActionRef = useRef(null);

  const gameState = useRef({
    isPlaying: true,
    isCrashing: false,
    gameSpeed: 7, 
    score: 0,
    agent: {
      x: window.innerWidth < 600 ? 20 : 60,
      y: 0,  
      width: 55,  
      height: 55, 
      velocityY: 0,
      gravity: 1.4,
      jumpForce: -21,
      isGrounded: true,
    },
    patterns: [], 
    patternConfig: {
      width: window.innerWidth < 600 ? 15 : 30,  
      height: window.innerWidth < 600 ? 35 : 55, 
      minDistance: window.innerWidth < 600 ? 185 : 300, 
    },
  });

  useEffect(() => {
    isGameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  useEffect(() => {
    agentImageRef.current.src = agentSprite;
    agentImageRef.current.onload = () => setAgentLoaded(true);
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const resetGame = useCallback(() => {
    const currentScore = scoreRef.current;
    const currentHighScore = highScoreRef.current;

    if (currentScore > currentHighScore) {
      setHighScore(currentScore);
      highScoreRef.current = currentScore;
    }

    const isMobile = window.innerWidth < 600;
    const containerHeight = containerRef.current
      ? containerRef.current.clientHeight
      : window.innerHeight * 0.8;
    
    gameState.current = {
      isPlaying: true,
      isCrashing: false,
      gameSpeed: isMobile ? 5 : 7,
      score: 0,
      agent: {
        x: isMobile ? 20 : 60,
        y: containerHeight - 80 - (isMobile ? 40 : 55),
        width: isMobile ? 40 : 55,
        height: isMobile ? 40 : 55,
        velocityY: 0,
        gravity: 1.4,
        jumpForce: -21,
        isGrounded: true,
      },
      patterns: [],
      patternConfig: {
        width: isMobile ? 15 : 30,
        height: isMobile ? 35 : 55,
        minDistance: isMobile ? 185 : 300,
      },
    };

    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
  }, []);

  const triggerGameAction = useCallback(() => {
    const state = gameState.current;
    if (state.isCrashing) return;

    if (isGameOverRef.current) {
      resetGame();
    } else if (state.agent.isGrounded && state.isPlaying) {
      state.agent.velocityY = state.agent.jumpForce;
      state.agent.isGrounded = false;
    }
  }, [resetGame]);

  // Always keep ref pointed at latest triggerGameAction execution frame
  useEffect(() => {
    triggerGameActionRef.current = triggerGameAction;
  });

  // Persistent Input Controller - Attached and cleaned up properly via container ref dependencies
  useEffect(() => {
    if (showSplash || !agentLoaded) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        triggerGameActionRef.current?.();
      }
    };

    const handleTouchStart = (e) => {
      // If game is over, let the overlay surface handle clicks explicitly to avoid double firing
      if (isGameOverRef.current) return;
      
      e.preventDefault();
      triggerGameActionRef.current?.();
    };

    window.addEventListener('keydown', handleKeyDown);

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (containerElement) {
        containerElement.removeEventListener('touchstart', handleTouchStart);
      }
    };
  }, [showSplash, agentLoaded]); // Runs cleanly after initialization splash collapses

  // Engine Effect
  useEffect(() => {
    if (!agentLoaded || showSplash) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      canvas.width = width;
      canvas.height = height;
      if (width < 600) {
        gameState.current.gameSpeed = Math.max(gameState.current.gameSpeed, 5);
        gameState.current.patternConfig.minDistance = 185;
        gameState.current.patternConfig.width = 15;  
        gameState.current.patternConfig.height = 35; 
        gameState.current.agent.width = 40;
        gameState.current.agent.height = 40;
        gameState.current.agent.x = 20;
      } else {
        gameState.current.patternConfig.minDistance = 300;
        gameState.current.patternConfig.width = 30;  
        gameState.current.patternConfig.height = 55; 
        gameState.current.agent.width = 55;
        gameState.current.agent.height = 55;
        gameState.current.agent.x = 60;
      }
      const updatedFloorLevel = height - 80 - gameState.current.agent.height;
      if (gameState.current.agent.isGrounded) {
        gameState.current.agent.y = updatedFloorLevel;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    const spawnPattern = (state) => {
      if (state.isCrashing) return;
      const lastPattern = state.patterns[state.patterns.length - 1];
      if (!lastPattern || canvas.width - lastPattern.x > state.patternConfig.minDistance) {
        if (Math.random() < 0.015) {
          state.patterns.push({
            x: canvas.width,
            y: canvas.height - 80 - state.patternConfig.height, 
            width: state.patternConfig.width,
            height: state.patternConfig.height,
            seed: Math.random(),
          });
        }
      }
    };

    const updatePhysics = () => {
      const state = gameState.current;
      if (!state.isPlaying || state.isCrashing) return;
      state.agent.velocityY += state.agent.gravity;
      state.agent.y += state.agent.velocityY;
      const floorLevel = canvas.height - 80 - state.agent.height;
      if (state.agent.y >= floorLevel) {
        state.agent.y = floorLevel;
        state.agent.velocityY = 0;
        state.agent.isGrounded = true;
      }
      for (let i = state.patterns.length - 1; i >= 0; i--) {
        state.patterns[i].x -= state.gameSpeed;
        if (
          state.agent.x < state.patterns[i].x + state.patterns[i].width &&
          state.agent.x + state.agent.width > state.patterns[i].x &&
          state.agent.y < state.patterns[i].y + state.patterns[i].height &&
          state.agent.y + state.agent.height > state.patterns[i].y
        ) {
          state.isCrashing = true;
          setTimeout(() => {
            state.isPlaying = false;
            setGameOver(true);
          }, 1000);
          return;
        }
        if (state.patterns[i] && state.patterns[i].x + state.patterns[i].width < 0) {
          state.patterns.splice(i, 1);
          state.score += 1;
          setScore(state.score);
          scoreRef.current = state.score;
          if (state.score % 5 === 0) state.gameSpeed += 0.6;
        }
      }
      spawnPattern(state);
    };

    const drawGlitchSprite = (ctx, x, y, width, height, seed) => {
      const state = gameState.current;
      const timeDivider = state.isCrashing ? 30 : 80;
      const timeFactor = Math.floor(Date.now() / timeDivider); 
      const glitchToggle = Math.sin(timeFactor + seed * 100);
      ctx.save();
      if (glitchToggle > 0.3) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.7)'; 
        ctx.fillRect(x - 2, y + (glitchToggle * 1), width, height);
        ctx.fillStyle = 'rgba(255, 0, 85, 0.7)'; 
        ctx.fillRect(x + 2, y - (glitchToggle * 1), width, height);
      }
      ctx.fillStyle = '#ff0055'; 
      ctx.fillRect(x, y, width, height);
      const slices = window.innerWidth < 600 ? 3 : 5; 
      for (let i = 0; i < slices; i++) {
        const sliceHeight = height / slices;
        const sliceY = y + (i * sliceHeight);
        const sliceShift = Math.sin(timeFactor + i) * (seed * (state.isCrashing ? 10 : 4));
        if (Math.sin(timeFactor * 0.5 + i) > 0.2) {
          ctx.fillStyle = i % 2 === 0 ? '#00ffcc' : '#ffffff';
          ctx.fillRect(x + sliceShift, sliceY, width - (sliceShift * 0.5), sliceHeight - 1);
        } else {
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(x + sliceShift, sliceY, width, sliceHeight);
        }
      }
      if (glitchToggle < -0.4 || state.isCrashing) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 4, y + (height * 0.3), 2, 2);
        ctx.fillRect(x + width + 2, y + (height * 0.7), 3, 1);
      }
      ctx.restore();
    };

    const renderFrame = () => {
      const state = gameState.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const lineY = canvas.height - 80;
      ctx.strokeStyle = '#00ffcc'; 
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();
      if (agentLoaded) {
        const shouldRenderAgent = !state.isCrashing || Math.floor(Date.now() / 50) % 2 === 0;
        if (shouldRenderAgent) {
          ctx.save();
          if (state.isCrashing) {
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 15;
          }
          ctx.drawImage(agentImageRef.current, state.agent.x, state.agent.y, state.agent.width, state.agent.height);
          ctx.restore();
        }
      }
      state.patterns.forEach((pat) => {
        drawGlitchSprite(ctx, pat.x, pat.y, pat.width, pat.height, pat.seed);
      });
    };

    const gameLoop = () => {
      updatePhysics();
      renderFrame();
      if (gameState.current.isPlaying) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    if (!gameOver) {
      gameLoop();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, agentLoaded, showSplash]);

  return (
    <div className="game-wrapper-center">
      <div ref={containerRef} className="pattern-retrieval-bounded">
        {showSplash && (
          <div className="initial-splash-screen">
            <h1 className="splash-title">PATTERN RETRIEVAL</h1>
            <div className="splash-image-container">
              <img src={agentSprite} alt="Agent Profile" className="splash-agent-img" />
            </div>
            <div className="glitch-loader-bar">
              <div className="loader-progress"></div>
            </div>
            <p className="splash-subtitle">PREPARING TO RETRIEVE PATTERNS...</p>
          </div>
        )}

        <div className="hud-overlay" style={{ display: showSplash ? 'none' : 'flex' }}>
          <div className="game-title">PATTERN RETRIEVAL</div>
          <div className="scores">
            <span>HIGH SCORE: {highScore}</span> <span>RETRIEVED: {score}</span>
          </div>
        </div>
        
        <canvas ref={canvasRef} id="retrievalCanvas" />
        
        {gameOver && !showSplash && (
          <div 
            className="system-failure-overlay" 
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); resetGame(); }}
            onClick={resetGame}
          >
            <h2>GAME OVER</h2>
            <button className="reboot-btn" tabIndex={-1}>
              {window.innerWidth < 600 ? "TAP TO RETRY" : "PRESS SPACEBAR OR TAP TO RETRY"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternRetrieval;