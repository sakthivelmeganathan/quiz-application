class QuizApp {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.quizTimer = null;
        this.timeLeft = 0;
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

        // Admin events
        document.getElementById('addQuizBtn').addEventListener('click', () => this.showModal('quizModal'));
        document.getElementById('quizForm').addEventListener('submit', (e) => this.handleCreateQuiz(e));
        // Multiple questions form
        document.getElementById('multipleQuestionsForm').addEventListener('submit', (e) => this.handleMultipleQuestions(e));
        document.getElementById('questionForm').addEventListener('submit', (e) => this.handleAddQuestion(e));

        // Quiz events
        document.getElementById('submitQuizBtn').addEventListener('click', () => this.submitQuiz());
        document.getElementById('backToDashboard').addEventListener('click', () => this.showDashboard());
        document.getElementById('backFromHistory').addEventListener('click', () => this.showDashboard());

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
            const container = document.getElementById('quizList');
            
            container.innerHTML = quizzes.map(quiz => `
                <div class="quiz-card">
                    <h4>${quiz.quiz_name}</h4>
                    <p>Time Limit: ${quiz.time_limit} minutes</p>
                    <p>Total Marks: ${quiz.total_marks}</p>
                    <button class="btn-primary" onclick="app.startQuiz('${quiz.id}')">Start Quiz</button>
                    <button class="btn-secondary" onclick="app.showHistory()">View History</button>
                </div>
            `).join('');
        } catch (error) {
            // Error already handled in apiCall
        }
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
        const quiz_name = document.getElementById('quizName').value;
        const time_limit = document.getElementById('timeLimit').value;
        const total_marks = document.getElementById('totalMarks').value;

        try {
            await this.apiCall('/quizzes', {
                method: 'POST',
                body: JSON.stringify({ quiz_name, time_limit, total_marks })
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
        const container = document.getElementById('questionsContainer');
        
        container.innerHTML = this.currentQuiz.questions.map((q, index) => `
            <div class="question">
                <h4>Q${index + 1}. ${q.question_text}</h4>
                <div class="options">
                    <label class="option">
                        <input type="radio" name="q${q.id}" value="1">
                        ${q.option1}
                    </label>
                    <label class="option">
                        <input type="radio" name="q${q.id}" value="2">
                        ${q.option2}
                    </label>
                    <label class="option">
                        <input type="radio" name="q${q.id}" value="3">
                        ${q.option3}
                    </label>
                    <label class="option">
                        <input type="radio" name="q${q.id}" value="4">
                        ${q.option4}
                    </label>
                </div>
            </div>
        `).join('');

        this.showPage('quizPage');
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

        const answers = {};
        this.currentQuiz.questions.forEach(q => {
            const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
            if (selected) {
                answers[q.id] = parseInt(selected.value);
            }
        });

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