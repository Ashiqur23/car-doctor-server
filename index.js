const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const userName = process.env.DB_USER;
const password = process.env.DB_PASS;

const uri = `mongodb+srv://${userName}:${password}@cluster0.klmvqmu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJwt = (req, res, next) => {
  const authorization = req?.headers?.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unAuthorized User" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKET_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unAuthorized User" });
    }
    req.decoded = decoded;
    next();
  });
};
async function run() {
  const serviceCollection = client.db("carDoctorDb").collection("services");

  const bookingCollection = client.db("carDoctorDb").collection("bookings");

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKET_SECRET, {
        expiresIn: '1h',
      });
      // console.log({ token });
      res.send({ token });
    });

    // services
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const result = await serviceCollection.findOne(filter, options);
      res.send(result);
    });
    // post booking
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    //get booking
    app.get("/bookings", verifyJwt, async (req, res) => {
      const decoded = req.decoded;
      console.log(decoded);
      if (decoded?.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      // console.log(req.headers.authorization);
      let query = {};
      if (req?.query?.email) {
        query = { email: req?.query?.email };
      }
      // console.log(query);
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/bookings/:id", async (req, res) => {
      const id = req?.params?.id;
      const body = req?.body;
      const query = { _id: new ObjectId(id) };
      const updateData = {
        $set: {
          status: body?.status,
        },
      };
      const options = { upsert: true };

      const result = await bookingCollection.updateOne(
        query,
        updateData,
        options
      );
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("this server is running doctor");
});

app.listen(port);
