class QuizApp {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.quizTimer = null;
        this.timeLeft = 0;
        this.currentQuestionIndex = 0;
        this.flaggedQuestions = new Set();
        this.allQuizzes = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.showDashboard();
        } else {
            this.showPage('loginPage');
        }
    }

    bindEvents() {
        // Auth events
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('showRegister').addEventListener('click', () => this.showPage('registerPage'));
        document.getElementById('showLogin').addEventListener('click', () => this.showPage('loginPage'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Dashboard events
        document.getElementById('viewHistoryBtn')?.addEventListener('click', () => this.showHistory());
        document.getElementById('leaderboardBtn')?.addEventListener('click', () => this.showLeaderboard());
        document.getElementById('searchQuiz')?.addEventListener('input', (e) => this.filterQuizzes(e.target.value));
        document.getElementById('sortQuizzes')?.addEventListener('change', (e) => this.sortQuizzes(e.target.value));
        document.getElementById('backFromLeaderboard')?.addEventListener('click', () => this.showDashboard());

        // Admin events
        document.getElementById('addQuizBtn').addEventListener('click', () => this.showModal('quizModal'));
        document.getElementById('quizForm').addEventListener('submit', (e) => this.handleCreateQuiz(e));
        document.getElementById('multipleQuestionsForm').addEventListener('submit', (e) => this.handleMultipleQuestions(e));
        document.getElementById('questionForm').addEventListener('submit', (e) => this.handleAddQuestion(e));
        document.getElementById('exportResultsBtn')?.addEventListener('click', () => this.exportResults());

        // Quiz events
        document.getElementById('submitQuizBtn').addEventListener('click', () => this.submitQuiz());
        document.getElementById('backToDashboard').addEventListener('click', () => this.showDashboard());
        document.getElementById('backFromHistory').addEventListener('click', () => this.showDashboard());
        document.getElementById('prevQuestion')?.addEventListener('click', () => this.navigateQuestion(-1));
        document.getElementById('nextQuestion')?.addEventListener('click', () => this.navigateQuestion(1));
        document.getElementById('flagQuestion')?.addEventListener('click', () => this.flagCurrentQuestion());

        // Tab events
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Modal events
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });
    }

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };

        try {
            const response = await fetch(`/api${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            this.showAlert(error.message, 'error');
            throw error;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const data = await this.apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            this.currentUser = data.user;
            this.showDashboard();
            this.showAlert('Login successful!', 'success');
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            await this.apiCall('/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            this.showAlert('Registration successful! Please login.', 'success');
            this.showPage('loginPage');
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        this.showPage('loginPage');
        this.showAlert('Logged out successfully!', 'success');
    }

    showDashboard() {
        document.getElementById('userInfo').textContent = `Welcome, ${this.currentUser.name}`;
        document.getElementById('logoutBtn').style.display = 'block';

        if (this.currentUser.role === 'admin') {
            this.showPage('adminDashboard');
            this.loadAdminData();
        } else {
            this.showPage('userDashboard');
            this.loadQuizzes();
        }
    }

    async loadQuizzes() {
        try {
            const quizzes = await this.apiCall('/quizzes');
            this.allQuizzes = quizzes;
            this.displayQuizzes(quizzes);
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    displayQuizzes(quizzes) {
        const container = document.getElementById('quizList');
        
        container.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card">
                <h4>${quiz.quiz_name}</h4>
                <div class="quiz-meta">
                    <span class="quiz-category">${quiz.category || 'General'}</span>
                    <span class="quiz-difficulty ${(quiz.difficulty || 'Medium').toLowerCase()}">${quiz.difficulty || 'Medium'}</span>
                </div>
                <p>${quiz.description || 'No description available'}</p>
                <div class="quiz-stats">
                    <span>⏱️ ${quiz.time_limit} min</span>
                    <span>📊 ${quiz.total_marks} marks</span>
                    <span>✅ ${quiz.passing_score || 60}% to pass</span>
                </div>
                <div class="quiz-actions">
                    <button class="btn-primary" onclick="app.startQuiz('${quiz.id}')">Start Quiz</button>
                    <button class="btn-secondary" onclick="app.showQuizDetails('${quiz.id}')">Details</button>
                </div>
            </div>
        `).join('');
    }

    filterQuizzes(searchTerm) {
        const filtered = this.allQuizzes.filter(quiz => 
            quiz.quiz_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (quiz.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.displayQuizzes(filtered);
    }

    sortQuizzes(sortBy) {
        let sorted = [...this.allQuizzes];
        switch(sortBy) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'name':
                sorted.sort((a, b) => a.quiz_name.localeCompare(b.quiz_name));
                break;
            case 'difficulty':
                const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                sorted.sort((a, b) => (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2));
                break;
        }
        this.displayQuizzes(sorted);
    }

    async showLeaderboard() {
        try {
            const results = await this.apiCall('/results');
            const leaderboard = this.calculateLeaderboard(results);
            this.displayLeaderboard(leaderboard);
            this.showPage('leaderboardPage');
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    calculateLeaderboard(results) {
        const userStats = {};
        results.forEach(result => {
            if (!userStats[result.user_id]) {
                userStats[result.user_id] = {
                    name: result.name,
                    totalScore: 0,
                    totalQuizzes: 0,
                    bestScore: 0
                };
            }
            const percentage = (result.score / result.total_questions) * 100;
            userStats[result.user_id].totalScore += percentage;
            userStats[result.user_id].totalQuizzes++;
            userStats[result.user_id].bestScore = Math.max(userStats[result.user_id].bestScore, percentage);
        });

        return Object.values(userStats)
            .map(user => ({
                ...user,
                averageScore: user.totalScore / user.totalQuizzes
            }))
            .sort((a, b) => b.averageScore - a.averageScore)
            .slice(0, 10);
    }

    displayLeaderboard(leaderboard) {
        const container = document.getElementById('leaderboardList');
        container.innerHTML = leaderboard.map((user, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            return `
                <div class="leaderboard-item">
                    <span class="rank ${rankClass}">${index + 1}</span>
                    <div class="user-info">
                        <h4>${user.name}</h4>
                        <p>Average: ${user.averageScore.toFixed(1)}% | Best: ${user.bestScore.toFixed(1)}% | Quizzes: ${user.totalQuizzes}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadAdminData() {
        try {
            const [quizzes, results] = await Promise.all([
                this.apiCall('/quizzes'),
                this.apiCall('/results')
            ]);

            this.displayAdminQuizzes(quizzes);
            this.displayAllResults(results);
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    displayAdminQuizzes(quizzes) {
        const container = document.getElementById('adminQuizList');
        
        container.innerHTML = quizzes.map(quiz => `
            <div class="admin-item">
                <div>
                    <h4>${quiz.quiz_name}</h4>
                    <p>Time: ${quiz.time_limit}min | Marks: ${quiz.total_marks}</p>
                </div>
                <div class="admin-actions">
                    <button class="btn-success btn-small" onclick="app.addQuestion('${quiz.id}')">Add Question</button>
                    <button class="btn-primary btn-small" onclick="app.addMultipleQuestions('${quiz.id}')">Add Multiple</button>
                    <button class="btn-secondary btn-small" onclick="app.printQuiz('${quiz.id}')">Print</button>
                    <button class="btn-danger btn-small" onclick="app.deleteQuiz('${quiz.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    displayAllResults(results) {
        const container = document.getElementById('allResults');
        
        container.innerHTML = results.map(result => `
            <div class="admin-item">
                <div>
                    <h4>${result.name} - ${result.quiz_name}</h4>
                    <p>Score: ${result.score}/${result.total_questions} | Date: ${new Date(result.date).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    }

    async handleCreateQuiz(e) {
        e.preventDefault();
        const quizData = {
            quiz_name: document.getElementById('quizName').value,
            category: document.getElementById('quizCategory').value,
            difficulty: document.getElementById('quizDifficulty').value,
            time_limit: document.getElementById('timeLimit').value,
            total_marks: document.getElementById('totalMarks').value,
            passing_score: document.getElementById('passingScore').value,
            description: document.getElementById('quizDescription').value,
            randomize_questions: document.getElementById('randomizeQuestions').checked,
            show_results: document.getElementById('showResults').checked,
            allow_retake: document.getElementById('allowRetake').checked
        };

        try {
            await this.apiCall('/quizzes', {
                method: 'POST',
                body: JSON.stringify(quizData)
            });

            this.closeModal(document.getElementById('quizModal'));
            this.loadAdminData();
            this.showAlert('Quiz created successfully!', 'success');
            document.getElementById('quizForm').reset();
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    async deleteQuiz(quizId) {
        if (!confirm('Are you sure you want to delete this quiz?')) return;

        try {
            await this.apiCall(`/quizzes/${quizId}`, { method: 'DELETE' });
            this.loadAdminData();
            this.showAlert('Quiz deleted successfully!', 'success');
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    async handleMultipleQuestions(e) {
        e.preventDefault();
        const quizId = document.getElementById('multipleQuizId').value;
        const questionItems = document.querySelectorAll('.question-item');
        
        const questions = Array.from(questionItems).map((item, index) => {
            const options = item.querySelectorAll('.option');
            const correctOption = item.querySelector('.correct-option').value;
            
            if (!correctOption || correctOption === '') {
                throw new Error(`Please select correct answer for Question ${index + 1}`);
            }
            
            return {
                quiz_id: quizId,
                question_text: item.querySelector('.question-text').value,
                option1: options[0].value,
                option2: options[1].value,
                option3: options[2].value,
                option4: options[3].value,
                correct_option: parseInt(correctOption),
                marks: parseInt(item.querySelector('.marks').value)
            };
        });

        try {
            for (const question of questions) {
                await this.apiCall('/questions', {
                    method: 'POST',
                    body: JSON.stringify(question)
                });
            }

            this.closeModal(document.getElementById('multipleQuestionsModal'));
            this.showAlert(`${questions.length} questions added successfully!`, 'success');
            
            // Reset modal to step 1
            document.getElementById('questionCountStep').style.display = 'block';
            document.getElementById('multipleQuestionsForm').style.display = 'none';
            document.getElementById('questionCount').value = '5';
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    addQuestion(quizId) {
        document.getElementById('questionQuizId').value = quizId;
        this.showModal('questionModal');
    }

    addMultipleQuestions(quizId) {
        document.getElementById('multipleQuizId').value = quizId;
        document.getElementById('questionCountStep').style.display = 'block';
        document.getElementById('multipleQuestionsForm').style.display = 'none';
        this.showModal('multipleQuestionsModal');
    }

    generateQuestions() {
        const count = parseInt(document.getElementById('questionCount').value);
        if (count < 1 || count > 50) {
            this.showAlert('Please enter a number between 1 and 50', 'error');
            return;
        }

        const container = document.getElementById('multipleQuestionsContainer');
        container.innerHTML = '';

        for (let i = 1; i <= count; i++) {
            const questionHTML = `
                <div class="question-item" data-index="${i}">
                    <div class="question-header">
                        <h4>Question ${i}</h4>
                    </div>
                    
                    <div class="form-group">
                        <textarea class="question-text" placeholder="Enter question ${i}..." required rows="4"></textarea>
                    </div>

                    <div class="options-grid">
                        <input type="text" class="option" placeholder="Option A" required>
                        <input type="text" class="option" placeholder="Option B" required>
                        <input type="text" class="option" placeholder="Option C" required>
                        <input type="text" class="option" placeholder="Option D" required>
                    </div>

                    <div class="question-footer">
                        <select class="correct-option" required>
                            <option value="">Correct Answer</option>
                            <option value="1">A</option>
                            <option value="2">B</option>
                            <option value="3">C</option>
                            <option value="4">D</option>
                        </select>
                        <input type="number" class="marks" value="1" min="1" max="10" required>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', questionHTML);
        }

        document.getElementById('questionCountStep').style.display = 'none';
        document.getElementById('multipleQuestionsForm').style.display = 'block';
    }

    backToQuestionCount() {
        document.getElementById('questionCountStep').style.display = 'block';
        document.getElementById('multipleQuestionsForm').style.display = 'none';
    }

    addAnotherQuestion() {
        const container = document.getElementById('questionsContainer');
        const questionCount = container.children.length + 1;
        
        const questionHTML = `
            <div class="question-item" data-index="${questionCount}">
                <div class="question-header">
                    <h4>Question ${questionCount}</h4>
                    <button type="button" class="btn-danger btn-small remove-question" onclick="app.removeQuestion(${questionCount})">Remove</button>
                </div>
                
                <div class="form-group">
                    <textarea class="question-text" placeholder="Enter question..." required rows="2"></textarea>
                </div>

                <div class="options-grid">
                    <input type="text" class="option" placeholder="Option A" required>
                    <input type="text" class="option" placeholder="Option B" required>
                    <input type="text" class="option" placeholder="Option C" required>
                    <input type="text" class="option" placeholder="Option D" required>
                </div>

                <div class="question-footer">
                    <select class="correct-option" required>
                        <option value="">Correct Answer</option>
                        <option value="1">A</option>
                        <option value="2">B</option>
                        <option value="3">C</option>
                        <option value="4">D</option>
                    </select>
                    <input type="number" class="marks" value="1" min="1" max="10" required>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', questionHTML);
    }

    removeQuestion(index) {
        const questionItem = document.querySelector(`[data-index="${index}"]`);
        if (questionItem && document.getElementById('questionsContainer').children.length > 1) {
            questionItem.remove();
            this.renumberQuestions();
        }
    }

    async handleAddQuestion(e) {
        e.preventDefault();
        const correctOption = document.getElementById('correctOption').value;
        
        if (!correctOption || correctOption === '') {
            this.showAlert('Please select the correct answer', 'error');
            return;
        }
        
        const questionData = {
            quiz_id: document.getElementById('questionQuizId').value,
            question_text: document.getElementById('questionText').value,
            option1: document.getElementById('option1').value,
            option2: document.getElementById('option2').value,
            option3: document.getElementById('option3').value,
            option4: document.getElementById('option4').value,
            correct_option: parseInt(correctOption),
            marks: parseInt(document.getElementById('marks').value)
        };

        try {
            await this.apiCall('/questions', {
                method: 'POST',
                body: JSON.stringify(questionData)
            });

            this.closeModal(document.getElementById('questionModal'));
            this.showAlert('Question added successfully!', 'success');
            document.getElementById('questionForm').reset();
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    async startQuiz(quizId) {
        try {
            const [quiz, questions] = await Promise.all([
                this.apiCall('/quizzes').then(quizzes => quizzes.find(q => q.id === quizId)),
                this.apiCall(`/quizzes/${quizId}/questions`)
            ]);

            if (questions.length === 0) {
                this.showAlert('This quiz has no questions yet.', 'error');
                return;
            }

            this.currentQuiz = { ...quiz, questions };
            this.displayQuiz();
            this.startTimer(quiz.time_limit * 60);
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    displayQuiz() {
        document.getElementById('quizTitle').textContent = this.currentQuiz.quiz_name;
        this.currentQuestionIndex = 0;
        this.updateQuizProgress();
        this.showCurrentQuestion();
        this.showPage('quizPage');
    }

    showCurrentQuestion() {
        const container = document.getElementById('questionsContainer');
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        
        container.innerHTML = `
            <div class="question">
                <h4>Q${this.currentQuestionIndex + 1}. ${question.question_text}</h4>
                <div class="options">
                    <label class="option">
                        <input type="radio" name="currentQuestion" value="1">
                        ${question.option1}
                    </label>
                    <label class="option">
                        <input type="radio" name="currentQuestion" value="2">
                        ${question.option2}
                    </label>
                    <label class="option">
                        <input type="radio" name="currentQuestion" value="3">
                        ${question.option3}
                    </label>
                    <label class="option">
                        <input type="radio" name="currentQuestion" value="4">
                        ${question.option4}
                    </label>
                </div>
            </div>
        `;

        // Restore previous answer if exists
        const savedAnswer = this.getSavedAnswer(question.id);
        if (savedAnswer) {
            const radio = container.querySelector(`input[value="${savedAnswer}"]`);
            if (radio) radio.checked = true;
        }

        // Update navigation buttons
        document.getElementById('prevQuestion').disabled = this.currentQuestionIndex === 0;
        document.getElementById('nextQuestion').disabled = this.currentQuestionIndex === this.currentQuiz.questions.length - 1;
        
        // Update flag button
        const flagBtn = document.getElementById('flagQuestion');
        const questionId = question.id;
        flagBtn.textContent = this.flaggedQuestions.has(questionId) ? 'Unflag Question' : 'Flag Question';
        flagBtn.className = this.flaggedQuestions.has(questionId) ? 'btn-warning active' : 'btn-warning';
    }

    updateQuizProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuiz.questions.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${this.currentQuestionIndex + 1}/${this.currentQuiz.questions.length}`;
        
        // Update question numbers
        const numbersContainer = document.getElementById('questionNumbers');
        numbersContainer.innerHTML = this.currentQuiz.questions.map((q, index) => {
            const classes = ['question-number'];
            if (index === this.currentQuestionIndex) classes.push('current');
            if (this.getSavedAnswer(q.id)) classes.push('answered');
            if (this.flaggedQuestions.has(q.id)) classes.push('flagged');
            
            return `<span class="${classes.join(' ')}" onclick="app.goToQuestion(${index})">${index + 1}</span>`;
        }).join('');
    }

    navigateQuestion(direction) {
        this.saveCurrentAnswer();
        this.currentQuestionIndex += direction;
        this.currentQuestionIndex = Math.max(0, Math.min(this.currentQuestionIndex, this.currentQuiz.questions.length - 1));
        this.showCurrentQuestion();
        this.updateQuizProgress();
    }

    goToQuestion(index) {
        this.saveCurrentAnswer();
        this.currentQuestionIndex = index;
        this.showCurrentQuestion();
        this.updateQuizProgress();
    }

    flagCurrentQuestion() {
        const questionId = this.currentQuiz.questions[this.currentQuestionIndex].id;
        if (this.flaggedQuestions.has(questionId)) {
            this.flaggedQuestions.delete(questionId);
        } else {
            this.flaggedQuestions.add(questionId);
        }
        this.showCurrentQuestion();
        this.updateQuizProgress();
    }

    saveCurrentAnswer() {
        const selected = document.querySelector('input[name="currentQuestion"]:checked');
        if (selected) {
            const questionId = this.currentQuiz.questions[this.currentQuestionIndex].id;
            if (!this.currentQuiz.answers) this.currentQuiz.answers = {};
            this.currentQuiz.answers[questionId] = parseInt(selected.value);
        }
    }

    getSavedAnswer(questionId) {
        return this.currentQuiz.answers ? this.currentQuiz.answers[questionId] : null;
    }

    exportResults() {
        // Simple CSV export functionality
        this.apiCall('/results').then(results => {
            const csvContent = this.convertToCSV(results);
            this.downloadCSV(csvContent, 'quiz_results.csv');
        });
    }

    convertToCSV(data) {
        const headers = ['Name', 'Quiz', 'Score', 'Total Questions', 'Percentage', 'Date'];
        const rows = data.map(result => [
            result.name,
            result.quiz_name,
            result.score,
            result.total_questions,
            Math.round((result.score / result.total_questions) * 100) + '%',
            new Date(result.date).toLocaleDateString()
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    async printQuiz(quizId) {
        try {
            const [quiz, questions] = await Promise.all([
                this.apiCall('/quizzes').then(quizzes => quizzes.find(q => q.id === quizId)),
                this.apiCall(`/quizzes/${quizId}/questions`)
            ]);

            const printContent = this.generatePrintableQuiz(quiz, questions);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            this.showAlert('Error generating printable quiz', 'error');
        }
    }

    generatePrintableQuiz(quiz, questions) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${quiz.quiz_name} - Printable Quiz</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .quiz-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                    .question { margin-bottom: 25px; page-break-inside: avoid; }
                    .question-number { font-weight: bold; color: #333; }
                    .options { margin-left: 20px; margin-top: 10px; }
                    .option { margin-bottom: 8px; }
                    .answer-sheet { margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${quiz.quiz_name}</h1>
                    <p>Quiz Assessment</p>
                </div>
                
                <div class="quiz-info">
                    <p><strong>Instructions:</strong></p>
                    <ul>
                        <li>Time Limit: ${quiz.time_limit} minutes</li>
                        <li>Total Marks: ${quiz.total_marks}</li>
                        <li>Total Questions: ${questions.length}</li>
                        <li>Choose the best answer for each question</li>
                        <li>Mark your answers clearly in the answer sheet below</li>
                    </ul>
                </div>

                <div class="questions">
                    ${questions.map((q, index) => `
                        <div class="question">
                            <div class="question-number">Question ${index + 1}. (${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''})</div>
                            <p><strong>${q.question_text}</strong></p>
                            <div class="options">
                                <div class="option">A) ${q.option1}</div>
                                <div class="option">B) ${q.option2}</div>
                                <div class="option">C) ${q.option3}</div>
                                <div class="option">D) ${q.option4}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="answer-sheet">
                    <h3>Answer Sheet</h3>
                    <p>Fill in your answers below:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr style="background: #f0f0f0;">
                            <th style="border: 1px solid #ddd; padding: 8px;">Question</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Answer (A/B/C/D)</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Question</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Answer (A/B/C/D)</th>
                        </tr>
                        ${Array.from({length: Math.ceil(questions.length/2)}, (_, i) => {
                            const q1 = i * 2 + 1;
                            const q2 = i * 2 + 2;
                            return `
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${q1}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">____</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${q2 <= questions.length ? q2 : ''}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${q2 <= questions.length ? '____' : ''}</td>
                                </tr>
                            `;
                        }).join('')}
                    </table>
                </div>

                <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                    <p>Name: _________________________ Date: _____________ Score: _____/${quiz.total_marks}</p>
                </div>
            </body>
            </html>
        `;
    }

    startTimer(seconds) {
        this.timeLeft = seconds;
        this.updateTimerDisplay();
        
        this.quizTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                clearInterval(this.quizTimer);
                this.submitQuiz();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    async submitQuiz() {
        if (this.quizTimer) {
            clearInterval(this.quizTimer);
        }

        this.saveCurrentAnswer();
        const answers = this.currentQuiz.answers || {};

        try {
            const result = await this.apiCall('/submit-quiz', {
                method: 'POST',
                body: JSON.stringify({
                    quiz_id: this.currentQuiz.id,
                    answers
                })
            });

            this.displayResults(result);
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    displayResults(result) {
        const totalMarks = this.currentQuiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const percentage = Math.round((result.score / totalMarks) * 100);
        
        document.getElementById('scoreDisplay').innerHTML = `
            <div class="score-display">
                <h3>Quiz Completed!</h3>
                <p>Score: ${result.score}/${totalMarks}</p>
                <p>Percentage: ${percentage}%</p>
            </div>
        `;

        const reviewContainer = document.getElementById('answerReview');
        reviewContainer.innerHTML = `
            <h4>Answer Review:</h4>
            ${result.results.map(r => `
                <div class="review-item ${r.is_correct ? '' : 'incorrect'}">
                    <p><strong>Q:</strong> ${r.question_text}</p>
                    <p><strong>Your Answer:</strong> Option ${r.user_answer || 'Not answered'}</p>
                    <p><strong>Correct Answer:</strong> Option ${r.correct_answer}</p>
                    <p><strong>Result:</strong> ${r.is_correct ? '✓ Correct' : '✗ Incorrect'}</p>
                </div>
            `).join('')}
        `;

        this.showPage('resultsPage');
    }

    async showHistory() {
        try {
            const results = await this.apiCall('/results');
            const container = document.getElementById('userHistory');
            
            container.innerHTML = results.map(result => `
                <div class="admin-item">
                    <div>
                        <h4>${result.quiz_name}</h4>
                        <p>Score: ${result.score}/${result.total_questions} | Date: ${new Date(result.date).toLocaleDateString()}</p>
                    </div>
                </div>
            `).join('');

            this.showPage('historyPage');
        } catch (error) {
            // Error already handled in apiCall
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }
}

// Initialize the app
const app = new QuizApp();