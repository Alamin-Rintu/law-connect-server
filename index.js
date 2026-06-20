const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("law_connect");
    const lawyerCollection = db.collection("allLawyer");

    app.post("/lawyer", async (req, res) => {
      const newLawyer = req.body;
      const result = await lawyerCollection.insertOne(newLawyer);
      res.send(result);
    });

    app.get("/lawyer", async (req, res) => {
      const cursor = lawyerCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

run().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
