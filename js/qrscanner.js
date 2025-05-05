// qrscanner.js (atualizado)
import QrScanner from 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/+esm';
import QuizSystem from './quiz.js';

import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';


// Função para calcular a distância entre dois pontos (fórmula de Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
}

function toRad(value) {
    return value * Math.PI / 180;
}

class ParkARScanner {
    constructor() {
        this.scanner = null;
        this.videoElem = null;
        this.scannerOverlay = document.getElementById('scanner-overlay');
        this.contentDisplay = document.getElementById('content-display');
        this.locationData = null;
        this.quizSystem = null;
        this.totalLocations = 0;
    }

    initializeMap() {
        console.log('Initializing map...');

        if (!this.map) {
            this.map = L.map('map').setView([-27.63463, -52.26478], 19);
    
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
    
            console.log('Map initialized');
        } else {
            console.log('Map already initialized');
        }

    }

    async initialize() {

        this.initializeMap();

        document.getElementById('start-scan').addEventListener('click', () => {
            const playerNameInput = document.getElementById('player-name');
            const playerName = playerNameInput.value.trim() || 'Explorador';
            localStorage.setItem('playerName', playerName);
        
            // Esconde a tela inicial e mostra o mapa
            document.getElementById('intro-screen').classList.add('hidden');
            document.getElementById('map-screen').style.display = 'flex';

            setTimeout(() => {
                this.map.invalidateSize(); // Ensure the map renders correctly
            }, 100);
        
            // Inicializa o mapa
            this.displayMapWithPoint();
        });

        document.getElementById('start-camera').addEventListener('click', () => {
            document.getElementById('map-screen').style.display = 'none';
            document.getElementById('scanner-overlay').classList.add('active');
            this.startScanner(); // Inicializa o scanner
        });

        // Inicializar contadores
        this.updateScore();

        // Carregar dados dos pontos do parque
        try {
            const response = await fetch('data/locations.json');
            this.locationData = await response.json();
            this.totalLocations = this.locationData.length;
            console.log('Dados dos pontos carregados:', this.locationData);
            this.updateProgress();
        } catch (error) {
            console.error('Erro ao carregar dados dos pontos:', error);
            this.showNotification('Não foi possível carregar os dados do jogo. Por favor, verifique sua conexão.', 'error');
        }

        // Inicializar câmera
        this.videoElem = document.getElementById('qr-video');
        this.scanner = new QrScanner(
            this.videoElem,
            result => this.handleScan(result),
            { 
                highlightScanRegion: true,
                returnDetailedScanResult: true
            }
        );

        this.quizSystem = new QuizSystem(this);
        await this.quizSystem.initialize();

        // Verificar se há quiz disponível após carregar
        const availableQuizIndex = this.quizSystem.checkQuizAvailability();
        if (availableQuizIndex >= 0) {
            this.showNotification('Quiz desbloqueado! Complete-o para ganhar um badge especial!', 'success');
        }

        // Adicionar eventos para botões de badges e ranking
        document.getElementById('show-badges').addEventListener('click', () => this.quizSystem.showBadges());
        document.getElementById('show-ranking').addEventListener('click', () => this.quizSystem.showRanking());
    }

    async startScanner() {
        try {
            await this.scanner.start();
            this.scannerOverlay.classList.add('active');
            document.getElementById('intro-screen').style.display = 'none';
        } catch (error) {
            console.error('Erro ao iniciar scanner:', error);
            this.showNotification('Não foi possível acessar a câmera. Por favor, verifique as permissões.', 'error');
        }
    }

    stopScanner() {
        if (this.scanner) {
            this.scanner.stop();
            this.scannerOverlay.classList.remove('active');
        }
    }

