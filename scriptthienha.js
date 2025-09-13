// Khởi tạo biến toàn cục
let scene, camera, renderer, controls;
let planet, textRings = [], particles;
let composer;
let bloomPass;
let clock = new THREE.Clock();
let font;
let ringGroup, glowSphere;

// Thiết lập cảnh
function init() {
    // Tạo scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    // Tạo camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, 20);

    // Tạo renderer với cấu hình tối ưu
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Thêm ánh sáng nâng cấp
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ánh sáng hồng để tạo không khí lãng mạn
    const pinkLight = new THREE.PointLight(0xff69b4, 2, 50);
    pinkLight.position.set(0, 0, 8);
    scene.add(pinkLight);

    // Tạo hành tinh
    createPlanet();

    // --- 1. Tạo sprite ảnh bay quanh hành tinh ---
    const textureLoader = new THREE.TextureLoader();
    const heartTexture = textureLoader.load('https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1MkNRv.img?w=768&h=1024&m=6&x=284&y=317&s=131&d=131'); // Thay đường dẫn ảnh của bạn

    const heartSpriteMaterial = new THREE.SpriteMaterial({
        map: heartTexture,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const heartSprite = new THREE.Sprite(heartSpriteMaterial);
    heartSprite.scale.set(1.5, 1.5, 1.5); // Kích thước ảnh, bạn chỉnh tùy ý
    scene.add(heartSprite);

    // --- 2. Biến điều khiển quỹ đạo ---
    let heartAngle = 0;
    const heartOrbitRadius = 7; // Bán kính quỹ đạo quanh hành tinh

    // --- 3. Hàm cập nhật vị trí ảnh và hướng về camera ---
    function updateHeartSprite(deltaTime) {
        heartAngle += deltaTime * 0.5; // Tốc độ quay (radian/giây)

        const x = heartOrbitRadius * Math.cos(heartAngle);
        const z = heartOrbitRadius * Math.sin(heartAngle);
        const y = 1; // Đặt cao hơn hành tinh một chút

        heartSprite.position.set(x, y, z);

        // Luôn hướng về camera
        heartSprite.lookAt(camera.position);
    }

    // --- 4. Hàm cập nhật sprite ảnh quanh hành tinh ---
    function animateHeartSprite() {
        const deltaTime = clock.getDelta();
        updateHeartSprite(deltaTime);
        requestAnimationFrame(animateHeartSprite);
    }




    // Tạo các vòng chữ
    createTextRings();

    // Tạo trường sao
    createStarfield();

    // Thêm điều khiển
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 200;

    // Xử lý sự kiện resize
    window.addEventListener('resize', onWindowResize);

    // Thiết lập UI controls nếu có
    const bloomSlider = document.getElementById('bloom');
    const rotationSlider = document.getElementById('rotation');
    const resetBtn = document.getElementById('reset');

    if (bloomSlider) bloomSlider.addEventListener('input', updateBloom);
    if (rotationSlider) rotationSlider.addEventListener('input', updateRotation);
    if (resetBtn) resetBtn.addEventListener('click', resetControls);

    // Ẩn màn hình loading nếu có
    const loading = document.querySelector('.loading');
    if (loading) loading.style.display = 'none';

    // Bắt đầu animation
    animate();
}

// Tạo hành tinh với hiệu ứng nâng cấp
function createPlanet() {
    const geometry = new THREE.SphereGeometry(4, 64, 64);

    // Material hành tinh với hiệu ứng lấp lánh
    const material = new THREE.MeshStandardMaterial({
        color: 0xffb6c1,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xff1493,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.95
    });

    planet = new THREE.Mesh(geometry, material);
    planet.castShadow = true;
    planet.receiveShadow = true;
    scene.add(planet);

    // Tạo hiệu ứng hào quang với animation
    const glowGeometry = new THREE.SphereGeometry(4.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff69b4,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });
    glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowSphere);

    // Tạo vành đai như sao Thổ
    ringGroup = new THREE.Group();

    // Vành đai chính
    const ringGeometry = new THREE.RingGeometry(5.5, 7.5, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffb6c1,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const mainRing = new THREE.Mesh(ringGeometry, ringMaterial);
    mainRing.rotation.x = Math.PI / 2;
    ringGroup.add(mainRing);

    // Vành đai phụ
    const thinRingGeometry = new THREE.RingGeometry(8, 8.8, 64);
    const thinRingMaterial = new THREE.MeshBasicMaterial({
        color: 0xff69b4,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const thinRing = new THREE.Mesh(thinRingGeometry, thinRingMaterial);
    thinRing.rotation.x = Math.PI / 2;
    ringGroup.add(thinRing);

    // Vành đai trong
    const innerRingGeometry = new THREE.RingGeometry(4.8, 5.2, 64);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc0cb,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = Math.PI / 2;
    ringGroup.add(innerRing);

    scene.add(ringGroup);

    // Thêm particles lấp lánh xung quanh hành tinh
    createPlanetParticles();
}

// Tạo particles xung quanh hành tinh
function createPlanetParticles() {
    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const radius = 6 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        // Màu hồng với độ sáng khác nhau
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.4;
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    const planetParticles = new THREE.Points(particles, particleMaterial);
    scene.add(planetParticles);

    // Lưu reference để animate
    planet.particles = planetParticles;
}

// Tạo các vòng chữ được sửa lỗi
function createTextRings() {
    const ringConfigs = [
        {
            radius: 12,
            text: "💖 I LOVE YOU 💖",
            color: '#ff1493',
            fontSize: 120,
            yOffset: 2
        },
        {
            radius: 16,
            text: "✨✨",
            color: '#ff69b4',
            fontSize: 100,
            yOffset: -1
        },
        {
            radius: 20,
            text: "💖💖",
            color: '#ffb6c1',
            fontSize: 80,
            yOffset: 1.5
        }
    ];

    ringConfigs.forEach((config, i) => {
        // Tạo canvas với độ phân giải cao
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 3072;  // Tăng độ phân giải
        canvas.height = 512;

        // Làm mịn canvas
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        // Gradient cho text
        const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, config.color);
        gradient.addColorStop(0.3, '#ffffff');
        gradient.addColorStop(0.7, '#ffffff');
        gradient.addColorStop(1, config.color);

        // Hiệu ứng glow
        context.shadowColor = config.color;
        context.shadowBlur = 20;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;

        // Font và style
        context.fillStyle = gradient;
        context.font = `Bold ${config.fontSize}px "Comic Sans MS", cursive`;
        context.textAlign = 'left';
        context.textBaseline = 'middle';

        // Tính toán spacing cho text
        const textMetrics = context.measureText(config.text);
        const textWidth = textMetrics.width;
        const spacing = textWidth + 50;
        const repeatCount = Math.ceil(canvas.width / spacing) + 1;

        // Vẽ text lặp lại
        for (let j = 0; j < repeatCount; j++) {
            const x = j * spacing;

            // Text chính với gradient
            context.fillStyle = gradient;
            context.fillText(config.text, x, canvas.height / 2);

            // Outline trắng
            context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            context.lineWidth = 2;
            context.strokeText(config.text, x, canvas.height / 2);
        }

        // Tạo texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;



        // Tạo geometry torus
        const geometry = new THREE.TorusGeometry(config.radius, 0.8, 20, 100);

        // Material với hiệu ứng phát sáng
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const ring = new THREE.Mesh(geometry, material);

        // Đặt vị trí và xoay
        ring.position.y = config.yOffset;
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;

        // Lưu thông tin animation
        ring.userData = {
            speed: 0.001 + Math.random() * 0,
            floatSpeed: 0.01 + Math.random() * 0.01,
            floatAmplitude: 0.5 + Math.random() * 0.2,
            pulseSpeed: 0.1 + Math.random() * 0.5,
            originalOpacity: material.opacity,
            originalY: config.yOffset,
            textureOffset: 0,
            textureSpeed: 0.0001 + Math.random() * 0.0007
        };

        scene.add(ring);
        textRings.push(ring);
    });
}

// Tạo trường sao nâng cấp
function createStarfield() {
    const particlesCount = 3000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);

    for (let i = 0; i < particlesCount; i++) {
        // Vị trí ngẫu nhiên trong không gian cầu
        const radius = 50 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        // Màu sắc với bias hồng
        if (Math.random() < 0.3) {
            // 30% là sao hồng
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.4 + Math.random() * 0.4;
            colors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
        } else {
            // 70% là sao trắng/xanh
            colors[i * 3] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
        }

        // Kích thước ngẫu nhiên
        sizes[i] = Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// Cập nhật kích thước khi window thay đổi
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Cập nhật hiệu ứng bloom
function updateBloom(e) {
    if (bloomPass) {
        bloomPass.strength = parseFloat(e.target.value);
    }
}

// Cập nhật tốc độ xoay
function updateRotation(e) {
    const speed = parseFloat(e.target.value);
    textRings.forEach(ring => {
        ring.userData.speed = (0.005 + Math.random() * 0.01) * speed;
    });
}

// Đặt lại controls
function resetControls() {
    const bloomSlider = document.getElementById('bloom');
    const rotationSlider = document.getElementById('rotation');

    if (bloomSlider) bloomSlider.value = 1;
    if (rotationSlider) rotationSlider.value = 1;

    if (bloomPass) {
        bloomPass.strength = 1;
    }

    textRings.forEach(ring => {
        ring.userData.speed = 0.005 + Math.random() * 0.01;
    });
}

let heartParticlesGroup;

function createHeartParticles() {
    heartParticlesGroup = new THREE.Group();

    // Tạo shape trái tim 2D
    const x = 0, y = 0;
    const heartShape = new THREE.Shape();

    heartShape.moveTo(x + 0, y + 0);
    heartShape.bezierCurveTo(x + 0, y + 0, x - 1, y + 1.5, x - 2, y + 1.5);
    heartShape.bezierCurveTo(x - 4, y + 1.5, x - 4, y - 0.5, x - 4, y - 0.5);
    heartShape.bezierCurveTo(x - 4, y - 3, x - 1, y - 3, x + 0, y - 1);
    heartShape.bezierCurveTo(x + 1, y - 3, x + 4, y - 3, x + 4, y - 0.5);
    heartShape.bezierCurveTo(x + 4, y - 0.5, x + 4, y + 1.5, x + 2, y + 1.5);
    heartShape.bezierCurveTo(x + 1, y + 1.5, x + 0, y + 0, x + 0, y + 0);

    // Tạo geometry 3D từ shape (extrude)
    const extrudeSettings = {
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 2
    };
    const heartGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    // Material màu hồng lấp lánh
    const heartMaterial = new THREE.MeshStandardMaterial({
        color: 0xff69b4,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xff1493,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
    });

    const heartCount = 50;

    for (let i = 0; i < heartCount; i++) {
        const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);

        // Kích thước nhỏ ngẫu nhiên
        const scale = 0.1 + Math.random() * 0.15;
        heartMesh.scale.set(scale, scale, scale);

        // Vị trí ngẫu nhiên trong vùng quanh hành tinh (bán kính 6 - 12)
        const radius = 6 + Math.random() * 6;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        heartMesh.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );

        // Góc xoay ngẫu nhiên ban đầu
        heartMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Lưu dữ liệu animation riêng cho mỗi trái tim
        heartMesh.userData = {
            floatSpeed: 0.5 + Math.random(),
            floatAmplitude: 0.1 + Math.random() * 0.1,
            rotationSpeed: 0.01 + Math.random() * 0.02,
            baseY: heartMesh.position.y,
            pulseSpeed: 2 + Math.random() * 3,
            pulsePhase: Math.random() * Math.PI * 2
        };

        heartParticlesGroup.add(heartMesh);
    }

    scene.add(heartParticlesGroup);
}

// Trong hàm animate(), thêm đoạn cập nhật animation cho trái tim 3D nhỏ:
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Cập nhật vị trí ảnh bay (nếu có)
    if (typeof updateHeartSprite === 'function') {
        updateHeartSprite(delta);
    }

    // Animation hành tinh, hào quang, vòng chữ, particles ... (giữ nguyên)

    // Animation trái tim 3D nhỏ lấp lánh bay quanh hành tinh
    if (heartParticlesGroup) {
        heartParticlesGroup.children.forEach((heart) => {
            // Xoay nhẹ
            heart.rotation.x += heart.userData.rotationSpeed;
            heart.rotation.y += heart.userData.rotationSpeed * 0.7;

            // Hiệu ứng float lên xuống
            heart.position.y = heart.userData.baseY + Math.sin(time * heart.userData.floatSpeed) * heart.userData.floatAmplitude;

            // Hiệu ứng pulse opacity lấp lánh
            heart.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(time * heart.userData.pulseSpeed + heart.userData.pulsePhase));
        });
    }

    // Các animation khác...

    controls.update();
    renderer.render(scene, camera);
}




