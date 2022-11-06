const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.voxvdqi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {        
        const serviceCollection = client.db('geniusCarDb').collection('services');
        const ordersCollection = client.db('geniusCarDb').collection('orders')

        // async function verifyJWT(req, res, next) {
        //     const authHeader = req.headers.authorization;
        //     if (!authHeader) {
        //         return res.status(401).send({message: 'UnAuthorized Access'})
        //     }
        //     const token = authHeader.split(' ')[1];
        //     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        //         if (err) {
        //            return res.status(401).send({message: 'UnAuthorized Access'})
        //         }
        //         req.decoded = decoded;
        //         next();
        //     })
        // }

        function verifyJWT(req, res, next) {
            // receive the request headers
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({message: "UnAuthorized Access"})
            }
            // split with '<whiteSpace>' & [1] for removing Bearer
            const token = authHeader.split(' ')[1];
            // jwt.verify() for decoding the token with secret key, it also takes a callback function with err and decoded parameter
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
                if (err) {
                    return res.status(401).send({ message: "UnAuthorized Access" });
                }
                // set the decoded data with req.decoded, for finding where the function(verifyJWT) is used
                req.decoded = decoded;
                // next used for passing the function and do as following
                next();
            })

        }
        // make an api for jwt authorization
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // make a jwt token with users data (email), secret and options 
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
            // send the token
            res.send({token})
        })

        app.get('/services', async(req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        })
        app.get('/services/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })

        // we use verifyJWT function for verifying our jwt token
        app.get('/orders', verifyJWT, async (req, res) => {
            // extract the decoded info 
            const decoded = req.decoded;
            // check if the info match or not
            if (decoded.email !== req.query.email) {
                res.status(403).send({message: "Forbidden"})
            }
            let query = {};
            if (req.query.email) {
                query = {email: req.query.email}
            }
            
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders)
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })

        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set:{
                    status: status
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {
        
    }

}
run().catch(err => {
    console.log(err);
})

app.get('/', (req, res) => {
    res.send("Genius car server running")
})

app.listen(port, () => {
    console.log(`Server Listening on ${port}`);
})