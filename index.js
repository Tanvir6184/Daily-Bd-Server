require("dotenv").config()
const express = require("express")
const router = express.Router();
const app = express();
const cors = require("cors")
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
port = process.env.PORT || 5000;





// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9h5lz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const articleCollection = client.db("daily_bangladesh").collection("added articles by user")
    const usersCollection = client.db("daily_bangladesh").collection("users")
    const publishersCollection = client.db("daily_bangladesh").collection("publisher")


    // jwt related api
    app.post("/jwt", async(req, res)=>{
      const user = req.body;
      const token =jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "20h" })
      res.send({token})
    })

    // middlewares
    const verifyToken = (req, res, next) =>{
      console.log("inside verify token", req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: "forbidden access"})
      }
      const token = req.headers.authorization.split(" ")[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
      if(error){
        return res.status(401).send({message: "unauthorized access"})
      }
      req.decoded = decoded;
      next();
     })
    } 

    // users related api
    app.post("/users", async(req, res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      if(existingUser){
        return res.send({message: "user already exists", insertedId: null})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.patch("/users/admin/:id", async(req, res) =>{
      const id = req.params.id 
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: "admin",
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.get("/users",verifyToken, async (req, res) => {
      console.log(req.headers);
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get("/user/admin/:email",verifyToken, async(req, res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message:"unauthorized access"})
      }
      const query = {email: email};
      const user = await usersCollection.findOne(query)
      let admin = false;
      if(user){
        admin = user?.role === "admin";
      }
      res.send({admin})
    })


   
    
    

    // all article related api  
    app.post("/add-article", async (req, res) => {
      const article = req.body;
      article.status = "pending"; // Set default status to "pending"
      const result = await articleCollection.insertOne(article);
      res.send(result);
    });

    app.put("/articles/status/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body; // e.g., { status: "approved" }
      const result = await articleCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result);
    });

    app.get("/articles-approved", async (req, res) => {
      const { status } = req.query; // Optional query parameter for filtering
      let query = {};
      if (status) {
        query.status = status; // Filter by status if provided
      }
      const articles = await articleCollection.find(query).toArray();
      res.send(articles);
    });
        
    
    app.get('/articles',verifyToken, async( req, res)=>{
      const result = await articleCollection.find().toArray()
      res.send(result)
  })

    app.delete("/delete-article/:id", async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await articleCollection.deleteOne(query)
      res.send(result)
    })  




    
    
    // Publisher related api
    app.post("/add-publishers",async(req, res)=>{
      const publisher = req.body;
      const result = await publishersCollection.insertOne(publisher)
      res.send(result)
    })

    app.get("/publishers",async(req, res)=>{
      const result = await publishersCollection.find().toArray()
      res.send(result)
    })

    // Fetch user data by ID
   app.get("/users/:id", async (req, res) => {
   const id = req.params.id;
   const query = { _id: new ObjectId(id) };
    const user = await usersCollection.findOne(query);
    if (!user) {
    return res.status(404).send({ message: "User not found" });
   }
   res.send(user);
  });


    // Update user data by ID
app.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body; // Contains updated user data
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: updates,
  };
  const result = await usersCollection.updateOne(filter, updatedDoc);
  if (result.matchedCount === 0) {
    return res.status(404).send({ message: "User not found" });
  }
  res.send(result);
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); 
  }
}
run().catch(console.dir);



app.get("/", (req, res)=>{
    res.send("daily bd server running")
})

app.listen(port, ()=>{
   console.log(`daily bd server is running on port ${port}`);
})