import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, Html, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';

// Performance optimizer
function RendererConfig() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.85;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

function Model({ onLaptopClick, scale = 1, isNight }) {
  const { scene } = useGLTF('/ceo-office-draco.glb');
  const modelRef = useRef();
  const [hoveringLaptop, setHoveringLaptop] = useState(false);
  const laptopMeshes = useRef([]);

  useEffect(() => {
    if (!scene) return;
    const found = [];
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        const matName = (child.material?.name || '').toLowerCase();
        const meshName = (child.name || '').toLowerCase();

        // ── Standard physical properties (PBR) tuned for a moody, rich look ──────
        child.material.roughness = 0.5;
        child.material.metalness = 0.0;

        // ── Manually restore colors + custom PBR properties ──────
        // Woody Finish Furniture (Mahagony / Terracotta / Dark Warm Wood)
        if (matName.includes('ceiling') || matName.includes('back') || matName.includes('wood') || matName.includes('shelf')) {
          child.material.color.setHex(0x8a3324); // Matches the deep terracotta wood in ref image
          child.material.roughness = 0.55; // Natural wood finish (non-plastic)
          child.material.metalness = 0.0;
        }
        // Executive Desk (Matte Charcoal Gray)
        if (matName.includes('bureau') || matName.includes('desk') || meshName.includes('table')) {
          child.material.color.setHex(0x1a1a1a);
          child.material.roughness = 0.6;
        }
        // Leather Chairs (Deep Charcoal / Blackened skin)
        if (matName.includes('leather') || matName.includes('black') || meshName.includes('chair')) {
          child.material.color.setHex(0x050505); 
          child.material.roughness = 0.45;
          child.material.metalness = 0.05;
        }
        // 'Space Gray' Laptop (Clinical Matte Industrial Metal)
        if (matName.includes('laptop') || meshName.includes('laptop')) {
          child.material.color.setHex(0x4a4e51); // True Space Gray
          child.material.metalness = 0.8;
          child.material.roughness = 0.75; // Matte finish to avoid white wash
        }
        // Randomized Books / Clinical Stacks (Individual covers/spines)
        if (matName.includes('livre') || matName.includes('book') || matName.includes('paper') || meshName.includes('stack')) {
          // Deterministic pseudo-randomness based on object name length
          const hash = (child.name.length + child.id) % 5;
          const colors = [
            0x0a0a0a, // Deep Black
            0x2d3436, // Slate Gray
            0xecf0f1, // Bright White
            0xe5e2c9, // Ivory
            0x1e3799  // Deep Clinical Blue
          ];
          child.material.color.setHex(colors[hash]);
          child.material.roughness = 0.75;
          child.material.metalness = 0.0;
        }
        // Chrome / Industrial Metal
        if (matName.includes('metal') || matName.includes('chrome') || matName.includes('silver') || 
            meshName.includes('lamp') || meshName.includes('frame')) {
          child.material.color.setHex(0xffffff);
          child.material.metalness = 0.95;
          child.material.roughness = 0.15;
        }
        // Glass / Screen Glow
        if (matName.includes('creen') || matName.includes('glass') || matName.includes('display')) {
          child.material.roughness = 0.01;
          child.material.metalness = 0.4;
          child.material.emissive.setHex(0x001144); 
          child.material.emissiveIntensity = 6; 
        }
        // Wall Lamps (ON at night, OFF during day)
        if (matName.includes('wall') && (matName.includes('lamp') || matName.includes('light'))) {
          child.material.emissive.setHex(0xffaa00);
          child.material.emissiveIntensity = isNight ? 35 : 0;
        }
        // Shelf Tubelights & Table Lamp (Always OFF as requested, unless it's night then maybe a subtle glow)
        if ((matName.includes('lamp') || matName.includes('light')) && !matName.includes('wall')) {
          child.material.emissiveIntensity = isNight ? 5 : 0;
        }

        if (matName.includes('laptop') || meshName.includes('laptop') || 
            matName.includes('screen') || meshName.includes('screen') ||
            matName.includes('monitor') || meshName.includes('monitor') ||
            matName.includes('display') || meshName.includes('display')) {
          found.push(child);
        }
      }
    });
    
    laptopMeshes.current = found;
    console.log('Laptop meshes found:', found.map(m => `${m.name} (mat: ${m.material?.name})`));
    
    if (found.length === 0) {
      console.log('No laptop meshes found. All mesh names:');
      scene.traverse((child) => {
        if (child.isMesh) {
          console.log(`  Mesh: "${child.name}" | Material: "${child.material?.name}"`);
        }
      });
    }
  }, [scene, isNight]);

  const isLaptopMesh = useCallback((clickedObj) => {
    return laptopMeshes.current.some(m => m === clickedObj || m.uuid === clickedObj?.uuid);
  }, []);

  const handlePointerMove = useCallback((e) => {
    e.stopPropagation();
    if (isLaptopMesh(e.object)) {
      document.body.style.cursor = 'pointer';
      setHoveringLaptop(true);
    }
  }, [isLaptopMesh]);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
    setHoveringLaptop(false);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isLaptopMesh(e.object)) {
      onLaptopClick(e.point);
    }
  }, [onLaptopClick, isLaptopMesh]);

  return (
    <group 
      ref={modelRef}
      scale={scale}
      dispose={null} 
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <primitive object={scene} />
      {hoveringLaptop && (
        <Html center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{ 
            fontFamily: "'Audiowide', sans-serif",
            color: '#fff', 
            background: 'rgba(0,0,0,0.65)', 
            backdropFilter: 'blur(12px)',
            padding: '12px 24px', 
            borderRadius: '10px', 
            fontSize: '12px', 
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            CLICK TO ENTER ETHCR4CK
          </div>
        </Html>
      )}
    </group>
  );
}