// Hàm animation nâng cấp
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Xoay hành tinh với hiệu ứng pulse
    if (planet) {
        planet.rotation.y += 0.003;
        planet.rotation.x += 0.001;

        // Hiệu ứng emissive pulse
        planet.material.emissiveIntensity = 0.2 + Math.sin(time * 2) * 0.1;
    }

    // Animation hào quang
    if (glowSphere) {
        glowSphere.material.opacity = 0.3 + Math.sin(time * 1.5) * 0.1;
        glowSphere.rotation.y += 0.005;
    }

    // Animation vành đai
    if (ringGroup) {
        ringGroup.rotation.z += 0.002;
        ringGroup.rotation.y += 0.001;
    }

    // Animation particles hành tinh
    if (planet && planet.particles) {
        planet.particles.rotation.y += 0.008;
        planet.particles.rotation.x += 0.003;
    }

    // Cập nhật các vòng chữ với animation mượt mà
    textRings.forEach((ring, index) => {
        const userData = ring.userData;

        // Xoay vòng
        ring.rotation.y += userData.speed;

        // Hiệu ứng float
        ring.position.y = userData.originalY +
            Math.sin(time * userData.floatSpeed + index * 1.5) * userData.floatAmplitude;

        // Hiệu ứng pulse opacity
        ring.material.opacity = userData.originalOpacity +
            Math.sin(time * userData.pulseSpeed + index * 0.8) * 0.2;

        // Di chuyển texture để tạo hiệu ứng text chảy
        if (ring.material.map) {
            userData.textureOffset += userData.textureSpeed;
            ring.material.map.offset.x = userData.textureOffset;
        }

        // Hiệu ứng nghiêng nhẹ
        ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.5 + index) * 0.05;
    });

    // Cập nhật particles trường sao
    if (particles) {
        particles.rotation.x += 0.0002;
        particles.rotation.y += 0.0005;
        particles.rotation.z += 0.0001;
    }

    // Cập nhật controls
    controls.update();

    // Render
    renderer.render(scene, camera);

    // Tạo ảnh bay xung quanh hành tinh trung tâm
    const textureLoader = new THREE.TextureLoader();
    const imageTexture = textureLoader.load('https://example.com/image.jpg'); // Thay đường dẫn ảnh của bạn

    const imageGeometry = new THREE.PlaneGeometry(2, 2);
    const imageMaterial = new THREE.MeshBasicMaterial({
        map: imageTexture,
        transparent: true,
        opacity: 0.5,
    });
    const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);

    // Thêm ảnh vào cảnh
    scene.add(imageMesh);




}




// Khởi tạo ứng dụng
init();