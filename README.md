# Online Quiz Application with Supabase

A full-stack web-based quiz system using Supabase as the backend database and authentication provider.

## Features

### User Features
- User registration and login via Supabase Auth
- View available quizzes
- Take timed quizzes with MCQ questions
- Auto-submit on time expiry
- View instant results with correct answers
- View quiz attempt history

### Admin Features
- Admin login with role-based access
- Create, edit, and delete quizzes
- Add questions with multiple choice options
- Set quiz time limits and marks
- View all user results and analytics
- Manage quiz parameters

### Technical Features
- Responsive design (mobile-friendly)
- Real-time timer
- Supabase authentication and database
- Row Level Security (RLS)
- Role-based access control
- Random question order
- Auto-evaluation system

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Security**: Row Level Security policies

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Supabase account
- npm (Node Package Manager)

### Installation Steps

1. **Clone/Download the project**
   ```bash
   cd "c:\app1\quiz application"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Copy your project URL and anon key
   - Go to SQL Editor in Supabase dashboard
   - Run the SQL commands from `database.sql`

4. **Configure Environment Variables**
   - Edit the `.env` file with your Supabase credentials:
     ```
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     PORT=3000
     ```

5. **Create Admin User**
   - Register a user through the app
   - In Supabase dashboard, go to Authentication > Users
   - Find your user and copy the UUID
   - Go to Table Editor > profiles
   - Update the user's role to 'admin'

6. **Start the Application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

7. **Access the Application**
   - Open your browser and go to: `http://localhost:3000`

## Usage Guide

### For Users:
1. Register a new account
2. Login with your credentials
3. View available quizzes on the dashboard
4. Click "Start Quiz" to begin
5. Answer questions within the time limit
6. Submit or wait for auto-submit
7. View results and correct answers
8. Check quiz history anytime

### For Admins:
1. Login with admin credentials
2. Use "Manage Quizzes" tab to:
   - Create new quizzes
   - Add questions to existing quizzes
   - Delete quizzes
3. Use "View Results" tab to see all user performance
4. Set quiz parameters (time limit, marks, etc.)

## Database Schema

### Tables:
- **profiles**: User profiles with roles
- **quizzes**: Quiz information and settings
- **questions**: Quiz questions with options and correct answers
- **results**: User quiz attempts and scores

### Security:
- Row Level Security (RLS) enabled
- Users can only access their own data
- Admins have elevated permissions
- Automatic profile creation on user registration

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `POST /api/quizzes` - Create quiz (admin only)
- `DELETE /api/quizzes/:id` - Delete quiz (admin only)

### Questions
- `GET /api/quizzes/:id/questions` - Get quiz questions
- `POST /api/questions` - Add question (admin only)
- `DELETE /api/questions/:id` - Delete question (admin only)

### Results
- `POST /api/submit-quiz` - Submit quiz answers
- `GET /api/results` - Get user results

## Security Features

- Supabase authentication
- Row Level Security policies
- Role-based access control
- Secure API endpoints
- UUID-based identifiers

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Troubleshooting

### Common Issues:

1. **Supabase Connection Error**
   - Check SUPABASE_URL and SUPABASE_ANON_KEY in `.env`
   - Verify project is active in Supabase dashboard

2. **Authentication Issues**
   - Check if user registration is enabled in Supabase Auth settings
   - Verify RLS policies are correctly set

3. **Admin Access Issues**
   - Ensure user role is set to 'admin' in profiles table
   - Check RLS policies for admin access

## Advantages of Supabase

- No database setup required
- Built-in authentication
- Real-time capabilities
- Automatic API generation
- Row Level Security
- Scalable PostgreSQL database
- Easy deployment

## Future Enhancements

- Real-time quiz collaboration
- File upload for questions
- Advanced analytics
- Mobile app with Supabase SDK
- Social authentication
- Email notifications

## License

This project is for educational purposes.