// Cinematic Zoom rig
function CameraRig({ zoomTarget, onEnterPortal, isPortalActive, onResetComplete, cinematicTarget }) {
  const hasEnteredRef = useRef(false);
  const prevPortalActive = useRef(isPortalActive);
  const isReturning = useRef(false);
  const defaultPos = useRef(new THREE.Vector3(4, 4, 8));
  const cinematicLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const prevCinematicTarget = useRef(cinematicTarget);

  useFrame((state) => {
    // ── Detect cinematic ending → re-enable controls but stay at desk ──
    if (prevCinematicTarget.current && !cinematicTarget) {
      if (state.controls) {
        state.controls.enabled = true;
        state.controls.autoRotate = false;
      }
    }
    prevCinematicTarget.current = cinematicTarget;

    // ── Cinematic camera drive (overrides everything when active) ──
    if (cinematicTarget && !zoomTarget && !isReturning.current) {
      const targetPos = new THREE.Vector3(...cinematicTarget.pos);
      const lookPos = new THREE.Vector3(...cinematicTarget.look);
      
      state.camera.position.lerp(targetPos, 0.025);
      cinematicLookAt.current.lerp(lookPos, 0.025);
      state.camera.lookAt(cinematicLookAt.current);
      
      if (state.controls) {
        state.controls.enabled = false;
        state.controls.autoRotate = false;
      }
      return;
    }

    // Detect portal exit: was active, now not → fly back to desk sitting position
    if (prevPortalActive.current && !isPortalActive) {
      isReturning.current = true;
      hasEnteredRef.current = false;
    }
    prevPortalActive.current = isPortalActive;

    // Smoothly fly camera back to chair-sitting position
    if (isReturning.current) {
      // Top-right view: desk, laptop, chair visible
      const chairPos = new THREE.Vector3(4, 3.5, 5);
      const chairLook = new THREE.Vector3(0, 0, 0);
      state.camera.position.lerp(chairPos, 0.04);
      cinematicLookAt.current.lerp(chairLook, 0.04);
      state.camera.lookAt(cinematicLookAt.current);
      
      if (state.camera.position.distanceTo(chairPos) < 0.2) {
        isReturning.current = false;
        if (state.controls) {
          state.controls.enabled = true;
          state.controls.autoRotate = false;
        }
        onResetComplete();
      }
    }

    // Zoom into laptop screen — approach from the FRONT of the screen
    if (zoomTarget && !hasEnteredRef.current && !isReturning.current) {
      if (state.controls) {
        state.controls.enabled = false;
        state.controls.autoRotate = false;
      }

      // Position camera in front of the screen, at screen height
      const targetPos = new THREE.Vector3(zoomTarget.x, zoomTarget.y + 0.1, zoomTarget.z - 1.5);
      state.camera.position.lerp(targetPos, 0.04);

      const lookTarget = new THREE.Vector3().copy(zoomTarget);
      state.camera.lookAt(lookTarget);

      if (state.camera.position.distanceTo(targetPos) < 0.3) {
        hasEnteredRef.current = true;
        onEnterPortal();
      }
    }
  });
  return null;
}

