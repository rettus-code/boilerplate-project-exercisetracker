const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const req = require('express/lib/request');
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false }));
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

//get all users

app.post('/api/users', async (req, res) => {
  try {
    await client.connect();
    const db = client.db("exercise_tracker");
    const oldUser = await db.collection('users').findOne({userName: req.body.username});
    if(!!oldUser){
      res.json({ username: req.body.username, _id: oldUser._id.toString()});
    } else {
      const user = await db.collection('users').insertOne({
        userName: req.body.username
      })
      const id = await db.collection('users').findOne({userName: req.body.username});
      res.json({ username: req.body.username, _id: id._id.toString()});
    }
    
  } catch (err) {
    console.log(err);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }

})
app.post('/api/users/:_id/exercises', async (req, res) => {
  const body = req.body;
  if(body.description === "" || body.duration === "" || body.date === "") {
    res.json({ message: "Fill out all exercise fields to add to log"});
  } else {
    try {
      await client.connect();
      
      const id = new ObjectId(body[':_id'])
      const db = client.db("exercise_tracker");
      const user = await db.collection('users').findOne({_id: id});
      if(!user){
        res.json({ message: "invalid id try again"})
      }
      const exercise = {
        userId: body[':_id'],
        userName: user.userName,
        description: body.description,
        duration: parseInt(body.duration),
        date: body.date
      }
      await db.collection("exercises").insertOne(exercise)
      res.json({ user: user.username, exercise: exercise});
    } catch (err) {
      console.log(err);
      res.json({ err: err});
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  
})

app.get('/api/users/:_id/logs', async (req, res) => {
  console.log(req.query, req.params._id);
  const id = req.params._id.toString();
  const from = req.query.from || new Date(0).toISOString().substring(0, 10);
  const until = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
  const limit = Number(req.query.limit) || 0;

  try {
    await client.connect();
    const db = client.db("exercise_tracker");
    
    const exercises = await db.collection("exercises").find({
      userId: id,
      date: { $gte: from, $lte: until },
    })
    .limit(limit)
    .toArray();
    if(exercises.length < 1){
      res.json({message: "No exercises for user on those dates"})
    } else {
      const mapped = exercises.map((a) => {
        return {
          description: a.description,
          duration: a.duration,
          date: a.date
        }
      })
      const name = exercises[0].userName
      console.log("Get", mapped);
      res.json({
        _id: id,
        username: name,
        count: mapped.length,
        log: mapped,
      });
    }
    
  } catch (err) {
    res.json({ err: err});
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
