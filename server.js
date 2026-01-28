const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicit routes for static assets
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Auth routes
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name }
        }
    });
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'User registered successfully' });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) return res.status(400).json({ error: error.message });
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', data.user.id)
        .single();
    
    res.json({
        token: data.session.access_token,
        user: {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata.name,
            role: profile?.role || 'user'
        }
    });
});

// Quiz routes
app.get('/api/quizzes', async (req, res) => {
    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/quizzes', async (req, res) => {
    const { quiz_name, time_limit, total_marks } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { data, error } = await supabase
        .from('quizzes')
        .insert({ quiz_name, time_limit, total_marks, created_by: user.id })
        .select()
        .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Quiz created successfully', quiz_id: data.id });
});

app.delete('/api/quizzes/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Quiz deleted successfully' });
});

// Question routes
app.get('/api/quizzes/:id/questions', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    
    let query = supabase.from('questions').select('*').eq('quiz_id', req.params.id);
    
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile?.role !== 'admin') {
            query = supabase
                .from('questions')
                .select('id, quiz_id, question_text, option1, option2, option3, option4, marks')
                .eq('quiz_id', req.params.id);
        }
    }
    
    const { data, error } = await query;
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/questions', async (req, res) => {
    const { quiz_id, question_text, option1, option2, option3, option4, correct_option, marks } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Validate required fields
    if (!quiz_id || !question_text || !option1 || !option2 || !option3 || !option4 || !correct_option) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate correct_option is between 1-4
    const correctOptionNum = parseInt(correct_option);
    if (isNaN(correctOptionNum) || correctOptionNum < 1 || correctOptionNum > 4) {
        return res.status(400).json({ error: 'Correct option must be between 1 and 4' });
    }
    
    const { error } = await supabase
        .from('questions')
        .insert({
            quiz_id,
            question_text,
            option1,
            option2,
            option3,
            option4,
            correct_option: correctOptionNum,
            marks: parseInt(marks) || 1
        });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Question added successfully' });
});

app.delete('/api/questions/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Question deleted successfully' });
});

// Result routes
app.post('/api/submit-quiz', async (req, res) => {
    const { quiz_id, answers } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz_id);
    
    if (questionsError) return res.status(500).json({ error: questionsError.message });
    
    let score = 0;
    const results = questions.map(q => {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer == q.correct_option;
        if (isCorrect) score += q.marks;
        
        return {
            question_id: q.id,
            question_text: q.question_text,
            user_answer: userAnswer,
            correct_answer: q.correct_option,
            is_correct: isCorrect
        };
    });
    
    const { error: resultError } = await supabase
        .from('results')
        .insert({
            user_id: user.id,
            quiz_id,
            score,
            total_questions: questions.length
        });
    
    if (resultError) return res.status(500).json({ error: resultError.message });
    res.json({ score, total_questions: questions.length, results });
});

app.get('/api/results', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    let query;
    if (profile?.role === 'admin') {
        // For admin: get all results with user names and quiz names
        const { data: results } = await supabase
            .from('results')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (results) {
            // Get user names and quiz names separately
            const userIds = [...new Set(results.map(r => r.user_id))];
            const quizIds = [...new Set(results.map(r => r.quiz_id))];
            
            const [{ data: profiles }, { data: quizzes }] = await Promise.all([
                supabase.from('profiles').select('id, name').in('id', userIds),
                supabase.from('quizzes').select('id, quiz_name').in('id', quizIds)
            ]);
            
            const formattedResults = results.map(result => {
                const userProfile = profiles?.find(p => p.id === result.user_id);
                const quiz = quizzes?.find(q => q.id === result.quiz_id);
                return {
                    ...result,
                    name: userProfile?.name || 'Unknown',
                    quiz_name: quiz?.quiz_name || 'Unknown Quiz',
                    date: result.created_at
                };
            });
            
            return res.json(formattedResults);
        }
    } else {
        // For regular users: get only their results
        const { data: results } = await supabase
            .from('results')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (results) {
            const quizIds = [...new Set(results.map(r => r.quiz_id))];
            const { data: quizzes } = await supabase
                .from('quizzes')
                .select('id, quiz_name')
                .in('id', quizIds);
            
            const formattedResults = results.map(result => {
                const quiz = quizzes?.find(q => q.id === result.quiz_id);
                return {
                    ...result,
                    quiz_name: quiz?.quiz_name || 'Unknown Quiz',
                    date: result.created_at
                };
            });
            
            return res.json(formattedResults);
        }
    }
    
    res.json([]);
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});