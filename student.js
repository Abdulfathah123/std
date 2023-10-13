const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cron = require('cron');
const mongoose = require('mongoose');
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;
const adminEmail = 'admin@aadmin.com';
const adminPassword = 'admin';
const adminKey = 'adminkey123';
const studentKey = 'std1key23';

mongoose.connect('mongodb+srv://kkabdulfathah:mongodb%40234@cluster0.tiwomfl.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
const stdSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  department: String,
});
const taskSchema = new mongoose.Schema({
  studentEmail: String,
  task: String,
  dueTime: Date,
  status: String,
});
const Student = mongoose.model('Student', stdSchema);
const Task = mongoose.model('Task', taskSchema);

app.post('/admin', (req, res) => {
  const { email, password } = req.body;
  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ email }, adminKey, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});
app.post('/student', async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = await Student.findOne({ email, password });

    if (student) {
      const token = jwt.sign({ email }, studentKey, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Authentication error' });
  }
});
function verifyAdminToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  jwt.verify(token, adminKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.adminEmail = decoded.email;
    next();
  });
}
function verifyStudentToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  jwt.verify(token, studentKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.studentEmail = decoded.email;
    next();
  });
}
app.post('/admin/add-std', verifyAdminToken, async (req, res) => {
  const { name, email, password, department } = req.body;
  const student = new Student({ name, email, password, department });

  try {
    await student.save();
    res.json({ message: 'Student added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding the student' });
  }
});
app.post('/admin/assign-task', verifyAdminToken, async (req, res) => {
  const { studentEmail, task, dueTime } = req.body;
  const newTask = new Task({ studentEmail, task, dueTime, status: 'pending' });

  try {
    await newTask.save();
    res.json({ message: 'Task assigned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error assigning the task' });
  }
});
app.get('/student/tasks', verifyStudentToken, async (req, res) => {
  try {
    const tasks = await Task.find({ studentEmail: req.studentEmail });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving tasks' });
  }
});
app.put('/student/done/:taskId', verifyStudentToken, async (req, res) => {
  const taskId = req.params.taskId;

  try {
    const updatedTask = await Task.findByIdAndUpdate(taskId, { status: 'completed' }, { new: true });
    if (updatedTask) {
      res.json({ message: 'Task marked as done' });
    } else {
      res.status(404).json({ message: 'Task not found or already completed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking the task as done' });
  }
});
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
