import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ModelRotation = {
  x: number;
  y: number;
};

type ThreeModelViewerProps = {
  modelUrl: string;
  rotation: ModelRotation;
  scale: number;
  selectedHotspotTarget?: string;
  thumbnail?: boolean;
  onHotspotsDiscovered?: (
    hotspots: Array<{ id: string; label: string; target: string }>,
  ) => void;
};

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function ThreeModelViewer({
  modelUrl,
  rotation,
  scale,
  selectedHotspotTarget,
  thumbnail = false,
  onHotspotsDiscovered,
}: ThreeModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const hotspotDiscoveryRef = useRef(onHotspotsDiscovered);
  const [loadedVersion, setLoadedVersion] = useState(0);

  useEffect(() => {
    hotspotDiscoveryRef.current = onHotspotsDiscovered;
  }, [onHotspotsDiscovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const interactionGroup = new THREE.Group();
    const modelPivot = new THREE.Group();
    interactionGroup.add(modelPivot);
    groupRef.current = interactionGroup;
    scene.add(interactionGroup);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const loader = new GLTFLoader();
    let loadedRoot: THREE.Object3D | null = null;
    let modelContainer: THREE.Group | null = null;
    let frameId = 0;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const fitLoadedModel = () => {
      if (!modelContainer) return;

      // Leave the model's original transforms unchanged. The wrapper positions
      // and scales the whole model in the viewer.
      modelContainer.position.set(0, 0, 0);
      modelContainer.scale.set(1, 1, 1);
      modelPivot.position.set(0, 0, 0);
      modelPivot.scale.set(1, 1, 1);
      modelPivot.updateMatrixWorld(true);

      let box = new THREE.Box3().setFromObject(modelContainer);
      if (box.isEmpty()) return;

      const center = box.getCenter(new THREE.Vector3());
      modelContainer.position.sub(center);
      modelPivot.updateMatrixWorld(true);

      box = new THREE.Box3().setFromObject(modelContainer);
      const size = box.getSize(new THREE.Vector3());
      const normalizedSize = Math.max(size.x, size.y, size.z, 0.001);
      modelContainer.scale.setScalar(2 / normalizedSize);
      modelPivot.updateMatrixWorld(true);

      // Use both dimensions so tall and wide models fit with the same padding.
      box = new THREE.Box3().setFromObject(modelContainer);
      const fittedCenter = box.getCenter(new THREE.Vector3());
      modelContainer.position.sub(fittedCenter);
      modelPivot.updateMatrixWorld(true);

      box = new THREE.Box3().setFromObject(modelContainer);
      const fittedSize = box.getSize(new THREE.Vector3());
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const distanceForHeight = fittedSize.y / (2 * Math.tan(verticalFov / 2));
      const distanceForWidth = fittedSize.x / (2 * Math.tan(horizontalFov / 2));
      const distance = Math.max(distanceForHeight, distanceForWidth, fittedSize.z * 0.7, 1) * 1.32;

      camera.near = Math.max(0.01, distance / 100);
      camera.far = distance * 100;
      camera.position.set(0, 0, distance + fittedSize.z / 2);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    loader.load(modelUrl, (gltf) => {
      loadedRoot = gltf.scene;
      modelPivot.clear();
      modelContainer = new THREE.Group();
      modelContainer.add(loadedRoot);
      modelPivot.add(modelContainer);
      resize();
      fitLoadedModel();

      const meshes: THREE.Mesh[] = [];
      loadedRoot.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
      });

      // Give each mesh its own material so highlighting one part does not
      // change another part that happens to share the same material.
      meshes.forEach((mesh) => {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((material) => material.clone())
          : mesh.material.clone();
      });
      meshesRef.current = meshes;
      setLoadedVersion((version) => version + 1);

      // Uploaded models have no hotspot data, so each visible mesh becomes a
      // selectable hotspot automatically.
      hotspotDiscoveryRef.current?.(
        meshes.map((mesh, index) => {
          const target = `mesh-${index}`;
          mesh.userData.hotspotTarget = target;
          return {
            id: target,
            label:
              meshes.length === 1
                ? "Whole model"
                : mesh.name || `Part ${index + 1}`,
            target,
          };
        }),
      );

      // The browser may finish sizing the WebGL view a moment later. Fit again
      // so a newly uploaded model is not cut off.
      window.requestAnimationFrame(() => {
        resize();
        fitLoadedModel();
      });
    });

    const render = () => {
      frameId = window.requestAnimationFrame(render);
      renderer.render(scene, camera);
    };

    resize();
    render();
    window.addEventListener("resize", resize);
    const resizeObserver = new ResizeObserver(() => {
      resize();
      fitLoadedModel();
    });
    resizeObserver.observe(parent);

    return () => {
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      if (loadedRoot) {
        disposeObject(loadedRoot);
      }
      meshesRef.current = [];
      renderer.dispose();
      groupRef.current = null;
    };
  }, [modelUrl]);

  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.rotation.x = THREE.MathUtils.degToRad(rotation.x);
    groupRef.current.rotation.y = THREE.MathUtils.degToRad(rotation.y);
    groupRef.current.scale.setScalar(scale);
  }, [rotation, scale]);

  useEffect(() => {
    meshesRef.current.forEach((mesh) => {
      const isSelected = mesh.userData.hotspotTarget === selectedHotspotTarget;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material) => {
        if ("emissive" in material && material.emissive instanceof THREE.Color) {
          if (material.userData.originalEmissive === undefined) {
            material.userData.originalEmissive = material.emissive.getHexString();
            material.userData.originalEmissiveIntensity =
              "emissiveIntensity" in material ? material.emissiveIntensity : 0;
          }

          material.emissive.set(
            isSelected
              ? "#facc15"
              : `#${material.userData.originalEmissive as string}`,
          );
          if ("emissiveIntensity" in material) {
            material.emissiveIntensity = isSelected
              ? 0.5
              : (material.userData.originalEmissiveIntensity as number);
          }
        } else if ("color" in material && material.color instanceof THREE.Color) {
          if (material.userData.originalColor === undefined) {
            material.userData.originalColor = material.color.getHexString();
          }
          material.color.set(
            isSelected
              ? "#facc15"
              : `#${material.userData.originalColor as string}`,
          );
        }
      });
    });
  }, [loadedVersion, selectedHotspotTarget]);

  return (
    <canvas
      aria-hidden={thumbnail}
      className={`three-model-canvas${thumbnail ? " three-model-thumbnail" : ""}`}
      ref={canvasRef}
    />
  );
}

export default ThreeModelViewer;
