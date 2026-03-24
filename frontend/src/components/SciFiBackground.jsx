import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, Html } from '@react-three/drei';
import { MTLLoader, OBJLoader } from 'three-stdlib';
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

function Model({ onLaptopClick, scale = 1 }) {
  const materials = useLoader(MTLLoader, '/uploads_files_3174279_CEO+Office+Design.mtl');
  const obj = useLoader(OBJLoader, '/uploads_files_3174279_CEO+Office+Design.obj', (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });
  const modelRef = useRef();
  const [hoveringLaptop, setHoveringLaptop] = useState(false);
  const laptopMeshes = useRef([]);

  useEffect(() => {
    if (!obj) return;
    const found = [];
    
    obj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Keep original MTL materials — they already look great!
        // Just identify laptop-related meshes for click detection
        const matName = (child.material?.name || '').toLowerCase();
        const meshName = (child.name || '').toLowerCase();
        
        if (matName.includes('laptop') || meshName.includes('laptop') || 
            matName.includes('screen') || meshName.includes('screen') ||
            matName.includes('monitor') || meshName.includes('monitor') ||
            matName.includes('display') || meshName.includes('display')) {
          found.push(child);
        }
      }
    });
    
    laptopMeshes.current = found;
    
    // Log found meshes for debugging
    console.log('Laptop meshes found:', found.map(m => `${m.name} (mat: ${m.material?.name})`));
    
    // If no laptop meshes found by name, log all mesh names to help identify
    if (found.length === 0) {
      console.log('No laptop meshes found. All mesh names:');
      obj.traverse((child) => {
        if (child.isMesh) {
          console.log(`  Mesh: "${child.name}" | Material: "${child.material?.name}"`);
        }
      });
    }
  }, [obj]);

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
      <primitive object={obj} />
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

export default function SciFiBackground({ onEnterPortal, onExitPortal, isPortalActive, cinematicTarget }) {
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
        
        <color attach="background" args={['#080604']} />
        <fog attach="fog" args={['#080604', 20, 40]} />

        {/* Warm cinematic lighting — dark, rich, vibrant */}
        <ambientLight intensity={0.8} color="#ffecd2" />
        
        {/* Key Light — strong warm gold */}
        <directionalLight 
          position={[8, 12, 6]} 
          intensity={3.5} 
          color="#e6a040" 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        {/* Fill Light — deep amber */}
        <directionalLight position={[-8, 6, -4]} intensity={1.5} color="#cc7722" />
        {/* Rim Light — warm backlight */}
        <directionalLight position={[0, 8, -10]} intensity={1.2} color="#ffcc80" />
        
        {/* Warm practicals — shelf strips, desk lamp feel */}
        <pointLight position={[3, 5, 2]} intensity={6} color="#e68a00" distance={18} decay={2} />
        <pointLight position={[-3, 4, -2]} intensity={4} color="#cc6600" distance={14} decay={2} />
        {/* Subtle cool accent for depth contrast */}
        <pointLight position={[0, 2, 5]} intensity={1} color="#4466aa" distance={8} decay={2} />
        
        <Environment preset="apartment" />

        <Suspense fallback={null}>
          <group position={[0, -2.5, 0]}>
            <Model scale={3} onLaptopClick={(point) => !isPortalActive && setZoomTarget(point)} />

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