// Loading progress tracker — passes progress to parent
function LoadingProgress({ onProgress }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);
  return null;
}

export default function SciFiBackground({ onEnterPortal, onExitPortal, isPortalActive, cinematicTarget, onLoadProgress, isNight }) {
  const [zoomTarget, setZoomTarget] = useState(null);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      zIndex: -2,
      filter: isPortalActive ? 'brightness(0.2) blur(12px)' : 'none',
      transition: 'filter 2.5s ease-in-out'
    }}>
      <Canvas 
        camera={{ position: [4, 4, 8], fov: 40 }} 
        eventSource={document.body} 
        eventPrefix="client"
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        shadows
      >
        <RendererConfig />
        <LoadingProgress onProgress={onLoadProgress} />
        
        <color attach="background" args={[isNight ? '#020101' : '#a2c2e8']} />
        <fog attach="fog" args={[isNight ? '#020101' : '#a2c2e8', 5, isNight ? 20 : 40]} />

        {/* Global Mood */}
        <ambientLight intensity={isNight ? 0.8 : 1.5} color={isNight ? "#ffcca8" : "#ffffff"} />
        
        {/* Sky/Sun/Moon Light */}
        <directionalLight 
          position={isNight ? [10, 15, -10] : [5, 20, 15]} 
          intensity={isNight ? 1.8 : 4.5} 
          color={isNight ? "#d0e0ff" : "#fff7e6"} 
          castShadow
          shadow-bias={-0.0005}
        />

        {/* --- Primary Light Sources: Wall Lamps --- */}
        {isNight && (
          <>
            {/* Left Back Wall Lamp */}
            <pointLight position={[-6, 5, -5.5]} intensity={45} color="#ff9900" distance={15} decay={2} castShadow={true} />
            {/* Right Back Wall Lamp */}
            <pointLight position={[6, 5, -5.5]} intensity={45} color="#ff9900" distance={15} decay={2} castShadow={true} />
            {/* Main Wall Strip */}
            <pointLight position={[0, 4, -7.5]} intensity={35} color="#ff4400" distance={20} decay={2} />
          </>
        )}

        {/* --- Screen Glow for physics reflections on desk --- */}
        <pointLight position={[0.5, 0.3, 1.8]} intensity={8} color="#4488ff" distance={5} decay={2} />
        
        {/* Environment map removed to prevent CDN fetch failures */}

        <Suspense fallback={null}>
          <group position={[0, -2.5, 0]}>
            <Model scale={3} isNight={isNight} onLaptopClick={(point) => !isPortalActive && setZoomTarget(point)} />

            <ContactShadows 
              position={[0, -0.05, 0]} 
              opacity={0.6} 
              scale={25} 
              blur={3} 
              far={12} 
              color="#1a0800"
            />
          </group>
        </Suspense>

        <OrbitControls 
          enableZoom={true}
          zoomSpeed={0.6}
          minDistance={1.5}
          maxDistance={18}
          enablePan={false}
          autoRotate={false}
          autoRotateSpeed={0.25}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minPolarAngle={Math.PI / 6}
          enableDamping={true}
          dampingFactor={0.05}
          makeDefault
        />
        
        <CameraRig 
          zoomTarget={zoomTarget} 
          onEnterPortal={onEnterPortal} 
          isPortalActive={isPortalActive}
          onResetComplete={() => setZoomTarget(null)}
          cinematicTarget={cinematicTarget}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/ceo-office-draco.glb');
