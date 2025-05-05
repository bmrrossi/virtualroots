class QuizSystem {
    constructor(scanner) {
        this.scanner = scanner; // Referência à classe ParkARScanner
        this.quizzes = []; // Lista de quizzes
        this.currentQuizIndex = -1; // Índice do quiz atual
    }

    async initialize() {
        try {
            const response = await fetch('data/quizzes.json');
            this.quizzes = await response.json();
            console.log('Quizzes carregados:', this.quizzes);
        } catch (error) {
            console.error('Erro ao carregar quizzes:', error);
        }
    }

    checkQuizAvailability() {
        const visitedLocations = JSON.parse(localStorage.getItem('visitedLocations') || '[]');
        
        // Verifica se há algum quiz desbloqueado com base nos pontos visitados
        const availableQuizIndex = this.quizzes.findIndex(
            quiz => visitedLocations.includes(quiz.unlockPoint)
        );

        this.currentQuizIndex = availableQuizIndex;
        return availableQuizIndex;
    }

    startQuiz() {
        if (this.currentQuizIndex < 0) {
            console.log('Nenhum quiz disponível para iniciar.');
            return false;
        }

        const currentQuiz = this.quizzes[this.currentQuizIndex];

        // Exibe o quiz na interface
        const quizContainer = document.getElementById('quiz-container');
        quizContainer.innerHTML = `
            <div class="quiz-header">
                <h2>${currentQuiz.title}</h2>
                <p>${currentQuiz.description}</p>
            </div>
            <div class="quiz-question">
                <h3>${currentQuiz.question}</h3>
                <div class="options">
                    ${currentQuiz.options.map((option, index) =>
                        `<button class="quiz-option" data-index="${index}">${option}</button>`
                    ).join('')}
                </div>
            </div>
            <div id="quiz-result" class="hidden"></div>
        `;
        quizContainer.classList.add('active'); // Mostra o container do quiz

        // Adiciona eventos para as opções do quiz
        document.querySelectorAll('.quiz-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const selectedIndex = parseInt(e.target.dataset.index);
                this.handleAnswer(selectedIndex, currentQuiz.correctAnswer, currentQuiz.explanation);
            });
        });

        return true;
    }

    handleAnswer(selectedIndex, correctAnswer, explanation) {
        const resultElem = document.getElementById('quiz-result');

        if (selectedIndex === correctAnswer) {
            resultElem.innerHTML = `
                <div class="correct">Correto! ${explanation}</div>
            `;
            // Adiciona pontos ao jogador
            this.scanner.addPoints(50);
        } else {
            resultElem.innerHTML = `
                <div class="incorrect">Incorreto. ${explanation}</div>
            `;
        }

        resultElem.classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('quiz-container').classList.remove('active'); // Esconde o quiz
            this.scanner.startScanner(); // Retorna ao scanner
        }, 3000);
    }

    showBadges() {
        const badgesDisplay = document.getElementById('badges-display');
        badgesDisplay.innerHTML = `
            <h2>Badges Conquistados</h2>
            <div class="badges-grid">
                ${this.quizzes.map(quiz =>
                    `<div class="badge-item ${quiz.completed ? 'earned' : 'locked'}">
                        <h4>${quiz.title}</h4>
                        <p>${quiz.completed ? 'Conquistado!' : 'Bloqueado'}</p>
                    </div>`
                ).join('')}
            </div>
            <button id="close-badges">Fechar</button>
        `;
        badgesDisplay.classList.add('active');

        document.getElementById('close-badges').addEventListener('click', () => {
            badgesDisplay.classList.remove('active');
        });
    }

    showRanking() {
        const rankingDisplay = document.getElementById('ranking-display');
        const playerScore = parseInt(localStorage.getItem('playerScore') || '0');

        rankingDisplay.innerHTML = `
            <h2>Ranking</h2>
            <div class="ranking-table">
                <table>
                    <tr><th>Jogador</th><th>Pontuação</th></tr>
                    <tr><td>joaozinho235</td><td>1200</td></tr>
                    <tr class="current-player"><td>Você</td><td>${playerScore}</td></tr>
                    <tr><td>mariasilva221</td><td>490</td></tr>
                    <tr><td>joao_vitor2</td><td>430</td></tr>
                    <tr><td>willzhj__</td><td>390</td></tr>
                    <tr><td>pmerechim_</td><td>350</td></tr>
                    <tr><td>lili1212</td><td>350</td></tr>
                    <tr><td>gabriel_santosss</td><td>300</td></tr>
                    <tr><td>anamaria_r23s</td><td>300</td></tr>
                    <tr><td>f4lc40</td><td>200</td></tr>
                </table>
            </div>
            <button id="close-ranking">Fechar</button>
        `;
        rankingDisplay.classList.add('active');

        document.getElementById('close-ranking').addEventListener('click', () => {
            rankingDisplay.classList.remove('active');
        });
    }
}

export default QuizSystem;