    handleScan(result) {
        this.stopScanner();
        
        const qrData = result.data;
        console.log('QR Code detectado:', qrData);
        
        // Verificar se o código QR corresponde a um ponto no parque
        const locationInfo = this.locationData.find(location => location.id === qrData);
        
        if (locationInfo) {
            if (locationInfo.has3DModel) {
                this.display3DModel(locationInfo); // Exibe o modelo 3D
            } else {
                this.displayLocationContent(locationInfo); // Exibe conteúdo padrão
            }
        } else {
            this.showNotification('QR Code não reconhecido. Tente outro ponto do parque.', 'warning');
            setTimeout(() => this.startScanner(), 2000);
        }
    }

    displayLocationContent(location) {
        this.contentDisplay.innerHTML = `
            <div class="location-content">
                <h2>${location.title}</h2>
                <img src="${location.image}" alt="${location.title}" class="location-image">
                <p>${location.description}</p>
                <div class="cultural-info">
                    <h3>Relevância Cultural</h3>
                    <p>${location.culturalInfo}</p>
                </div>
                ${location.hasInteraction ? 
                    `<div class="interaction">
                        <button id="interact-btn">Interagir</button>
                    </div>` : ''}
                <button id="continue-btn">Continuar Explorando</button>
            </div>
        `;

        document.getElementById('continue-btn').addEventListener('click', () => {
            // Clear the content display
            this.contentDisplay.innerHTML = '';
            document.getElementById('content-display').classList.add('hidden'); // Hide the content display
            document.getElementById('map-screen').classList.remove('hidden'); // Show the map screen
        
            // Display the next point on the map
            this.displayNextPoint();
        });

        

        if (location.hasInteraction) {
            document.getElementById('interact-btn').addEventListener('click', () => {
                this.handleInteraction(location);
            });
        }

        // Marcar local como visitado
        this.markLocationAsVisited(location.id);
    }

