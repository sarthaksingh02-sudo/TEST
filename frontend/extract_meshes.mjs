import { NodeIO } from '@gltf-transform/core';

async function run() {
  const io = new NodeIO();
  const document = await io.read('public/untitled.glb');
  
  const root = document.getRoot();
  console.log("Meshes found:");
  root.listNodes().forEach(node => {
     const mesh = node.getMesh();
     if (mesh) {
       console.log(" - " + (node.getName() || mesh.getName() || 'unnamed'));
     }
  });
}
run();
