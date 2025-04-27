// qrscanner.js
import QrScanner from 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/+esm';

class ParkARScanner {
    constructor() {
        this.scanner = null;
        this.videoElem = null;
        this.scannerOverlay = document.getElementById('scanner-overlay');
        this.contentDisplay = document.getElementById('content-display');
        this.locationData = null;
    }

    async initialize() {
        // Carregar dados dos pontos do parque
        try {
            const response = await fetch('data/locations.json');
            this.locationData = await response.json();
            console.log('Dados dos pontos carregados:', this.locationData);
        } catch (error) {
            console.error('Erro ao carregar dados dos pontos:', error);
            alert('Não foi possível carregar os dados do jogo. Por favor, verifique sua conexão.');
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

        document.getElementById('start-scan').addEventListener('click', () => this.startScanner());
    }

    async startScanner() {
        try {
            await this.scanner.start();
            this.scannerOverlay.classList.add('active');
            document.getElementById('intro-screen').style.display = 'none';
        } catch (error) {
            console.error('Erro ao iniciar scanner:', error);
            alert('Não foi possível acessar a câmera. Por favor, verifique as permissões.');
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
            this.displayLocationContent(locationInfo);
        } else {
            alert('QR Code não reconhecido. Tente outro ponto do parque.');
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
            this.contentDisplay.innerHTML = '';
            this.startScanner();
        });

        if (location.hasInteraction) {
            document.getElementById('interact-btn').addEventListener('click', () => {
                this.handleInteraction(location);
            });
        }

        // Marcar local como visitado
        this.markLocationAsVisited(location.id);
    }

    handleInteraction(location) {
        // Implementar interações específicas para cada ponto
        console.log(`Interação com ${location.title}`);
        
        // Exemplo de mini-quiz sobre a cultura
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

    markLocationAsVisited(locationId) {
        let visitedLocations = JSON.parse(localStorage.getItem('visitedLocations') || '[]');
        if (!visitedLocations.includes(locationId)) {
            visitedLocations.push(locationId);
            localStorage.setItem('visitedLocations', JSON.stringify(visitedLocations));
            // Atualizar progresso
            this.updateProgress();
        }
    }

    updateProgress() {
        const visitedLocations = JSON.parse(localStorage.getItem('visitedLocations') || '[]');
        const progressPercent = (visitedLocations.length / this.locationData.length) * 100;
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;
        document.getElementById('progress-text').textContent = 
            `${visitedLocations.length} de ${this.locationData.length} pontos descobertos`;
    }

    addPoints(points) {
        let currentScore = parseInt(localStorage.getItem('playerScore') || '0');
        currentScore += points;
        localStorage.setItem('playerScore', currentScore.toString());
        document.getElementById('player-score').textContent = currentScore;
    }
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const parkAR = new ParkARScanner();
    parkAR.initialize();
});
