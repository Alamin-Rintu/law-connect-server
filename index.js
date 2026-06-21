const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const clientCollection = db.collection("allClient");

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

    app.delete("/lawyer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lawyerCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/lawyer/:id", async (req, res) => {
      const id = req.params.id;
      const updateLawyer = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateLawyer,
      };
      const result = await lawyerCollection.updateOne(query, update);
      res.send(result);
    });

    app.get("/lawyer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lawyerCollection.findOne(query);
      res.send(result);
    });

    app.post("/client", async (req, res) => {
      const client = req.body;
      const result = await clientCollection.insertOne(client);
      res.send(result);
    });

    // app.get("/client", async (req, res) => {
    //   const cursor = clientCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

  app.get("/client", async (req, res) => {
  const { lawyerId, userEmail } = req.query;

  let query = {};

  if (lawyerId) query.lawyerId = lawyerId;
  if (userEmail) query.userEmail = userEmail;

  const result = await clientCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

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
