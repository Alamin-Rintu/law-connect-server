const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    // console.log("payload", payload);
    next();
  } catch (error) {
    return res.status(404).json({ message: "forbidden" });
  }
};

async function run() {
  try {
    await client.connect();
    const db = client.db("law_connect");
    const lawyerCollection = db.collection("allLawyer");
    const clientCollection = db.collection("allClient");
    const userCollection = db.collection("user");
    const hireLawyerCollection = db.collection("hireRequests");
    const payCollection = db.collection("pay");

    // lawyer api here
    app.post("/lawyer", async (req, res) => {
      const newLawyer = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await lawyerCollection.insertOne(newLawyer);
      res.send(result);
    });
    app.get("/lawyer", async (req, res) => {
      try {
        const search = req.query.search;
        const specialization = req.query.specialization;
        const sort = req.query.sort;

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {};

        if (search) {
          query.name = {
            $regex: search,
            $options: "i",
          };
        }

        if (specialization && specialization !== "all") {
          query.specialization = specialization;
        }

        let sortOptions = {};

        if (sort === "lowToHigh") {
          sortOptions.fee = 1;
        } else if (sort === "highToLow") {
          sortOptions.fee = -1;
        }

        // Total count for pagination
        const totalLawyers = await lawyerCollection.countDocuments(query);

        const lawyers = await lawyerCollection
          .find(query)
          .sort(sortOptions)
          .collation({ locale: "en", numericOrdering: true })
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          data: lawyers,
          pagination: {
            total: totalLawyers,
            page,
            limit,
            totalPages: Math.ceil(totalLawyers / limit),
          },
        });
      } catch (error) {
        // console.error("Error fetching lawyers:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/lawyer/latest", async (req, res) => {
      try {
        const result = await lawyerCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/lawyer/my-services", async (req, res) => {
      try {
        const { email } = req.query;

        const result = await lawyerCollection.find({ email }).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error" });
      }
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

    app.get("/lawyer/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lawyerCollection.findOne(query);
      res.send(result);
    });

    // client api here

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

    app.delete("/client/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await clientCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/client/:id", async (req, res) => {
      const id = req.params.id;
      const updateComment = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateComment,
      };
      const result = await clientCollection.updateOne(query, update);
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: { role },
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    app.post("/hireLawyer", async (req, res) => {
      const request = req.body;
      // check duplicate
      const existingRequest = await hireLawyerCollection.findOne({
        lawyerId: request.lawyerId,
        clientEmail: request.clientEmail,
      });
      if (existingRequest) {
        return res.status(400).send({
          message: "You already sent a request to this lawyer",
        });
      }
      const result = await hireLawyerCollection.insertOne(request);
      res.send(result);
    });

    app.get("/hireLawyer", async (req, res) => {
      try {
        const { lawyerEmail } = req.query;
        const query = {};
        if (lawyerEmail) {
          query.lawyerEmail = lawyerEmail;
        }
        const result = await hireLawyerCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.get("/hireLawyer/client", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).send({
            message: "Email is required",
          });
        }

        const result = await hireLawyerCollection
          .find({ clientEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Server error",
          error: error.message,
        });
      }
    });

    app.patch("/hireLawyer/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      const updateData = {
        status,
      };

      if (status.toLowerCase() === "accepted") {
        updateData.pay = "paynow";
      }

      if (status.toLowerCase() === "rejected") {
        updateData.pay = "unavailable";
      }

      const result = await hireLawyerCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateData,
        },
      );

      res.send(result);
    });

    app.patch("/hireLawyer/payment/:id", async (req, res) => {
      const { id } = req.params;

      const result = await hireLawyerCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            pay: "paid",
            paymentStatus: "completed",
            paidAt: new Date(),
          },
        },
      );

      res.send(result);
    });
    app.post("/payment", async (req, res) => {
      try {
        // console.log("Payment Body:", req.body);

        const {
          hireId,
          lawyerName,
          clientName,
          clientEmail,
          lawyerEmail,
          amount,
          stripeSessionId,
          paymentIntent,
        } = req.body;

        if (!hireId) {
          return res.status(400).send({
            success: false,
            message: "hireId is required",
          });
        }

        if (!stripeSessionId) {
          return res.status(400).send({
            success: false,
            message: "stripeSessionId is required",
          });
        }

        // Prevent duplicate payment records
        const existingPayment = await payCollection.findOne({
          stripeSessionId,
        });

        if (existingPayment) {
          return res.send({
            success: true,
            message: "Payment already recorded",
          });
        }

        // Update hire request
        const updateResult = await hireLawyerCollection.updateOne(
          {
            _id: new ObjectId(hireId),
          },
          {
            $set: {
              pay: "paid",
              paymentStatus: "completed",
              stripeSessionId,
              paymentIntent,
              paidAt: new Date(),
            },
          },
        );

        console.log("Update Result:", updateResult);

        // Save payment history
        const paymentResult = await payCollection.insertOne({
          hireId,
          lawyerName,
          clientName,
          clientEmail,
          lawyerEmail,
          amount,
          stripeSessionId,
          paymentIntent,
          paymentStatus: "completed",
          paidAt: new Date(),
          createdAt: new Date(),
        });

        res.send({
          success: true,
          updateResult,
          paymentResult,
        });
      } catch (error) {
        console.error("Payment Save Error:", error);

        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/payments", async (req, res) => {
      try {
        const result = await payCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
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
