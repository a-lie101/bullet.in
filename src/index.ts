import express from 'express';
import 'dotenv/config';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());
const port = 3000;

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not set in the environment");
}

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

mongoose.connect(uri)
  .then(() => {console.log(`Connected to mongodb`)})
  .catch((error) => { console.log("Error connecting to MongoDB:", error); })


app.get('/', (req, res) => {
  res.send('GET request to the homepage');
});

app.get('/projects', async (req, res) => {
  res.json(await Project.find());
});

app.post('/projects', async (req,res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({error: "Invalid data error"});
  } 
});

app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});
