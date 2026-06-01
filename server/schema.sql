CREATE DATABASE IF NOT EXISTS study_assistant_db;
USE study_assistant_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  institution VARCHAR(255),
  course VARCHAR(255),
  semester VARCHAR(50),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Syllabi uploaded by users
CREATE TABLE IF NOT EXISTS syllabi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  filename VARCHAR(500) NOT NULL,
  raw_text LONGTEXT,
  status ENUM('processing','ready','error') DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Topics extracted from syllabi
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  syllabus_id INT NOT NULL,
  user_id INT NOT NULL,
  unit_number INT DEFAULT 1,
  unit_title VARCHAR(255),
  topic_name VARCHAR(500) NOT NULL,
  topic_order INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI-generated notes per topic
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  user_id INT NOT NULL,
  content LONGTEXT NOT NULL,
  summary TEXT,
  key_points JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Questions (important, viva, short, long)
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  user_id INT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT,
  type ENUM('important','viva','short','long') DEFAULT 'important',
  difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MCQs
CREATE TABLE IF NOT EXISTS mcqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  user_id INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a VARCHAR(500) NOT NULL,
  option_b VARCHAR(500) NOT NULL,
  option_c VARCHAR(500) NOT NULL,
  option_d VARCHAR(500) NOT NULL,
  correct_option ENUM('a','b','c','d') NOT NULL,
  explanation TEXT,
  difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tests
CREATE TABLE IF NOT EXISTS tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  syllabus_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type ENUM('topic','unit','full') DEFAULT 'topic',
  duration_minutes INT DEFAULT 30,
  total_marks INT DEFAULT 20,
  status ENUM('pending','attempted','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE
);

-- Test questions (junction)
CREATE TABLE IF NOT EXISTS test_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id INT NOT NULL,
  mcq_id INT,
  question_id INT,
  marks INT DEFAULT 1,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE SET NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
);

-- Test attempts/results
CREATE TABLE IF NOT EXISTS test_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT DEFAULT 0,
  total_marks INT DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  time_taken_minutes INT,
  answers JSON,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI Chat history
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  context_topic_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);