    displayNextPoint() {
        console.log('Mostrando o próximo ponto...');
        const visitedLocations = JSON.parse(localStorage.getItem('visitedLocations') || '[]');
        const nextPoint = this.locationData.find(point => !visitedLocations.includes(point.id));

        if (!nextPoint) {
            this.showNotification('Todos os pontos foram descobertos! Parabéns!', 'success');
            return;
        }

        document.getElementById('intro-screen').classList.add('hidden');
        document.getElementById('map-screen').style.display = 'flex';

        this.map.setView([nextPoint.location.lat, nextPoint.location.lng], 16);

        // Add marker for the next point
        // Adicionar marcador para o próximo ponto
        const nextPointMarker = L.marker([nextPoint.location.lat, nextPoint.location.lng]).addTo(this.map)
        .bindPopup(`<b>${nextPoint.title}</b><br>${nextPoint.description}`).openPopup();

        // Add marker for the user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                const userMarker = L.marker([userLat, userLng], {
                    icon: L.icon({
                        iconUrl: 'assets/images/user-icon.png',
                        iconSize: [25, 25]
                    })
                }).addTo(this.map).bindPopup('Você está aqui').openPopup();

                // Adicionar linha de rota entre o usuário e o próximo ponto
                const route = L.polyline(
                    [[userLat, userLng], [nextPoint.location.lat, nextPoint.location.lng]], // Coordenadas da rota
                    {
                        color: 'blue', // Cor da linha
                        weight: 4, // Espessura da linha
                        opacity: 0.7, // Opacidade da linha
                        dashArray: '10, 10' // Linha tracejada
                    }
                ).addTo(this.map);

                this.map.fitBounds(route.getBounds());
            }, error => {
                console.error('Erro ao obter localização do usuário:', error);
                this.showNotification('Não foi possível acessar sua localização. Verifique as permissões.', 'error');
            });
        }

        this.markLocationAsVisited(nextPoint.id);
    }


    handleInteraction(location) {
        console.log(`Interação com ${location.title}`);
        
        // Mini-quiz individual sobre o ponto específico
        const quizHTML = `
            <div class="quiz-container">
                <h3>Quiz: ${location.quiz.question}</h3>
                <div class="options">
                    ${location.quiz.options.map((option, index) => 
                        `<button class="quiz-option" data-index="${index}">${option}</button>`
                    ).join('')}
                </div>
                <div id="quiz-result" class="hidden"></div>
            </div>
        `;
        
        document.querySelector('.interaction').innerHTML = quizHTML;
        
        document.querySelectorAll('.quiz-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const selectedIndex = parseInt(e.target.dataset.index);
                const resultElem = document.getElementById('quiz-result');
                
                if (selectedIndex === location.quiz.correctAnswer) {
                    resultElem.innerHTML = `
                        <div class="correct">Correto! ${location.quiz.explanation}</div>
                    `;
                    // Adicionar pontos ao jogador
                    this.addPoints(50);
                } else {
                    resultElem.innerHTML = `
                        <div class="incorrect">Incorreto. ${location.quiz.explanation}</div>
                    `;
                }
                resultElem.classList.remove('hidden');
            });
        });
    }

    displayMapWithPoint() {
        const mapScreen = document.getElementById('map-screen');
        const introScreen = document.getElementById('intro-screen');
        introScreen.classList.add('hidden');
        mapScreen.classList.remove('hidden');

        // Ensure `this.locationData` is used instead of `pontos`
        const targetPoint = this.locationData[0]; // Example: first point

        const targetLat = targetPoint.location.lat;
        const targetLng = targetPoint.location.lng;
    
        // Adiciona marcador do ponto no mapa
        const targetMarker = L.marker([targetLat, targetLng], {
            icon: L.icon({
                iconUrl: 'assets/icons/point_location.png', // Ícone do ponto
                iconSize: [50, 50]
            })
        }).addTo(this.map);
        targetMarker.bindPopup(`<b>${targetPoint.title}</b><br>${targetPoint.description}`).openPopup();

        // Verificar a localização do usuário
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                // Remover marcadores antigos (se necessário)
                if (this.userMarker) {
                    this.map.removeLayer(this.userMarker);
                }

                // Adicionar marcador do usuário
                this.userMarker = L.marker([userLat, userLng], {
                    icon: L.icon({
                        iconUrl: 'assets/images/user-icon.png', // Ícone do usuário
                        iconSize: [25, 25]
                    })
                }).addTo(this.map);
                this.userMarker.bindPopup('Você está aqui').openPopup();

                // Calcular a distância
                const distance = calculateDistance(userLat, userLng, targetLat, targetLng) * 1000;

                // Adicionar linha de rota com PolylineDecorator
                if (this.route) {
                    this.map.removeLayer(this.route); // Remove a rota antiga
                }
                const route = L.polyline(
                    [[userLat, userLng], [targetLat, targetLng]], // Coordenadas
                    {
                        color: 'green',
                        weight: 4,
                        opacity: 0.7
                    }
                ).addTo(this.map);

                // Adicionar PolylineDecorator para exibir a distância
                const decorator = L.polylineDecorator(route, {
                    patterns: [
                        {
                            offset: '50%', // Exibir no meio da linha
                            repeat: 0,
                            symbol: L.Symbol.marker({
                                markerOptions: {
                                    icon: L.divIcon({
                                        className: 'distance-label',
                                        html: `<b>${distance.toFixed(2)} metros</b>`, // Exibir a distância
                                        iconSize: [50, 20]
                                    })
                                }
                            })
                        }
                    ]
                }).addTo(this.map);

                // Salvar rota para remoção futura
                this.route = route;
    
                if (distance <= 50) {
                    this.showNotification('Você chegou ao ponto! Scanner habilitado.', 'success');
                    navigator.geolocation.clearWatch(watchId);
                    this.startScanner();
                }
            }, error => {
                console.error('Erro ao obter localização do usuário:', error);
                this.showNotification('Não foi possível acessar sua localização. Verifique as permissões.', 'error');
            });
        } else {
            this.showNotification('O navegador não suporta geolocalização.', 'error');
        }
    }

    markLocationAsVisited(locationId) {
        let visitedLocations = JSON.parse(localStorage.getItem('visitedLocations') || '[]');
        if (!visitedLocations.includes(locationId)) {
            visitedLocations.push(locationId);
            localStorage.setItem('visitedLocations', JSON.stringify(visitedLocations));
    
            // Add points for discovering the location
            this.addPoints(100);
    
            // Notify the user
            this.showNotification('Novo local descoberto! +100 pontos', 'success');
    
            // Update progress
            this.updateProgress();
        }
    }    

    updateProgress() {
        const visitedLocations = JSON.parse(localStorage.getItem('visitedLocations') || '[]');
        const progressPercent = (visitedLocations.length / this.totalLocations) * 100;
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;
        document.getElementById('progress-text').textContent =
            `${visitedLocations.length} de ${this.totalLocations} pontos descobertos`;
    }

    addPoints(points) {
        let currentScore = parseInt(localStorage.getItem('playerScore') || '0');
        currentScore += points;
        localStorage.setItem('playerScore', currentScore.toString());
        this.updateScore();
    }
    
    updateScore() {
        const currentScore = parseInt(localStorage.getItem('playerScore') || '0');
        document.getElementById('player-score').textContent = currentScore;
    }
    
    checkForAvailableQuiz() {
        if (this.quizSystem && this.quizSystem.checkQuizAvailability() >= 0) {
            this.showNotification('Quiz desbloqueado! Complete-o para ganhar um badge especial!', 'success');
            
            setTimeout(() => {
                if (this.quizSystem.startQuiz()) {
                    console.log('Quiz iniciado');
                } else {
                    this.startScanner();
                }
            }, 2000);
        } else {
            this.startScanner();
        }
    }
    
    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    display3DModel(location) {
        const container = document.getElementById('ar-container');
        container.classList.remove('hidden'); // Exibe o container de RA
        
        // Configurar cena, câmera e renderizador
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        container.appendChild(renderer.domElement);
    
        // Adicionar iluminação
        const light = new THREE.PointLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);
    
        let mixer;

        // Carregar modelo 3D
        const loader = new GLTFLoader(); // Certifique-se de incluir o GLTFLoader no projeto
        loader.load('assets/models/italian_coffee_machine.glb', (gltf) => {
            const model = gltf.scene;
            console.log(model)
            model.scale.set(0.1, 0.1, 0.1); // Scale the model
            model.position.set(0, 0, 0);
            scene.add(model);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7.5); // Position the light
            scene.add(directionalLight);
        
            // Check if the model has animations
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model); // Create an AnimationMixer
                const animation = mixer.clipAction(gltf.animations[0]); // Get the first animation
                animation.play(); // Play the animation
        
                // Update the animation in the render loop
                function animate() {
                    requestAnimationFrame(animate);
            
                    // Update animations
                    if (mixer) {
                        mixer.update(0.016); // Update the mixer (16 ms per frame ~ 60 FPS)
                    }
            
                    renderer.render(scene, camera);
                }
                animate();
            }
        });

        // Configurar câmera
        camera.position.set(0, 2, 10); // Move the camera back and up
        camera.lookAt(0, 0, 0);
    
        // Loop de animação
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }
    hideARModel() {
        const container = document.getElementById('ar-container');
        container.classList.add('hidden'); // Esconde o container de RA
        while (container.firstChild) {
            container.removeChild(container.firstChild); // Remove o modelo 3D
        }
    }
    showARModel(location) {
        this.display3DModel(location);
        const arButton = document.getElementById('ar-button');
        arButton.addEventListener('click', () => {
            this.hideARModel();
        });
    }
    showARButton() {
        const arButton = document.getElementById('ar-button');
        arButton.classList.remove('hidden');
        arButton.addEventListener('click', () => {
            this.hideARModel();
        });
    }
    hideARButton() {
        const arButton = document.getElementById('ar-button');
        arButton.classList.add('hidden');
    }
    showARContent(location) {
        this.showARModel(location);
        this.showARButton();
    }
    hideARContent() {
        this.hideARModel();
        this.hideARButton();
    }

}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const parkAR = new ParkARScanner();
    parkAR.initialize();

    window.parkARApp = parkAR;
});

export default ParkARScanner;
