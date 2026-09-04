const path = require('path');
const fs = require('fs')
const express = require('express');
const OS = require('os');
const mongoose = require("mongoose");
const app = express();
const cors = require('cors')


app.use(express.json());
app.use(cors())

const mongoOptions = {};

if (process.env.MONGO_USERNAME) {
    mongoOptions.user = process.env.MONGO_USERNAME;
}

if (process.env.MONGO_PASSWORD) {
    mongoOptions.pass = process.env.MONGO_PASSWORD;
}

mongoose.connect(
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/solar-system',
    mongoOptions
).catch((error) => {
    console.error('MongoDB connection failed:', error.message);
});

var Schema = mongoose.Schema;

var dataSchema = new Schema({
    name: String,
    id: Number,
    description: String,
    image: String,
    velocity: String,
    distance: String
});
var planetModel = mongoose.model('planets', dataSchema);



app.post('/planet', async function(req, res) {
    try {
        const planetData = await planetModel.findOne({
            id: Number(req.body.id)
        }).lean();

        if (!planetData) {
            return res.status(404).json({ error: 'Planet not found' });
        }

        return res.json(planetData);
    } catch (error) {
        console.error('Planet lookup failed:', error.message);
        return res.status(500).json({ error: 'Unable to fetch planet data' });
    }
})

app.get('/',   async (req, res) => {
    res.sendFile(path.join(__dirname, '/', 'index.html'));
});

app.get('/index.html', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app-controller.js', function(req, res) {
    res.sendFile(path.join(__dirname, 'app-controller.js'));
});

app.get('/api-docs', (req, res) => {
    fs.readFile('oas.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        res.status(500).send('Error reading file');
      } else {
        res.json(JSON.parse(data));
      }
    });
  });
  
app.get('/os',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "os": OS.hostname(),
        "env": process.env.NODE_ENV
    });
})

app.get('/live',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "live"
    });
})

app.get('/ready',   function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "ready"
    });
})

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
    console.log("Server successfully running on port - " + port);
})
module.exports = app;
