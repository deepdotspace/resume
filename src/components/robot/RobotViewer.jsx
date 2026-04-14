import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';

// GitHub raw URL for the RobotExpressive model
const ROBOT_GLB_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

// ── Module-level cache: survives component unmount/remount ──
const cache = {
  scene: null,
  renderer: null,
  camera: null,
  controls: null,
  mixer: null,
  clock: null,
  modelBounds: null,
  animationsMap: new Map(),
  currentAction: null,
  threeLoaded: false,
  ready: false,           // true once model is loaded
  frameId: null,
};

// ── Module-level singleton loader: guarantees Three.js + loaders are
//    loaded exactly once, even when the component mounts concurrently. ──
let threeLoadingPromise = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-robot-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      // Script is still loading — wait for its load event.
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.dataset.robotSrc = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function waitFor(check, label, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const value = check();
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for ${label}`));
        return;
      }
      setTimeout(tick, 30);
    };
    tick();
  });
}

function loadThreeJSOnce() {
  if (cache.threeLoaded) return Promise.resolve();
  if (threeLoadingPromise) return threeLoadingPromise;

  threeLoadingPromise = (async () => {
    try {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
      await waitFor(() => window.THREE, 'THREE');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
      await waitFor(() => window.THREE?.GLTFLoader, 'THREE.GLTFLoader');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
      await waitFor(() => window.THREE?.OrbitControls, 'THREE.OrbitControls');
      cache.threeLoaded = true;
    } catch (err) {
      // Reset so a retry (e.g. remount) can try again.
      threeLoadingPromise = null;
      throw err;
    }
  })();

  return threeLoadingPromise;
}

const RobotViewer = React.forwardRef(function RobotViewer(
  { modelUrl = ROBOT_GLB_URL, onClick, paused = false },
  ref
) {
  const canvasRef = useRef(null);

  // Component-level refs that point into the module cache
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const modelBoundsRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(null);
  const controlsRef = useRef(null);
  const currentActionRef = useRef(null);
  const animationsMapRef = useRef(new Map());
  const frameIdRef = useRef(null);
  const threeLoadedRef = useRef(false);

  const [loading, setLoading] = useState(!cache.ready);
  const [error, setError] = useState(null);
  const [selectedAnimation, setSelectedAnimation] = useState('Idle');
  const [availableAnimations, setAvailableAnimations] = useState([]);
  const [loadProgress, setLoadProgress] = useState(cache.ready ? 100 : 0);

  // Imperative API for parent components (e.g. trigger animations from rating buttons)
  useImperativeHandle(ref, () => ({
    playAnimation: (animName) => {
      // Reuse the same logic as clicking an animation button, but without UI
      if (!mixerRef.current || !animationsMapRef.current.has(animName)) {
        // Silently ignore if animation is not available
        return;
      }

      // Stop current animation
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(0.2);
      }

      const clip = animationsMapRef.current.get(animName);
      const action = mixerRef.current.clipAction(clip);

      if (animName === 'Idle') {
        action.reset();
        action.setLoop(window.THREE.LoopRepeat, Infinity);
        action.fadeIn(0.3);
        action.play();
      } else {
        action.reset();
        action.setLoop(window.THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.fadeIn(0.2);
        action.play();
      }

      currentActionRef.current = action;
      cache.currentAction = action;
      setSelectedAnimation(animName);
    }
  }));

  useEffect(() => {
    let mounted = true;

    // Use the module-level singleton loader (handles concurrent mounts + race)
    const loadThreeJS = loadThreeJSOnce;

    const initScene = async () => {
      try {
        // ── Fast path: reattach cached renderer to new canvas ──
        if (cache.ready && cache.renderer && canvasRef.current) {
          // Swap the internal canvas — the old one was detached when the
          // previous component instance unmounted (portal target changed).
          const parent = canvasRef.current.parentElement;
          const oldCanvas = canvasRef.current;
          const cachedCanvas = cache.renderer.domElement;

          // Copy size attributes so it fits the new container
          cachedCanvas.style.display = 'block';
          cachedCanvas.style.width = '100%';
          cachedCanvas.style.height = '100%';
          oldCanvas.replaceWith(cachedCanvas);
          canvasRef.current = cachedCanvas;

          // Restore refs from cache
          sceneRef.current = cache.scene;
          rendererRef.current = cache.renderer;
          cameraRef.current = cache.camera;
          controlsRef.current = cache.controls;
          mixerRef.current = cache.mixer;
          clockRef.current = cache.clock;
          modelBoundsRef.current = cache.modelBounds;
          animationsMapRef.current = cache.animationsMap;
          currentActionRef.current = cache.currentAction;

          // Re-bind controls to the reattached canvas
          if (cache.controls) {
            cache.controls.domElement = cachedCanvas;
          }

          // Resize to new container
          const w = parent?.clientWidth || 260;
          const h = parent?.clientHeight || 280;
          cache.camera.aspect = w / h;
          cache.camera.updateProjectionMatrix();
          cache.renderer.setSize(w, h);

          setLoading(false);
          setLoadProgress(100);
          setAvailableAnimations([...cache.animationsMap.keys()]);

          // Restart render loop
          if (cache.clock) cache.clock.getDelta(); // flush stale delta
          const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            const delta = cache.clock ? cache.clock.getDelta() : 0;
            if (cache.mixer) cache.mixer.update(delta);
            if (cache.controls) cache.controls.update();
            if (cache.renderer && cache.scene && cache.camera) {
              cache.renderer.render(cache.scene, cache.camera);
            }
          };
          animate();

          // Handle resize
          const handleResize = () => {
            if (!canvasRef.current || !cache.camera || !cache.renderer) return;
            const p = canvasRef.current.parentElement;
            const w = p?.clientWidth || 260;
            const h = p?.clientHeight || 280;
            cache.camera.aspect = w / h;
            cache.camera.updateProjectionMatrix();
            cache.renderer.setSize(w, h);
          };
          window.addEventListener('resize', handleResize);
          // Trigger initial resize after portal settles
          requestAnimationFrame(handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }

        // ── Cold start: first-time initialization ──
        setLoading(true);
        setError(null);
        setLoadProgress(10);

        await loadThreeJS();

        if (!mounted) return;

        setLoadProgress(20);

        const THREE = window.THREE;
        const GLTFLoader = THREE.GLTFLoader;
        const OrbitControls = THREE.OrbitControls;

        // Setup scene with transparent background
        const scene = new THREE.Scene();
        scene.background = null; // Transparent
        sceneRef.current = scene;

        // Prefer parent size so we stay responsive inside small widgets
        const parent = canvasRef.current.parentElement;
        const width = parent?.clientWidth || canvasRef.current.clientWidth || 800;
        const height = parent?.clientHeight || canvasRef.current.clientHeight || 600;

        // Setup camera - adjusted for smaller robot
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 1.8, 3.5);
        cameraRef.current = camera;

        // Setup renderer with transparency
        const renderer = new THREE.WebGLRenderer({ 
          canvas: canvasRef.current, 
          antialias: true,
          alpha: true // Enable transparency
        });
        renderer.setClearColor(0x000000, 0); // Transparent clear color
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        setLoadProgress(30);

        // Add hemisphere light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.3);
        hemiLight.position.set(10, 20, 0);
        scene.add(hemiLight);

        // Add directional light with shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 7.5);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 2;
        dirLight.shadow.camera.bottom = -2;
        dirLight.shadow.camera.left = -2;
        dirLight.shadow.camera.right = 2;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 40;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        // Setup orbit controls - disable zoom and pan, only allow rotation
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.enableZoom = false; // Disable zoom scrolling
        controls.enablePan = false; // Disable panning
        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.maxPolarAngle = Math.PI / 1.8;
        controls.target.set(0, 0.8, 0);
        controls.update();
        controlsRef.current = controls;

        setLoadProgress(40);

        // Load GLB model
        const loader = new GLTFLoader();
        
        loader.load(
          modelUrl,
          (gltf) => {
            if (!mounted) return;

            setLoadProgress(80);
            
            const model = gltf.scene;

            // Enable shadows on all meshes
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // Center and scale model - make it bigger for better visibility
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            // Larger scale for better visibility (1.8 instead of 1.2)
            const scale = 1.8 / maxDim;
            
            model.scale.setScalar(scale);
            model.position.x = -center.x * scale;
            model.position.y = -box.min.y * scale;
            model.position.z = -center.z * scale;

            // Store bounds for responsive camera framing
            const scaledSize = size.multiplyScalar(scale);
            const radius = 0.5 * Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
            const height = scaledSize.y;
            const centerY = height * 0.5;
            modelBoundsRef.current = { radius, height, centerY };

            // Helper to frame the model vertically so feet are not clipped
            const frameModel = () => {
              if (!cameraRef.current || !modelBoundsRef.current) return;

              const { height: modelHeight, centerY: modelCenterY } = modelBoundsRef.current;
              const fov = (cameraRef.current.fov * Math.PI) / 180;
              const halfHeight = modelHeight / 2;
              const padding = 1.25; // add a bit of extra room so legs stay visible

              const distance = (halfHeight / Math.tan(fov / 2)) * padding;

              cameraRef.current.position.set(0, modelCenterY * 1.05, distance);
              cameraRef.current.lookAt(0, modelCenterY * 0.95, 0);

              if (controlsRef.current) {
                controlsRef.current.target.set(0, modelCenterY * 0.95, 0);
                controlsRef.current.update();
              }
            };

            frameModel();

            scene.add(model);

            // Setup animations
            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              mixerRef.current = mixer;

              const animationsMap = new Map();
              const foundAnimations = [];

              gltf.animations.forEach((clip) => {
                animationsMap.set(clip.name, clip);
                foundAnimations.push(clip.name);
              });

              animationsMapRef.current = animationsMap;
              setAvailableAnimations(foundAnimations);

              // Play default animation (Idle if available, otherwise first clip)
              const defaultAnim = animationsMap.has('Idle') ? 'Idle' : foundAnimations[0];
              if (defaultAnim) {
                const clip = animationsMap.get(defaultAnim);
                const action = mixer.clipAction(clip);
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.play();
                currentActionRef.current = action;
                setSelectedAnimation(defaultAnim);
              }
              
              // Listen for animation finished events
              mixer.addEventListener('finished', (e) => {
                if (animationsMap.has('Idle') && e.action !== currentActionRef.current) {
                  const idleClip = animationsMap.get('Idle');
                  const idleAction = mixer.clipAction(idleClip);
                  idleAction.reset();
                  idleAction.setLoop(THREE.LoopRepeat, Infinity);
                  idleAction.fadeIn(0.3);
                  idleAction.play();
                  currentActionRef.current = idleAction;
                  setSelectedAnimation('Idle');
                }
              });
            }

            // Initialize clock for animation timing
            clockRef.current = new THREE.Clock();

            setLoadProgress(100);
            
            // Start render loop
            const animate = () => {
              if (!mounted) return;
              
              frameIdRef.current = requestAnimationFrame(animate);

              const delta = clockRef.current ? clockRef.current.getDelta() : 0;
              
              if (mixerRef.current) {
                mixerRef.current.update(delta);
              }

              if (controlsRef.current) {
                controlsRef.current.update();
              }

              if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
              }
            };

            animate();
            setLoading(false);

            // Populate module cache so remounts are instant
            cache.scene = scene;
            cache.renderer = renderer;
            cache.camera = camera;
            cache.controls = controls;
            cache.mixer = mixerRef.current;
            cache.clock = clockRef.current;
            cache.modelBounds = modelBoundsRef.current;
            cache.animationsMap = animationsMapRef.current;
            cache.currentAction = currentActionRef.current;
            cache.ready = true;
          },
          (progress) => {
            if (progress.total > 0) {
              const percent = (progress.loaded / progress.total) * 100;
              const scaledPercent = 40 + (percent * 0.4); // Scale to 40-80%
              setLoadProgress(Math.round(scaledPercent));
            }
          },
          (error) => {
            setError('Failed to load 3D model. Please check the URL.');
            setLoading(false);
          }
        );

        // Handle window resize
        const handleResize = () => {
          if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
          
          const parent = canvasRef.current.parentElement;
          const width = parent?.clientWidth || canvasRef.current.clientWidth || 800;
          const height = parent?.clientHeight || canvasRef.current.clientHeight || 600;
          
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);

          // Re-frame the model with the new aspect ratio so feet remain visible
          if (modelBoundsRef.current) {
            const { height: modelHeight, centerY: modelCenterY } = modelBoundsRef.current;
            const fov = (cameraRef.current.fov * Math.PI) / 180;
            const halfHeight = modelHeight / 2;
            const padding = 1.25;

            const distance = (halfHeight / Math.tan(fov / 2)) * padding;

            cameraRef.current.position.set(0, modelCenterY * 1.05, distance);
            cameraRef.current.lookAt(0, modelCenterY * 0.95, 0);

            if (controlsRef.current) {
              controlsRef.current.target.set(0, modelCenterY * 0.95, 0);
              controlsRef.current.update();
            }
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (err) {
        setError(err.message || 'Failed to initialize 3D viewer');
        setLoading(false);
      }
    };

    initScene();

    return () => {
      mounted = false;

      // Only stop the animation loop — do NOT dispose the renderer or
      // controls so we can reattach instantly on remount.
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [modelUrl]);

  // Pause/resume the render loop when the viewer is hidden to save CPU
  useEffect(() => {
    if (loading) return;

    if (paused) {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    } else {
      // Resume the loop only if it's not already running
      if (!frameIdRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
        if (clockRef.current) clockRef.current.getDelta(); // flush stale delta
        const animate = () => {
          frameIdRef.current = requestAnimationFrame(animate);
          const delta = clockRef.current ? clockRef.current.getDelta() : 0;
          if (mixerRef.current) mixerRef.current.update(delta);
          if (controlsRef.current) controlsRef.current.update();
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        };
        animate();
      }
    }
  }, [paused, loading]);

  const handleAnimationClick = (animName) => {
    if (!mixerRef.current || !animationsMapRef.current.has(animName)) {
      return;
    }

    setSelectedAnimation(animName);

    // Stop current animation
    if (currentActionRef.current) {
      currentActionRef.current.fadeOut(0.2);
    }

    // Play the selected animation
    const clip = animationsMapRef.current.get(animName);
    const action = mixerRef.current.clipAction(clip);
    
    if (animName === 'Idle') {
      action.reset();
      action.setLoop(window.THREE.LoopRepeat, Infinity);
      action.fadeIn(0.3);
      action.play();
    } else {
      action.reset();
      action.setLoop(window.THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.fadeIn(0.2);
      action.play();
    }
    
    currentActionRef.current = action;
  };

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      {/* Click overlay — sits above the canvas so OrbitControls' preventDefault on pointerdown doesn't suppress the click event from bubbling to parent containers */}
      <div
        onClick={onClick}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
        }}
      />

      {/* Loading State */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}>
          <div style={{
            textAlign: 'center',
            background: 'rgba(55, 65, 81, 0.9)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(156, 163, 175, 0.2)'
          }}>
            <div style={{
              position: 'relative',
              width: '60px',
              height: '60px',
              margin: '0 auto 16px'
            }}>
              <div style={{
                position: 'absolute',
                inset: '0',
                border: '4px solid rgba(156, 163, 175, 0.2)',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: '0',
                border: '4px solid #9ca3af',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontWeight: '700',
                fontSize: '14px'
              }}>
                {loadProgress}%
              </div>
            </div>
            <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '500' }}>
              Loading robot...
            </p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '300px',
            background: 'rgba(55, 65, 81, 0.9)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(156, 163, 175, 0.2)'
          }}>
            <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Error Loading Robot
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default RobotViewer;

